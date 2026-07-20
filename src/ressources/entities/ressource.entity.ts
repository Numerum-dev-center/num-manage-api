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

@Entity('ressources')
export class Ressource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  // Chemin sur le disque du serveur : jamais exposé au client (le téléchargement
  // passe uniquement par la route contrôlée /ressources/:id/download).
  @Exclude()
  @Column({ type: 'varchar', length: 500 })
  storedPath!: string;

  @Expose()
  @Column({ type: 'varchar', length: 100 })
  mimeType!: string;

  @Expose()
  @Column({ type: 'int' })
  size!: number;

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
