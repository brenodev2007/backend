import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, cpf_cnpj } = req.body;

      const userRepository = AppDataSource.getRepository(User);

      // Check if user exists
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = userRepository.create({
        email,
        password: hashedPassword,
        name,
        cpf_cnpj
      });

      await userRepository.save(user);

      // Generate token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: '7d'
      });

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: 'Nenhum usuário encontrado com este e-mail' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: '7d'
      });

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_pro: user.is_pro,
          plan: user.plan
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  static async me(req: AuthRequest, res: Response) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: req.userId } });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        cpf_cnpj: user.cpf_cnpj,
        avatar_url: user.avatar_url,
        is_pro: user.is_pro,
        plan: user.plan,
        subscription_status: user.subscription_status
      });
    } catch (error) {
      console.error('Me error:', error);
      return res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, cpf_cnpj, avatar_url } = req.body;
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOne({ where: { id: req.userId } });
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Update only provided fields
      if (name !== undefined) user.name = name;
      if (cpf_cnpj !== undefined) user.cpf_cnpj = cpf_cnpj;
      if (avatar_url !== undefined) user.avatar_url = avatar_url;

      await userRepository.save(user);

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        cpf_cnpj: user.cpf_cnpj,
        avatar_url: user.avatar_url,
        is_pro: user.is_pro,
        plan: user.plan
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  }
}
