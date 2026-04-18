import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { bullmqPrefix, isAsyncImageGenerationEnabled } from '../config/generationConfig.js';
import { executeCustomerImageGeneration } from '../services/customerGenerationService.js';
import { updateGenerationJob } from '../services/generationJobService.js';
import { emitGenerationCompleted, emitGenerationFailed } from '../realtime/generationEvents.js';

const QUEUE_NAME = 'image-generation';

/** @type {import('bullmq').Queue | undefined} */
let queue;
/** @type {import('bullmq').Worker | undefined} */
let worker;
/** @type {import('ioredis').default | undefined} */
let queueConnection;
/** @type {import('ioredis').default | undefined} */
let workerConnection;

function createRedis() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error('REDIS_URL is required for the image generation queue');
  return new Redis(url, { maxRetriesPerRequest: null });
}

export function getImageGenerationQueue() {
  if (!isAsyncImageGenerationEnabled()) return null;
  if (!queue) {
    queueConnection = createRedis();
    queue = new Queue(QUEUE_NAME, {
      connection: queueConnection,
      prefix: bullmqPrefix(),
    });
  }
  return queue;
}

/**
 * @param {{ jobId: string, userId: string, body: object }} params
 */
export async function enqueueImageGeneration({ jobId, userId, body }) {
  const q = getImageGenerationQueue();
  if (!q) throw new Error('Async image generation is not enabled');
  await q.add(
    'generate',
    { jobId, userId, body },
    {
      jobId,
      removeOnComplete: 500,
      removeOnFail: 1000,
    }
  );
}

export function startImageGenerationWorker() {
  if (!isAsyncImageGenerationEnabled()) return null;
  if (worker) return worker;

  workerConnection = createRedis();
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { jobId, userId, body } = job.data;
      await updateGenerationJob(jobId, { status: 'processing' });

      try {
        const asset = await executeCustomerImageGeneration(userId, body);
        await updateGenerationJob(jobId, {
          status: 'completed',
          asset_id: asset.id,
          error_message: null,
        });
        emitGenerationCompleted(userId, jobId, asset);
        return asset;
      } catch (err) {
        const message = err?.message || 'Generation failed';
        await updateGenerationJob(jobId, {
          status: 'failed',
          error_message: message,
        });
        emitGenerationFailed(userId, jobId, message);
        throw err;
      }
    },
    {
      connection: workerConnection,
      prefix: bullmqPrefix(),
      concurrency: Math.max(1, Number(process.env.IMAGE_GENERATION_CONCURRENCY || 4)),
    }
  );

  worker.on('error', (err) => {
    console.error('[image-generation worker]', err);
  });

  return worker;
}

export async function shutdownImageGenerationQueue() {
  await worker?.close();
  await queue?.close();
  if (workerConnection) {
    await workerConnection.quit();
    workerConnection = undefined;
  }
  if (queueConnection) {
    await queueConnection.quit();
    queueConnection = undefined;
  }
  worker = undefined;
  queue = undefined;
}
