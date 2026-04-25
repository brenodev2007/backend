import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import warehouseRoutes from './routes/warehouse.routes';
import stockRoutes from './routes/stock.routes';

import categoryRoutes from './routes/category.routes';
import shopeeRoutes from './routes/shopee.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (como Apps Mobile ou Curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000'
    ].filter(Boolean);

    // Se o origin estiver na lista ou for localhost em desenvolvimento
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      console.log('🚫 Bloqueado por CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/shopee', shopeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  });

export default app;

