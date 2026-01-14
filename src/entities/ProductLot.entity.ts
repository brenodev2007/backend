import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product.entity';

@Entity('product_lots')
export class ProductLot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  product_id: string;

  @Column()
  lot_number: string;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ nullable: true, type: 'date' })
  manufacture_date: Date;

  @Column({ nullable: true, type: 'date' })
  expiry_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Product, product => product.lots)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
