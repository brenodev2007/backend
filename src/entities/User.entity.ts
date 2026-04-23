import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Product } from './Product.entity';
import { StockMovement } from './StockMovement.entity';
import { FinancialTransaction } from './FinancialTransaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  recovery_keyword: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  cpf_cnpj: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ default: false })
  is_active: boolean;

  @Column({ default: 'user' })
  role: string;

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
}
