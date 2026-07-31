import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { Projet } from './projet.entity';
import { User } from '../../users/entities/user.entity';

@Entity('soumissions')
@Unique(['projetId', 'apprenantId'])
export class Soumission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @ManyToOne(() => Projet, (projet) => projet.soumissions)
  @JoinColumn({ name: 'projetId' })
  projet!: Projet;

  @Column({ type: 'uuid' })
  projetId!: string;

  @Expose()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'apprenantId' })
  apprenant!: User;

  @Column({ type: 'uuid' })
  apprenantId!: string;

  @Expose()
  @Column({ type: 'varchar', length: 500 })
  lienGithub!: string;

  @Expose()
  @Column({ type: 'varchar', length: 500 })
  lienDemo!: string;

  @Expose()
  @Column({ type: 'text', nullable: true })
  commentaire?: string | null;

  @Expose()
  @Column({ type: 'int', nullable: true })
  note?: number | null;

  @Expose()
  @Column({ type: 'text', nullable: true })
  feedback?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
