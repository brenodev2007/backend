import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ShopeeShipmentStatus {
  AGUARDANDO_ENVIO = 'AGUARDANDO_ENVIO',
  ENVIADO = 'ENVIADO',
  EM_TRANSPORTE = 'EM_TRANSPORTE',
  ENTREGUE = 'ENTREGUE',
  CANCELADO = 'CANCELADO',
  DEVOLVIDO = 'DEVOLVIDO'
}

@Entity('shopee_orders')
export class ShopeeOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  account_id: string;

  @Column({ unique: true })
  order_sn: string;

  @Column()
  product_name: string;

  @Column({ nullable: true })
  sku: string;

  @Column({ type: 'date' })
  purchase_date: Date;

  @Column({
    type: 'enum',
    enum: ShopeeShipmentStatus,
    default: ShopeeShipmentStatus.AGUARDANDO_ENVIO
  })
  status: ShopeeShipmentStatus;

  @Column({ nullable: true })
  customer_name: string;

  @Column({ nullable: true })
  customer_phone: string;

  @Column({ nullable: true, type: 'text' })
  shipping_address: string;

  @Column({ nullable: true })
  carrier: string;

  @Column({ nullable: true })
  tracking_code: string;

  @Column({ nullable: true })
  tracking_url: string;

  @Column({ nullable: true, type: 'date' })
  estimated_delivery: Date;

  @Column({ nullable: true, type: 'date' })
  actual_delivery: Date;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  order_total: number;

  @Column({ nullable: true, type: 'json' })
  shopee_data: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
