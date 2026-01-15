import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { StockBalance } from '../entities/StockBalance.entity';
import { StockMovement } from '../entities/StockMovement.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class StockController {
  static async getBalances(req: AuthRequest, res: Response) {
    try {
      const balanceRepository = AppDataSource.getRepository(StockBalance);
      
      // Filter balances by user through product and warehouse relations
      const balances = await balanceRepository
        .createQueryBuilder('balance')
        .leftJoinAndSelect('balance.product', 'product')
        .leftJoinAndSelect('balance.warehouse', 'warehouse')
        .where('product.user_id = :userId', { userId: req.userId })
        .andWhere('warehouse.user_id = :userId', { userId: req.userId })
        .getMany();
      
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
        relations: ['product', 'user', 'warehouse_from', 'warehouse_to'],
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

  static async updateMovement(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const movementRepository = AppDataSource.getRepository(StockMovement);
      const balanceRepository = AppDataSource.getRepository(StockBalance);

      // Find the existing movement
      const existingMovement = await movementRepository.findOne({
        where: { id, user_id: req.userId }
      });

      if (!existingMovement) {
        return res.status(404).json({ error: 'Movimentação não encontrada' });
      }

      // Revert the old movement's stock impact
      await this.revertStockBalance(existingMovement, balanceRepository);

      // Update the movement
      Object.assign(existingMovement, req.body);
      await movementRepository.save(existingMovement);

      // Apply new stock balance
      await this.applyStockBalance(existingMovement, balanceRepository);

      return res.json(existingMovement);
    } catch (error) {
      console.error('Update movement error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar movimentação' });
    }
  }

  static async deleteMovement(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const movementRepository = AppDataSource.getRepository(StockMovement);
      const balanceRepository = AppDataSource.getRepository(StockBalance);

      // Find the movement
      const movement = await movementRepository.findOne({
        where: { id, user_id: req.userId }
      });

      if (!movement) {
        return res.status(404).json({ error: 'Movimentação não encontrada' });
      }

      // Revert stock balance
      await this.revertStockBalance(movement, balanceRepository);

      // Delete the movement
      await movementRepository.remove(movement);

      return res.status(204).send();
    } catch (error) {
      console.error('Delete movement error:', error);
      return res.status(500).json({ error: 'Erro ao deletar movimentação' });
    }
  }

  private static async applyStockBalance(movement: StockMovement, balanceRepository: any) {
    const { product_id, warehouse_to_id, warehouse_from_id, quantity, type } = movement;

    if (type === 'IN' && warehouse_to_id) {
      await this.updateBalance(balanceRepository, product_id, warehouse_to_id, quantity);
    } else if (type === 'OUT' && warehouse_from_id) {
      await this.updateBalance(balanceRepository, product_id, warehouse_from_id, -quantity);
    } else if (type === 'TRANSFER' && warehouse_from_id && warehouse_to_id) {
      await this.updateBalance(balanceRepository, product_id, warehouse_from_id, -quantity);
      await this.updateBalance(balanceRepository, product_id, warehouse_to_id, quantity);
    }
  }

  private static async revertStockBalance(movement: StockMovement, balanceRepository: any) {
    const { product_id, warehouse_to_id, warehouse_from_id, quantity, type } = movement;

    if (type === 'IN' && warehouse_to_id) {
      await this.updateBalance(balanceRepository, product_id, warehouse_to_id, -quantity);
    } else if (type === 'OUT' && warehouse_from_id) {
      await this.updateBalance(balanceRepository, product_id, warehouse_from_id, quantity);
    } else if (type === 'TRANSFER' && warehouse_from_id && warehouse_to_id) {
      await this.updateBalance(balanceRepository, product_id, warehouse_from_id, quantity);
      await this.updateBalance(balanceRepository, product_id, warehouse_to_id, -quantity);
    }
  }

  private static async updateBalance(balanceRepository: any, product_id: string, warehouse_id: string, quantityChange: number) {
    const balance = await balanceRepository.findOne({
      where: { product_id, warehouse_id }
    });

    if (balance) {
      balance.quantity += quantityChange;
      if (balance.quantity < 0) balance.quantity = 0;
      await balanceRepository.save(balance);
    } else if (quantityChange > 0) {
      await balanceRepository.save({
        product_id,
        warehouse_id,
        quantity: quantityChange
      });
    }
  }
}
