import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../entities/User.entity';
import { Product } from '../entities/Product.entity';
import { Warehouse } from '../entities/Warehouse.entity';
import { StockMovement } from '../entities/StockMovement.entity';
import { FinancialTransaction } from '../entities/FinancialTransaction.entity';
import { Category } from '../entities/Category.entity';
import { StockBalance } from '../entities/StockBalance.entity';
import { ProductLot } from '../entities/ProductLot.entity';
import { ShopeeAccount } from '../entities/ShopeeAccount.entity';
import { ShopeeOrder } from '../entities/ShopeeOrder.entity';
import { Notification } from '../entities/Notification.entity';
import { UserSubscriber } from '../subscribers/UserSubscriber';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  username: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'stock_savvy',
  synchronize: true, // Forçar sincronização para criar/atualizar tabelas
  logging: true, // Habilitar logs para ver o que está acontecendo
  entities: [
    User, 
    Product, 
    Warehouse, 
    StockMovement, 
    FinancialTransaction, 
    Category, 
    StockBalance, 
    ProductLot, 
    ShopeeAccount, 
    ShopeeOrder,
    Notification
  ],
  migrations: [process.env.NODE_ENV === 'production' ? 'dist/migrations/**/*.js' : 'src/migrations/**/*.ts'],
  subscribers: [UserSubscriber]
});

