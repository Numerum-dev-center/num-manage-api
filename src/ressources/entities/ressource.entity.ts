import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { User } from '../../users/entities/user.entity';
import { RessourceType } from '../enums/ressource-type.enum';

@Entity('ressources')
export class Ressource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @Column({ type: 'enum', enum: RessourceType })
  type!: RessourceType;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  // Fichier et lien externe sont mutuellement exclusifs : l'un des deux groupes
  // de colonnes est toujours null selon `type`.
  @Expose()
  @Column({ type: 'varchar', length: 255, nullable: true })
  filename!: string | null;

  // Chemin sur le disque du serveur : jamais exposé au client (le téléchargement
  // passe uniquement par la route contrôlée /ressources/:id/download).
  @Exclude()
  @Column({ type: 'varchar', length: 500, nullable: true })
  storedPath!: string | null;

  @Expose()
  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType!: string | null;

  @Expose()
  @Column({ type: 'int', nullable: true })
  size!: number | null;

  @Expose()
  @Column({ type: 'varchar', length: 2048, nullable: true })
  url!: string | null;

  @Expose()
  @ManyToOne(() => Promotion, { nullable: false })
  @JoinColumn({ name: 'promotionId' })
  promotion!: Promotion;

  @Column({ type: 'uuid' })
  promotionId!: string;

  @Expose()
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy!: User;

  @Column({ type: 'uuid' })
  uploadedById!: string;

  @Expose()
  @CreateDateColumn()
  createdAt!: Date;
}
