import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';

export enum StudentStatus {
  ACTIF = 'actif',
  INACTIF = 'inactif',
  DIPLOME = 'diplome',
  ABANDONNE = 'abandonne',
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @ManyToOne(() => Promotion, { nullable: true, onDelete: 'SET NULL' })
  promotion?: Promotion;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ACTIF,
  })
  status!: StudentStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}