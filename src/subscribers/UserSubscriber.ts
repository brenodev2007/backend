import { EntitySubscriberInterface, EventSubscriber, UpdateEvent } from 'typeorm';
import { User } from '../entities/User.entity';
import { Notification } from '../entities/Notification.entity';
import axios from 'axios';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  /**
   * Indica que este subscriber escuta a entidade User.
   */
  listenTo() {
    return User;
  }

  /**
   * Chamado após a atualização de um usuário.
   */
  async afterUpdate(event: UpdateEvent<User>) {
    // Verificamos se o is_active mudou de false para true
    
    if (event.databaseEntity && event.entity) {
      const wasActive = event.databaseEntity.is_active;
      const isActive = event.entity.is_active;

      if (!wasActive && isActive) {
        // 1. Criar Notificação Interna no Banco
        try {
          const notificationRepo = event.manager.getRepository(Notification);
          const notification = notificationRepo.create({
            user_id: event.entity.id,
            title: 'Conta Ativada!',
            message: 'Sua conta foi ativada com sucesso. Agora você tem acesso total ao sistema Estoka!',
            type: 'success'
          });
          await notificationRepo.save(notification);
          console.log(`🔔 Notificação interna criada para ${event.entity.email}`);
        } catch (notifError) {
          console.error('❌ Erro ao criar notificação interna:', notifError);
        }

        // 2. Disparar Webhook Externo (opcional, se houver URL)
        if (process.env.WEBHOOK_URL) {
          try {
            await axios.post(process.env.WEBHOOK_URL, {
              event: 'user.activated',
              user: {
                id: event.entity.id,
                name: event.entity.name,
                email: event.entity.email
              },
              message: `O usuário ${event.entity.name} (${event.entity.email}) foi ativado automaticamente pelo sistema.`,
              timestamp: new Date().toISOString()
            });
            console.log(`📡 [Subscriber] Webhook de ativação enviado para ${event.entity.email}`);
          } catch (webhookError) {
            console.error('❌ [Subscriber] Erro ao enviar webhook:', webhookError);
          }
        }
      }
    }
  }
}
