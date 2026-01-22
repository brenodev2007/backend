import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { ShopeeOrder, ShopeeShipmentStatus } from '../entities/ShopeeOrder.entity';
import { ShopeeAccount } from '../entities/ShopeeAccount.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ShopeeController {
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);
      const accountRepository = AppDataSource.getRepository(ShopeeAccount);

      // Get user accounts
      const accounts = await accountRepository.find({
        where: { user_id: req.userId }
      });

      if (accounts.length === 0) {
        return res.json({
          total: 0,
          enviado: 0,
          entregue: 0,
          aguardandoEnvio: 0,
          emTransporte: 0,
          cancelado: 0,
          devolvido: 0
        });
      }

      const accountIds = accounts.map(a => a.id);

      const stats = await orderRepository
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(order.id)', 'count')
        .where('order.account_id IN (:...accountIds)', { accountIds })
        .groupBy('order.status')
        .getRawMany();

      const result = {
        total: 0,
        enviado: 0,
        entregue: 0,
        aguardandoEnvio: 0,
        emTransporte: 0,
        cancelado: 0,
        devolvido: 0
      };

      stats.forEach((s: any) => {
        const count = parseInt(s.count);
        result.total += count;
        
        switch (s.status) {
          case ShopeeShipmentStatus.ENVIADO:
            result.enviado = count;
            break;
          case ShopeeShipmentStatus.ENTREGUE:
            result.entregue = count;
            break;
          case ShopeeShipmentStatus.AGUARDANDO_ENVIO:
            result.aguardandoEnvio = count;
            break;
          case ShopeeShipmentStatus.EM_TRANSPORTE:
            result.emTransporte = count;
            break;
          case ShopeeShipmentStatus.CANCELADO:
            result.cancelado = count;
            break;
            case ShopeeShipmentStatus.DEVOLVIDO:
            result.devolvido = count;
            // result.cancelado += count; // Optional grouping
            break;
        }
      });
      
      // Also sum cancelled + returned for total "cancelled" metric if desired by frontend logic
      // For now keeping them compliant with interface unless frontend specifically asks differently.
      // Frontend sums cancelado + devolvido manually? No, it uses 'cancelado' from stats.
      // Let's add devolvido to cancelado count for simpler frontend consumption if that's what created logic implied.
      result.cancelado += result.devolvido;

      return res.json(result);
    } catch (error) {
      console.error('Get shopee stats error:', error);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas da Shopee' });
    }
  }

  static async getOrders(req: AuthRequest, res: Response) {
    try {
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);
      const accountRepository = AppDataSource.getRepository(ShopeeAccount);
      const { startDate, endDate } = req.query;

      // Get user accounts
      const accounts = await accountRepository.find({
        where: { user_id: req.userId }
      });

      if (accounts.length === 0) {
        return res.json([]);
      }

      const accountIds = accounts.map(a => a.id);

      const queryBuilder = orderRepository.createQueryBuilder('order')
         .where('order.account_id IN (:...accountIds)', { accountIds });
      
      
      if (startDate) {
        queryBuilder.andWhere('order.purchase_date >= :startDate', { startDate: new Date(String(startDate)).toISOString() });
      }

      if (endDate) {
        // Ensure we cover the whole end day if filtering by date only, but assuming ISO string passing
        queryBuilder.andWhere('order.purchase_date <= :endDate', { endDate: new Date(String(endDate)).toISOString() });
      }

      const orders = await queryBuilder
        .orderBy('order.purchase_date', 'DESC')
        .getMany();

      return res.json(orders);
    } catch (error) {
      console.error('Get shopee orders error:', error);
      return res.status(500).json({ error: 'Erro ao buscar pedidos da Shopee' });
    }
  }
}
