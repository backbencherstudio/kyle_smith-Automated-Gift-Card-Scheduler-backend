import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(page = 1, limit = 10, query?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          approved_at: true,
          gift_scheduling: {
            select: {
              id: true,
              delivery_status: true,
              inventory: { select: { selling_price: true } },
            },
          },
          gift_recipients: { select: { id: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    

    console.log(users);

    const usersWithStats = users.map((user) => {
      const totalGiftSend = user.gift_scheduling.filter(
        (g) => g.delivery_status === 'SENT',
      ).length;
      const totalGiftAmount = user.gift_scheduling
        .filter((g) => g.delivery_status === 'SENT')
        .reduce((sum, g) => sum + (Number(g.inventory?.selling_price) || 0), 0);
      const birthdayContact = user.gift_recipients.length;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalGiftSend,
        birthdayContact,
        totalGiftAmount,
        isActive: !!user.approved_at,
      };
    });

    return {
      users: usersWithStats,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserGiftHistory(userId: string) {
    const gifts = await this.prisma.giftScheduling.findMany({
      where: { user_id: userId },
      include: {
        recipient: true,
        inventory: true,
      },
      orderBy: { scheduled_date: 'desc' },
    });

    return {
      gifts: gifts.map((gift) => ({
        recipientName: gift.recipient?.name,
        recipientEmail: gift.recipient?.email,
        giftSendDate: gift.scheduled_date.toISOString(),
        message: gift.custom_message,
        amount: Number(gift.inventory?.selling_price) || 0,
        eventDate: gift.scheduled_date.toISOString(),
        status: gift.delivery_status,
      })),
    };
  }

  async deleteUser(userId: string) {
    // Optionally: delete related data first if not cascading
    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { approved_at: isActive ? new Date() : null },
    });
    return { success: true, isActive };
  }
}
