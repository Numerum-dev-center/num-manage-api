import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from '../common/enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async notify(
    recipientId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ): Promise<void> {
    await this.notifyMany([recipientId], type, title, message, link);
  }

  async notifyMany(
    recipientIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ): Promise<void> {
    if (recipientIds.length === 0) return;
    const notifications = recipientIds.map((recipientId) =>
      this.notificationRepository.create({
        recipientId,
        type,
        title,
        message,
        link: link ?? null,
      }),
    );
    await this.notificationRepository.save(notifications);
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    // La liste doit toujours couvrir au moins toutes les notifications non lues :
    // sinon le compteur unread-count (non plafonné) peut dépasser ce qui est
    // réellement affiché, et "tout marquer comme lu" ferait disparaître
    // silencieusement des notifications jamais vues par l'utilisateur.
    const unreadCount = await this.countUnread(userId);
    return this.notificationRepository.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: Math.max(50, unreadCount),
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, recipientId: userId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} non trouvée`);
    }
    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );
  }
}
