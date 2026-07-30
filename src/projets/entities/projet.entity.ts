import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { User } from '../../users/entities/user.entity';
import { Soumission } from './soumission.entity';

@Entity('projets')
export class Projet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  titre!: string;

  @Expose()
  @Column({ type: 'text' })
  description!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  technologies!: string;

  @Expose()
  @Column({ type: 'datetime' })
  dateLimite!: Date;

  @Expose()
  @ManyToOne(() => Promotion)
  @JoinColumn({ name: 'promotionId' })
  promotion!: Promotion;

  @Column({ type: 'uuid' })
  promotionId!: string;

  @Expose()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid' })
  createdById!: string;

  @Expose()
  @OneToMany(() => Soumission, (soumission) => soumission.projet)
  soumissions!: Soumission[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
