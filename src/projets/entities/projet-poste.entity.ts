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
 * Fait foi de l'affectation explicite d'un apprenant à un projet (roster) :
 * seuls les apprenants ayant une ligne ici sont considérés comme sur le
 * projet - un projet ne cible plus automatiquement toute la promotion.
 * Le poste (frontend, backend, ...) est un attribut optionnel de cette
 * affectation, modifiable par le formateur ou par l'apprenant lui-même.
 */
@Entity('projet_postes')
@Unique(['projetId', 'apprenantId'])
export class ProjetPoste {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @ManyToOne(() => Projet, (projet) => projet.postes)
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
  @Column({ type: 'enum', enum: PosteProjet, nullable: true })
  poste?: PosteProjet | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
