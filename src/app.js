import express from 'express';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { swaggerSpec, swaggerOptions } from './config/swagger.js';

const app = express();

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

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
