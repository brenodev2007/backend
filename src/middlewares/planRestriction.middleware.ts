import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { Product } from '../entities/Product.entity';
import { Warehouse } from '../entities/Warehouse.entity';

// Limites de planos
const PLAN_LIMITS = {
  basic: {
    max_products: 50,
    max_warehouses: 2,
    advanced_reports: false,
    priority_support: false
  },
  pro: {
    max_products: Infinity,
    max_warehouses: Infinity,
    advanced_reports: true,
    priority_support: true
  }
};

/**
 * Middleware que requer plano Pro
 */
export const requirePro = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (!user.is_pro || !['active', 'trial'].includes(user.subscription_status || '')) {
      return res.status(403).json({ 
        error: 'Recurso exclusivo para assinantes Pro',
        upgrade_required: true,
        message: 'Faça upgrade para o plano Pro para acessar este recurso'
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware requirePro:', error);
    return res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};

/**
 * Middleware para verificar limite de produtos
 */
export const checkProductLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const productRepository = AppDataSource.getRepository(Product);

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Usuários Pro não têm limite
    if (user.is_pro && ['active', 'trial'].includes(user.subscription_status || '')) {
      return next();
    }

    // Verifica limite para usuários Basic
    const productCount = await productRepository.count({ where: { user_id: userId } });
    const limit = PLAN_LIMITS.basic.max_products;

    if (productCount >= limit) {
      return res.status(403).json({ 
        error: `Limite de ${limit} produtos atingido`,
        upgrade_required: true,
        message: `Você atingiu o limite de ${limit} produtos do plano gratuito. Faça upgrade para o plano Pro para produtos ilimitados.`,
        current_count: productCount,
        limit: limit
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware checkProductLimit:', error);
    return res.status(500).json({ error: 'Erro ao verificar limite de produtos' });
  }
};

/**
 * Middleware para verificar limite de armazéns
 */
export const checkWarehouseLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const warehouseRepository = AppDataSource.getRepository(Warehouse);

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Usuários Pro não têm limite
    if (user.is_pro && ['active', 'trial'].includes(user.subscription_status || '')) {
      return next();
    }

    // Verifica limite para usuários Basic
    const warehouseCount = await warehouseRepository.count({ where: { user_id: userId } });
    const limit = PLAN_LIMITS.basic.max_warehouses;

    if (warehouseCount >= limit) {
      return res.status(403).json({ 
        error: `Limite de ${limit} armazéns atingido`,
        upgrade_required: true,
        message: `Você atingiu o limite de ${limit} armazéns do plano gratuito. Faça upgrade para o plano Pro para armazéns ilimitados.`,
        current_count: warehouseCount,
        limit: limit
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware checkWarehouseLimit:', error);
    return res.status(500).json({ error: 'Erro ao verificar limite de armazéns' });
  }
};

/**
 * Retorna informações sobre limites do plano do usuário
 */
export const getPlanLimits = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const productRepository = AppDataSource.getRepository(Product);
    const warehouseRepository = AppDataSource.getRepository(Warehouse);

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const isPro = user.is_pro && ['active', 'trial'].includes(user.subscription_status || '');
    const plan = isPro ? 'pro' : 'basic';
    const limits = PLAN_LIMITS[plan];

    // Conta recursos atuais
    const productCount = await productRepository.count({ where: { user_id: userId } });
    const warehouseCount = await warehouseRepository.count({ where: { user_id: userId } });

    return res.json({
      plan,
      is_pro: isPro,
      limits: {
        products: {
          current: productCount,
          max: limits.max_products === Infinity ? -1 : limits.max_products,
          unlimited: limits.max_products === Infinity
        },
        warehouses: {
          current: warehouseCount,
          max: limits.max_warehouses === Infinity ? -1 : limits.max_warehouses,
          unlimited: limits.max_warehouses === Infinity
        },
        features: {
          advanced_reports: limits.advanced_reports,
          priority_support: limits.priority_support
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar limites do plano:', error);
    return res.status(500).json({ error: 'Erro ao buscar limites' });
  }
};
