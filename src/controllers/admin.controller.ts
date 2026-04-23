import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AdminController {
  static async listUsers(req: AuthRequest, res: Response) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      
      const users = await userRepository.find({
        select: ['id', 'name', 'email', 'cpf_cnpj', 'is_active', 'role', 'created_at'],
        order: { created_at: 'DESC' }
      });
      
      return res.json(users);
    } catch (error) {
      console.error('List users error:', error);
      return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  static async toggleUserStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'Status is_active deve ser booleano' });
      }

      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOne({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Previne que o admin desative a si próprio por acidente
      if (user.id === req.userId && !is_active) {
         return res.status(400).json({ error: 'Você não pode desativar seu próprio usuário administrador' });
      }

      user.is_active = is_active;
      await userRepository.save(user);
      
      return res.json({ 
        message: `Usuário ${is_active ? 'ativado' : 'desativado'} com sucesso`,
        user: {
          id: user.id,
          is_active: user.is_active
        }
      });
    } catch (error) {
      console.error('Toggle user status error:', error);
      return res.status(500).json({ error: 'Erro ao alterar status do usuário' });
    }
  }
}
