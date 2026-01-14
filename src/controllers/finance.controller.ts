import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { FinancialTransaction } from '../entities/FinancialTransaction.entity';
import { AuthRequest } from '../middlewares/auth.middleware';

export class FinanceController {
  static async getTransactions(req: AuthRequest, res: Response) {
    try {
      const transactionRepository = AppDataSource.getRepository(FinancialTransaction);
      const transactions = await transactionRepository.find({
        where: { user_id: req.userId },
        order: { transaction_date: 'DESC' }
      });
      return res.json(transactions);
    } catch (error) {
      console.error('Get transactions error:', error);
      return res.status(500).json({ error: 'Erro ao buscar transações' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const transactionRepository = AppDataSource.getRepository(FinancialTransaction);
      
      const transaction = transactionRepository.create({
        ...req.body,
        user_id: req.userId
      });

      await transactionRepository.save(transaction);
      return res.status(201).json(transaction);
    } catch (error) {
      console.error('Create transaction error:', error);
      return res.status(500).json({ error: 'Erro ao criar transação' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const transactionRepository = AppDataSource.getRepository(FinancialTransaction);
      
      const result = await transactionRepository.delete({
        id,
        user_id: req.userId
      });

      if (result.affected === 0) {
        return res.status(404).json({ error: 'Transação não encontrada' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Delete transaction error:', error);
      return res.status(500).json({ error: 'Erro ao deletar transação' });
    }
  }
}
