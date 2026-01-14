import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User.entity';
import { Category } from './Category.entity';
import { StockBalance } from './StockBalance.entity';
import { ProductLot } from './ProductLot.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  sku: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ default: 'un' })
  unit: string;

  @Column({ default: 0 })
  min_stock: number;

  @Column({ nullable: true })
  image_url: string;

  @Column({ nullable: true })
  category_id: string;

  @Column()
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Category, category => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => User, user => user.products)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => StockBalance, balance => balance.product)
  balances: StockBalance[];

  @OneToMany(() => ProductLot, lot => lot.product)
  lots: ProductLot[];
}
