import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { corsOptions } from './config/corsOrigins.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import promptRoutes from './routes/promptRoutes.js';
import campaignAdminRoutes from './routes/campaignAdminRoutes.js';
import campaignOptionsAdminRoutes from './routes/campaignOptionsAdminRoutes.js';
import promptBuildingBlockAdminRoutes from './routes/promptBuildingBlockAdminRoutes.js';
import imageGenerationAdminRoutes from './routes/imageGenerationAdminRoutes.js';
import customerApiRoutes from './routes/customerApiRoutes.js';
import storageRoutes from './routes/storageRoutes.js';
import { swaggerSpec, swaggerOptions } from './config/swagger.js';

const app = express();

// OpenAPI spec as JSON for programmatic reference (client SDK generation, etc.)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/campaigns', campaignAdminRoutes);
app.use('/admin/campaign-options', campaignOptionsAdminRoutes);
app.use('/admin/prompt-blocks', promptBuildingBlockAdminRoutes);
app.use('/admin/image-generation', imageGenerationAdminRoutes);
app.use('/customers', customerRoutes);
app.use('/prompts', promptRoutes);
app.use('/api/customer', customerApiRoutes);
app.use('/storage', storageRoutes);

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

export default app;
