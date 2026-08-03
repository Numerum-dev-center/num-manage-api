import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes notifications récentes' })
  async findMine(
    @CurrentUser() currentUser: { sub: string },
  ): Promise<Notification[]> {
    return this.notificationsService.findAllForUser(currentUser.sub);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  async unreadCount(
    @CurrentUser() currentUser: { sub: string },
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.countUnread(currentUser.sub);
    return { count };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marquer toutes mes notifications comme lues' })
  async markAllAsRead(
    @CurrentUser() currentUser: { sub: string },
  ): Promise<void> {
    return this.notificationsService.markAllAsRead(currentUser.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() currentUser: { sub: string },
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, currentUser.sub);
  }
}
