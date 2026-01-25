import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Warehouse } from '../entities/Warehouse.entity';
import { StockBalance } from '../entities/StockBalance.entity';
import { StockMovement } from '../entities/StockMovement.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class WarehouseController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const warehouseRepository = AppDataSource.getRepository(Warehouse);
      const warehouses = await warehouseRepository.find({
        where: { user_id: req.userId }
      });
      return res.json(warehouses);
    } catch (error) {
      console.error('Get warehouses error:', error);
      return res.status(500).json({ error: 'Erro ao buscar depósitos' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const warehouseRepository = AppDataSource.getRepository(Warehouse);
      const warehouse = warehouseRepository.create({
        ...req.body,
        user_id: req.userId
      });
      await warehouseRepository.save(warehouse);
      return res.status(201).json(warehouse);
    } catch (error) {
      console.error('Create warehouse error:', error);
      return res.status(500).json({ error: 'Erro ao criar depósito' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const warehouseRepository = AppDataSource.getRepository(Warehouse);
      
      const warehouse = await warehouseRepository.findOne({ 
        where: { id, user_id: req.userId } 
      });
      if (!warehouse) {
        return res.status(404).json({ error: 'Depósito não encontrado' });
      }

      warehouseRepository.merge(warehouse, req.body);
      await warehouseRepository.save(warehouse);
      
      return res.json(warehouse);
    } catch (error) {
      console.error('Update warehouse error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar depósito' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const warehouseRepository = AppDataSource.getRepository(Warehouse);
      const balanceRepository = AppDataSource.getRepository(StockBalance);
      const movementRepository = AppDataSource.getRepository(StockMovement);
      
      const warehouse = await warehouseRepository.findOne({
        where: { id, user_id: req.userId }
      });

      if (!warehouse) {
        return res.status(404).json({ error: 'Depósito não encontrado' });
      }

      // Delete dependencies
      await balanceRepository.delete({ warehouse_id: id });
      
      // Update movements to remove reference to this warehouse
      // Cast to any to bypass strict typing if null isn't explicitly allowed in type definition but is in DB
      await movementRepository.update({ warehouse_from_id: id }, { warehouse_from_id: null as any });
      await movementRepository.update({ warehouse_to_id: id }, { warehouse_to_id: null as any });

      await warehouseRepository.remove(warehouse);

      return res.status(204).send();
    } catch (error) {
      console.error('Delete warehouse error:', error);
      return res.status(500).json({ error: 'Erro ao deletar depósito' });
    }
  }
}
