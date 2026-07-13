import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../../users/entities/user.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Expose()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Expose()
  @Column({ type: 'boolean', default: false })
  isArchived!: boolean;

  @Expose()
  @Column({ type: 'date', nullable: true })
  startDate?: string | null;

  @Expose()
  @Column({ type: 'date', nullable: true })
  endDate?: string | null;

  @Expose()
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'formateurId' })
  formateur?: User | null;

  @Column({ type: 'uuid', nullable: true })
  formateurId?: string | null;

  @Expose()
  @OneToMany(() => User, (user) => user.promotion)
  apprenants!: User[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
