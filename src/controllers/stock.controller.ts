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
      const { startDate, endDate } = req.query;

      const where: any = { user_id: req.userId };

      if (startDate || endDate) {
        const start = startDate ? new Date(String(startDate)) : new Date(0); // Beginning of time if no start
        const end = endDate ? new Date(String(endDate)) : new Date(); // Now if no end
        
        // Ensure end includes the full day if it's just a date string, or matches exact timestamp
        // If passing YYYY-MM-DD, we probably want end of that day. 
        // But let's assume the frontend sends ISO strings or proper dates.
        
        // Using Between from typeorm would require importing it. 
        // Let's use CreateQueryBuilder for flexibility without extra imports if possible, 
        // OR just simple "Between" if I add the import.
        // Actually, let's stick to query builder to avoid import issues if 'typeorm' isn't direct dependency here (though it likely is).
        // On second thought, simply adding 'FindOperator' logic is cleaner.
        // Let's assume I can add the import.
      }

      const queryBuilder = movementRepository.createQueryBuilder('movement')
        .leftJoinAndSelect('movement.product', 'product')
        .leftJoinAndSelect('movement.user', 'user')
        .leftJoinAndSelect('movement.warehouse_from', 'warehouse_from')
        .leftJoinAndSelect('movement.warehouse_to', 'warehouse_to')
        .where('movement.user_id = :userId', { userId: req.userId });

      if (startDate) {
        queryBuilder.andWhere('movement.created_at >= :startDate', { startDate: new Date(String(startDate)).toISOString() });
      }
      
      if (endDate) {
        queryBuilder.andWhere('movement.created_at <= :endDate', { endDate: new Date(String(endDate)).toISOString() });
      }

      const movements = await queryBuilder
        .orderBy('movement.created_at', 'DESC')
        .getMany();

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

      if ((type === 'IN' || type === 'ADJUST') && warehouse_to_id) {
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
          if (balance.quantity < 0) balance.quantity = 0; // Prevent negative stock
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
      await StockController.revertStockBalance(existingMovement, balanceRepository);

      // Update the movement
      Object.assign(existingMovement, req.body);
      await movementRepository.save(existingMovement);

      // Apply new stock balance
      await StockController.applyStockBalance(existingMovement, balanceRepository);

      return res.json(existingMovement);
    } catch (error: any) {
      console.error('Update movement error:', error);
      return res.status(500).json({ 
        error: 'Erro ao atualizar movimentação',
        details: error.message,
        stack: error.stack 
      });
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
      await StockController.revertStockBalance(movement, balanceRepository);

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

    if ((type === 'IN' || type === 'ADJUST') && warehouse_to_id) {
      await StockController.updateBalance(balanceRepository, product_id, warehouse_to_id, quantity);
    } else if (type === 'OUT' && warehouse_from_id) {
      await StockController.updateBalance(balanceRepository, product_id, warehouse_from_id, -quantity);
    } else if (type === 'TRANSFER' && warehouse_from_id && warehouse_to_id) {
      await StockController.updateBalance(balanceRepository, product_id, warehouse_from_id, -quantity);
      await StockController.updateBalance(balanceRepository, product_id, warehouse_to_id, quantity);
    }
  }

  private static async revertStockBalance(movement: StockMovement, balanceRepository: any) {
    const { product_id, warehouse_to_id, warehouse_from_id, quantity, type } = movement;

    if ((type === 'IN' || type === 'ADJUST') && warehouse_to_id) {
      await StockController.updateBalance(balanceRepository, product_id, warehouse_to_id, -quantity);
    } else if (type === 'OUT' && warehouse_from_id) {
      await StockController.updateBalance(balanceRepository, product_id, warehouse_from_id, quantity);
    } else if (type === 'TRANSFER' && warehouse_from_id && warehouse_to_id) {
      await StockController.updateBalance(balanceRepository, product_id, warehouse_from_id, quantity);
      await StockController.updateBalance(balanceRepository, product_id, warehouse_to_id, -quantity);
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
