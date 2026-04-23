import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class NotificationController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const notificationRepo = AppDataSource.getRepository(Notification);
      const notifications = await notificationRepo.find({
        where: { user_id: req.userId },
        order: { created_at: 'DESC' },
        take: 50
      });

      return res.json(notifications);
    } catch (error) {
      console.error('List notifications error:', error);
      return res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  }

  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const notificationRepo = AppDataSource.getRepository(Notification);
      
      const notification = await notificationRepo.findOne({
        where: { id, user_id: req.userId }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }

      notification.read = true;
      await notificationRepo.save(notification);

      return res.json(notification);
    } catch (error) {
      console.error('Mark as read error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar notificação' });
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const notificationRepo = AppDataSource.getRepository(Notification);
      
      await notificationRepo.update(
        { user_id: req.userId, read: false },
        { read: true }
      );

      return res.status(204).send();
    } catch (error) {
      console.error('Mark all as read error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar notificações' });
    }
  }
}
