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

  static async getSummary(req: AuthRequest, res: Response) {
    try {
      const transactionRepository = AppDataSource.getRepository(FinancialTransaction);
      const transactions = await transactionRepository.find({
        where: { user_id: req.userId }
      });

      // Calculate totals
      let revenue = 0;
      let costs = 0;
      let expenses = 0;

      transactions.forEach((tx) => {
        const amount = Number(tx.amount);
        if (tx.type === 'income') {
          revenue += amount;
        } else if (tx.type === 'cost') {
          costs += amount;
        } else if (tx.type === 'expense') {
          expenses += amount;
        }
      });

      const cashBalance = revenue - costs - expenses;

      // Generate chart data grouped by month
      const monthlyData = new Map<string, { vendas: number; lucro: number }>();
      
      transactions.forEach((tx) => {
        const date = new Date(tx.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('pt-BR', { month: 'short' });
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { vendas: 0, lucro: 0 });
        }
        
        const data = monthlyData.get(monthKey)!;
        const amount = Number(tx.amount);
        
        if (tx.type === 'income') {
          data.vendas += amount;
        } else if (tx.type === 'cost' || tx.type === 'expense') {
          data.lucro -= amount;
        }
      });

      // Calculate lucro as vendas - costs for each month
      monthlyData.forEach((data, key) => {
        data.lucro = data.vendas + data.lucro; // lucro was negative (costs), so we add
      });

      // Convert to array and sort by date
      const chartData = Array.from(monthlyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6) // Last 6 months
        .map(([key, data]) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          const monthName = date.toLocaleString('pt-BR', { month: 'short' });
          return {
            name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            vendas: data.vendas,
            lucro: data.lucro
          };
        });

      // Get recent transactions
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, 10);

      return res.json({
        revenue,
        costs,
        expenses,
        cashBalance,
        chartData,
        recentTransactions
      });
    } catch (error) {
      console.error('Get summary error:', error);
      return res.status(500).json({ error: 'Erro ao buscar resumo financeiro' });
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
