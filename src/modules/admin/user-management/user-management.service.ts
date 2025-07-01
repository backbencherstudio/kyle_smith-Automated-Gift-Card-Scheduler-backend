import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(
    page: number = 1,
    limit: number = 10,
    query?: string,
    onlyWithData: boolean = false,
  ) {
    // Defensive defaults
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = (safePage - 1) * safeLimit;

    // Build the where clause
    const where: any = {};

    // Search by name or email if query is provided
    if (query && query.trim() !== '') {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Optionally, only include users with at least one gift or contact
    if (onlyWithData) {
      where.OR = [
        ...(where.OR || []),
        { gift_scheduling: { some: {} } },
        { gift_recipients: { some: {} } },
      ];
    }

    // Fetch users and total count in parallel
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: safeLimit,
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

    const usersTest = await this.prisma.user.findUnique({
      where: { id: 'cmcab7hqd0000uakki9b7asv1' },
      select: {
        id: true,
        name: true,
        email: true,
        gift_scheduling: { select: { id: true } },
        gift_recipients: { select: { id: true } },
      },
    });
    console.log(usersTest);

    // Aggregate stats for each user
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

    // Calculate total pages
    const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 1;

    return {
      users: usersWithStats,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
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
