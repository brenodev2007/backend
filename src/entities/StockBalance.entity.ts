import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product.entity';
import { Warehouse } from './Warehouse.entity';

@Entity('stock_balances')
export class StockBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  product_id: string;

  @Column()
  warehouse_id: string;

  @Column({ default: 0 })
  quantity: number;

  @ManyToOne(() => Product, product => product.balances)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse, warehouse => warehouse.balances)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;
}
