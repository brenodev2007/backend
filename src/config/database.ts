import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Category } from '../entities/Category.entity';
import { FinancialTransaction } from '../entities/FinancialTransaction.entity';
import { Product } from '../entities/Product.entity';
import { ProductLot } from '../entities/ProductLot.entity';
import { ShopeeAccount } from '../entities/ShopeeAccount.entity';
import { ShopeeOrder } from '../entities/ShopeeOrder.entity';
import { StockBalance } from '../entities/StockBalance.entity';
import { StockMovement } from '../entities/StockMovement.entity';
import { Subscription } from '../entities/Subscription.entity';
import { User } from '../entities/User.entity';
import { Warehouse } from '../entities/Warehouse.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  username: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'stock_savvy',
  synchronize: true, // Disable in production!
  logging: false,
  entities: [
    Category,
    FinancialTransaction,
    Product,
    ProductLot,
    ShopeeAccount,
    ShopeeOrder,
    StockBalance,
    StockMovement,
    Subscription,
    User,
    Warehouse
  ],
  migrations: [],
  subscribers: []
});

