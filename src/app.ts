import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import warehouseRoutes from './routes/warehouse.routes';
import stockRoutes from './routes/stock.routes';
import financeRoutes from './routes/finance.routes';
import subscriptionRoutes, { webhookRouter } from './routes/subscription.routes';
import categoryRoutes from './routes/category.routes';
import paymentRoutes from './routes/payment.routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Webhook route (antes das outras para não precisar de autenticação)
app.use('/api/subscription', webhookRouter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    message: 'Erro interno',
    error: err.message,
  });
});

export default app;
