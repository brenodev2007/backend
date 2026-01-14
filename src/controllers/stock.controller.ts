import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { StockBalance } from '../entities/StockBalance.entity';
import { StockMovement } from '../entities/StockMovement.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class StockController {
  static async getBalances(req: AuthRequest, res: Response) {
    try {
      const balanceRepository = AppDataSource.getRepository(StockBalance);
      const balances = await balanceRepository.find({
        relations: ['product', 'warehouse']
      });
      return res.json(balances);
    } catch (error) {
      console.error('Get balances error:', error);
      return res.status(500).json({ error: 'Erro ao buscar saldos' });
    }
  }

  static async getMovements(req: AuthRequest, res: Response) {
    try {
      const movementRepository = AppDataSource.getRepository(StockMovement);
      const movements = await movementRepository.find({
        where: { user_id: req.userId },
        relations: ['product', 'user'],
        order: { created_at: 'DESC' }
      });
      return res.json(movements);
    } catch (error) {
      console.error('Get movements error:', error);
      return res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
  }

  static async createMovement(req: AuthRequest, res: Response) {
    try {
      const movementRepository = AppDataSource.getRepository(StockMovement);
      const balanceRepository = AppDataSource.getRepository(StockBalance);

      const movement = movementRepository.create({
        ...req.body,
        user_id: req.userId
      });

      await movementRepository.save(movement);

      // Update stock balance
      const { product_id, warehouse_to_id, warehouse_from_id, quantity, type } = req.body;

      if (type === 'IN' && warehouse_to_id) {
        const balance = await balanceRepository.findOne({
          where: { product_id, warehouse_id: warehouse_to_id }
        });

        if (balance) {
          balance.quantity += quantity;
          await balanceRepository.save(balance);
        } else {
          await balanceRepository.save({
            product_id,
            warehouse_id: warehouse_to_id,
            quantity
          });
        }
      }

      if (type === 'OUT' && warehouse_from_id) {
        const balance = await balanceRepository.findOne({
          where: { product_id, warehouse_id: warehouse_from_id }
        });

        if (balance) {
          balance.quantity -= quantity;
          await balanceRepository.save(balance);
        }
      }

      return res.status(201).json(movement);
    } catch (error) {
      console.error('Create movement error:', error);
      return res.status(500).json({ error: 'Erro ao criar movimentação' });
    }
  }
}
