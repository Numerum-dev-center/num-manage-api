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
import { PosteProjet } from '../../common/enums/poste-projet.enum';

/**
 * Poste (frontend, backend, ...) qu'occupe un apprenant sur un projet.
 * Indépendant de la Soumission : assignable par le formateur avant même
 * qu'un apprenant ait rendu son travail, et modifiable par l'apprenant lui-même.
 */
@Entity('projet_postes')
@Unique(['projetId', 'apprenantId'])
export class ProjetPoste {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @ManyToOne(() => Projet)
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
  @Column({ type: 'enum', enum: PosteProjet })
  poste!: PosteProjet;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
