import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { ShopeeOrder, ShopeeShipmentStatus } from '../entities/ShopeeOrder.entity';
import { ShopeeAccount } from '../entities/ShopeeAccount.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ShopeeController {
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);

      const stats = await orderRepository
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(order.id)', 'count')
        .where('order.user_id = :userId', { userId: req.userId })
        .groupBy('order.status')
        .getRawMany();

      const result = {
        total: 0,
        enviado: 0,
        entregue: 0,
        aguardandoEnvio: 0,
        empacotado: 0,
        etiquetado: 0,
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
          case ShopeeShipmentStatus.EMPACOTADO:
            result.empacotado = count;
            break;
          case ShopeeShipmentStatus.ETIQUETADO:
            result.etiquetado = count;
            break;
          case ShopeeShipmentStatus.EM_TRANSPORTE:
            result.emTransporte = count;
            break;
          case ShopeeShipmentStatus.CANCELADO:
            result.cancelado = count;
            break;
          case ShopeeShipmentStatus.DEVOLVIDO:
            result.devolvido = count;
            break;
        }
      });
      
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
      const { startDate, endDate, status, carrier, search } = req.query;

      const queryBuilder = orderRepository.createQueryBuilder('order')
         .where('order.user_id = :userId', { userId: req.userId });
      
      if (status) {
        queryBuilder.andWhere('order.status = :status', { status: String(status) });
      }

      if (carrier) {
        queryBuilder.andWhere('order.carrier = :carrier', { carrier: String(carrier) });
      }

      if (search) {
        const searchTerm = `%${String(search)}%`;
        queryBuilder.andWhere(
          '(order.order_sn LIKE :search OR order.product_name LIKE :search OR order.sku LIKE :search OR order.tracking_code LIKE :search OR order.customer_name LIKE :search)',
          { search: searchTerm }
        );
      }

      if (startDate) {
        queryBuilder.andWhere('order.purchase_date >= :startDate', { startDate: new Date(String(startDate)).toISOString() });
      }

      if (endDate) {
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

  static async getOrderById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);
      
      const order = await orderRepository.findOne({
        where: { id, user_id: req.userId }
      });

      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      return res.json(order);
    } catch (error) {
      console.error('Get shopee order by id error:', error);
      return res.status(500).json({ error: 'Erro ao buscar pedido da Shopee' });
    }
  }

  static async createOrder(req: AuthRequest, res: Response) {
    try {
      const orderRepository = AppDataSource.getRepository(ShopeeOrder);
      const accountRepository = AppDataSource.getRepository(ShopeeAccount);

      // Extract the data from request body
      const { items, ...orderData } = req.body;

      // If items array is provided, use the first item's data for the flat fields
      let productName = orderData.product_name || '';
      let sku = orderData.sku || '';
      
      if (items && Array.isArray(items) && items.length > 0) {
        // Combine all item names if multiple items
        productName = items.map((item: any) => item.product_name).filter(Boolean).join(', ');
        sku = items.map((item: any) => item.sku).filter(Boolean).join(', ');
      }

      // If no account_id provided, try to find the user's active account
      let accountId = orderData.account_id;
      if (!accountId && req.userId) {
        const activeAccount = await accountRepository.findOne({
          where: { user_id: req.userId, is_active: true }
        });
        if (activeAccount) {
          accountId = activeAccount.id;
        } else {
          // Fallback: get any account from the user
          const anyAccount = await accountRepository.findOne({
            where: { user_id: req.userId }
          });
          if (anyAccount) {
            accountId = anyAccount.id;
          }
        }
      }

      const order = orderRepository.create({
        order_sn: orderData.order_sn,
        product_name: productName,
        sku: sku || null,
        customer_name: orderData.customer_name || null,
        customer_phone: orderData.customer_phone || null,
        shipping_address: orderData.shipping_address || null,
        carrier: orderData.carrier || null,
        tracking_code: orderData.tracking_code || null,
        tracking_url: orderData.tracking_url || null,
        order_total: orderData.order_total || null,
        status: orderData.status || ShopeeShipmentStatus.AGUARDANDO_ENVIO,
        account_id: accountId || null,
        user_id: req.userId,
        purchase_date: new Date(orderData.purchase_date),
        estimated_delivery: orderData.estimated_delivery ? new Date(orderData.estimated_delivery) : undefined,
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

      // Strip non-entity fields from the body
      const { items, previousValues, ...updateData } = req.body;

      // If items array is provided, extract product_name and sku
      if (items && Array.isArray(items) && items.length > 0) {
        updateData.product_name = items.map((item: any) => item.product_name).filter(Boolean).join(', ');
        updateData.sku = items.map((item: any) => item.sku).filter(Boolean).join(', ') || null;
      }

      orderRepository.merge(order, updateData);
      
      if (updateData.purchase_date) order.purchase_date = new Date(updateData.purchase_date);
      if (updateData.estimated_delivery) order.estimated_delivery = new Date(updateData.estimated_delivery);
      if (updateData.actual_delivery) order.actual_delivery = new Date(updateData.actual_delivery);

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
