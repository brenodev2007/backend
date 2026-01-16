import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { Product } from './Product.entity';
import { StockMovement } from './StockMovement.entity';
import { FinancialTransaction } from './FinancialTransaction.entity';
import { Subscription } from './Subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  cpf_cnpj: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  plan: string;

  @Column({ default: false })
  is_pro: boolean;

  @Column({ nullable: true })
  subscription_id: string;

  @Column({ nullable: true })
  subscription_status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Product, product => product.user)
  products: Product[];

  @OneToMany(() => StockMovement, movement => movement.user)
  movements: StockMovement[];

  @OneToMany(() => FinancialTransaction, transaction => transaction.user)
  transactions: FinancialTransaction[];

  @OneToOne(() => Subscription, subscription => subscription.user, { nullable: true })
  subscription: Subscription;
}
