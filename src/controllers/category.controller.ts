import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Category } from '../entities/Category.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class CategoryController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const categoryRepository = AppDataSource.getRepository(Category);
      const categories = await categoryRepository.find({
        order: { name: 'ASC' }
      });
      return res.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      return res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const categoryRepository = AppDataSource.getRepository(Category);
      const category = categoryRepository.create(req.body);
      await categoryRepository.save(category);
      return res.status(201).json(category);
    } catch (error) {
      console.error('Create category error:', error);
      return res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const categoryRepository = AppDataSource.getRepository(Category);
      
      const category = await categoryRepository.findOne({ where: { id } });
      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      categoryRepository.merge(category, req.body);
      await categoryRepository.save(category);
      
      return res.json(category);
    } catch (error) {
      console.error('Update category error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const categoryRepository = AppDataSource.getRepository(Category);
      
      const result = await categoryRepository.delete(id);
      if (result.affected === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Delete category error:', error);
      return res.status(500).json({ error: 'Erro ao deletar categoria' });
    }
  }
}
