import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { Exclude, Expose } from 'class-transformer';

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
  @Column({ type: 'varchar', length: 255 })
  password!: string;

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

  @Column({ type: 'varchar', nullable: true })
refreshToken?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

}
