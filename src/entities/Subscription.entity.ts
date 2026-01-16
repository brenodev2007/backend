import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './User.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  user_id: string;

  @OneToOne(() => User, user => user.subscription)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  preapproval_id: string;

  @Column({ default: 'basic' })
  plan: string; // 'basic' or 'pro'

  @Column({ default: 'inactive' })
  status: string; // 'inactive', 'active', 'cancelled', 'paused', 'trial'

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'BRL' })
  currency: string;

  @Column({ nullable: true })
  billing_cycle: string; // 'monthly'

  @Column({ nullable: true, type: 'datetime' })
  trial_start: Date;

  @Column({ nullable: true, type: 'datetime' })
  trial_end: Date;

  @Column({ nullable: true, type: 'datetime' })
  subscription_start: Date;

  @Column({ nullable: true, type: 'datetime' })
  subscription_end: Date | null;

  @Column({ nullable: true, type: 'datetime' })
  next_billing_date: Date;

  @Column({ nullable: true, type: 'datetime' })
  cancelled_at: Date | null;

  @Column({ type: 'json', nullable: true })
  payment_method: string | null;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
