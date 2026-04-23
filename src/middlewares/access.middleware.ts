import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';

export const requireActive = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });

    const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    if (!user.is_active) {
      return res.status(403).json({ error: 'Sua conta está inativa. Contate o administrador.' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar status' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });

    const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar permissão' });
  }
};
