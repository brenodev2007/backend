import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User.entity';
import { Product } from './Product.entity';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUST = 'ADJUST'
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  product_id: string;

  @Column({
    type: 'enum',
    enum: MovementType
  })
  type: MovementType;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  warehouse_from_id: string;

  @Column({ nullable: true })
  warehouse_to_id: string;

  @Column({ nullable: true })
  lot_id: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  reason: string;

  @Column()
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, user => user.movements)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
