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

  static async createOrder(req: AuthRequest, res: Response) {
    try {
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);
      const order = orderRepository.create({
        ...req.body,
        purchase_date: new Date(req.body.purchase_date),
        estimated_delivery: req.body.estimated_delivery ? new Date(req.body.estimated_delivery) : undefined,
      });

      await orderRepository.save(order);
      return res.status(201).json(order);
    } catch (error) {
      console.error('Create shopee order error:', error);
      return res.status(500).json({ error: 'Erro ao criar pedido da Shopee' });
    }
  }

  static async updateOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);
      
      const order = await orderRepository.findOne({ where: { id } });
      if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

      orderRepository.merge(order, req.body);
      
      if (req.body.purchase_date) order.purchase_date = new Date(req.body.purchase_date);
      if (req.body.estimated_delivery) order.estimated_delivery = new Date(req.body.estimated_delivery);
      if (req.body.actual_delivery) order.actual_delivery = new Date(req.body.actual_delivery);

      await orderRepository.save(order);
      return res.json(order);
    } catch (error) {
      console.error('Update shopee order error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar pedido da Shopee' });
    }
  }

  static async deleteOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);
      await orderRepository.delete(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Delete shopee order error:', error);
      return res.status(500).json({ error: 'Erro ao excluir pedido da Shopee' });
    }
  }

  static async deleteMultipleOrders(req: AuthRequest, res: Response) {
    try {
      const { ids } = req.body;
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);
      await orderRepository.delete(ids);
      return res.status(204).send();
    } catch (error) {
      console.error('Delete multiple shopee orders error:', error);
      return res.status(500).json({ error: 'Erro ao excluir múltiplos pedidos da Shopee' });
    }
  }

  static async getAccounts(req: AuthRequest, res: Response) {
    try {
      const accountRepository = AppDataSource.getRepository(ShopeeAccount);
      const accounts = await accountRepository.find({
        where: { user_id: req.userId },
        order: { created_at: 'DESC' }
      });
      return res.json(accounts);
    } catch (error) {
      console.error('Get shopee accounts error:', error);
      return res.status(500).json({ error: 'Erro ao buscar contas da Shopee' });
    }
  }

  static async createAccount(req: AuthRequest, res: Response) {
    try {
      const accountRepository = AppDataSource.getRepository(ShopeeAccount);
      const account = accountRepository.create({
        ...req.body,
        user_id: req.userId
      });
      await accountRepository.save(account);
      return res.status(201).json(account);
    } catch (error) {
      console.error('Create shopee account error:', error);
      return res.status(500).json({ error: 'Erro ao criar conta da Shopee' });
    }
  }

  static async setActiveAccount(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const accountRepository = AppDataSource.getRepository(ShopeeAccount);

      // Deactivate all first
      await accountRepository.update({ user_id: req.userId }, { is_active: false });
      // Activate selected
      await accountRepository.update({ id, user_id: req.userId }, { is_active: true });

      return res.status(204).send();
    } catch (error) {
      console.error('Set active shopee account error:', error);
      return res.status(500).json({ error: 'Erro ao definir conta ativa' });
    }
  }

  static async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const accountRepository = AppDataSource.getRepository(ShopeeAccount);
      await accountRepository.delete({ id, user_id: req.userId });
      return res.status(204).send();
    } catch (error) {
      console.error('Delete shopee account error:', error);
      return res.status(500).json({ error: 'Erro ao excluir conta da Shopee' });
    }
  }
}
