import { AppDataSource } from '../src/config/database';
import app from '../src/app';
import { Request, Response } from 'express';

export default async (req: Request, res: Response) => {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
      console.log('Database initialized for Vercel function');
    } catch (error) {
      console.error('Database initialization failed', error);
      return res.status(500).json({ error: 'Database connection failed', details: error });
    }
  }

  app(req, res);
};
