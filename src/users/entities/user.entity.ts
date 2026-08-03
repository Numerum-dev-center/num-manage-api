import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { Exclude, Expose } from 'class-transformer';
import { Promotion } from '../../promotions/entities/promotion.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  firstname!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  lastname!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  password?: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  googleId?: string | null;

  @Expose()
  @Column({ type: 'enum', enum: Role, default: Role.APPRENANT })
  role!: Role;

  @Expose()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @Expose()
  @Column({ type: 'varchar', nullable: true })
  phoneNumber?: string;

  @Expose()
  @Column({ type: 'varchar', length: 255, nullable: true })
  specialite?: string | null;

  @Expose()
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string | null;

  @Expose()
  @ManyToOne(() => Promotion, (promotion) => promotion.apprenants, {
    nullable: true,
  })
  @JoinColumn({ name: 'promotionId' })
  promotion?: Promotion | null;

  @Column({ type: 'uuid', nullable: true })
  promotionId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
