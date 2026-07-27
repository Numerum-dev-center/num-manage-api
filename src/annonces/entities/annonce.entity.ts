import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { User } from '../../users/entities/user.entity';

@Entity('annonces')
export class Annonce {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Expose()
  @Column({ type: 'text' })
  content!: string;

  @Expose()
  @ManyToOne(() => Promotion, { nullable: false })
  @JoinColumn({ name: 'promotionId' })
  promotion!: Promotion;

  @Column({ type: 'uuid' })
  promotionId!: string;

  @Expose()
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid' })
  createdById!: string;

  @Expose()
  @CreateDateColumn()
  createdAt!: Date;
}
