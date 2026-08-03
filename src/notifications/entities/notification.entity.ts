import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientId' })
  recipient!: User;

  @Column({ type: 'uuid' })
  recipientId!: string;

  @Expose()
  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Expose()
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Expose()
  @Column({ type: 'text' })
  message!: string;

  // Chemin frontend relatif (ex: /dashboard/student/annonces) vers lequel
  // cliquer sur la notification doit rediriger.
  @Expose()
  @Column({ type: 'varchar', length: 500, nullable: true })
  link?: string | null;

  @Expose()
  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Expose()
  @CreateDateColumn()
  createdAt!: Date;
}
