import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ProductController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const productRepository = AppDataSource.getRepository(Product);
      const products = await productRepository.find({
        where: { user_id: req.userId },
        relations: ['category']
      });
      return res.json(products);
    } catch (error) {
      console.error('Get products error:', error);
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const productRepository = AppDataSource.getRepository(Product);
      
      const product = productRepository.create({
        ...req.body,
        user_id: req.userId
      });

      await productRepository.save(product);
      return res.status(201).json(product);
    } catch (error: any) {
      console.error('Create product error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'SKU já cadastrado' });
      }
      return res.status(500).json({ error: 'Erro ao criar produto' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const productRepository = AppDataSource.getRepository(Product);
      
      const product = await productRepository.findOne({
        where: { id, user_id: req.userId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      productRepository.merge(product, req.body);
      await productRepository.save(product);
      
      return res.json(product);
    } catch (error) {
      console.error('Update product error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const productRepository = AppDataSource.getRepository(Product);
      
      const result = await productRepository.delete({
        id,
        user_id: req.userId
      });

      if (result.affected === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Delete product error:', error);
      return res.status(500).json({ error: 'Erro ao deletar produto' });
    }
  }
}
