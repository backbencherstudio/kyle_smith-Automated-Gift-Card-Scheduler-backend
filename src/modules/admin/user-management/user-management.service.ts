import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetUserGiftHistoryQueryDto } from './dto/get-user-gift-history.dto';

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

  async getUserGiftHistory(
    userId: string,
    query: GetUserGiftHistoryQueryDto = {} as GetUserGiftHistoryQueryDto,
  ) {
    const { page = 1, limit = 10, month, year } = query;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);

    // Parse month/year safely
    const now = new Date();
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    const targetMonth =
      !isNaN(parsedMonth) && parsedMonth > 0 ? parsedMonth : now.getMonth() + 1;
    const targetYear =
      !isNaN(parsedYear) && parsedYear > 0 ? parsedYear : now.getFullYear();

    // Calculate start and end of the month
    const startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Fetch sender info
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!sender) {
      throw new NotFoundException('User not found');
    }

    // Build where filter for gifts (now using created_at)
    const giftWhere: any = {
      user_id: userId,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    };

    console.log(giftWhere);

    // Get total count for pagination
    const total = await this.prisma.giftScheduling.count({
      where: giftWhere,
    });

    // Fetch paginated gifts
    const gifts = await this.prisma.giftScheduling.findMany({
      where: giftWhere,
      include: {
        recipient: true,
        inventory: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 1;

    return {
      sender_name: sender.name,
      sender_email: sender.email,
      gifts: gifts.map((gift) => ({
        recipientName: gift.recipient?.name,
        recipientEmail: gift.recipient?.email,
        giftSendDate: gift.scheduled_date.toISOString(),
        message: gift.custom_message,
        amount: Number(gift.inventory?.selling_price) || 0,
        eventDate: gift.scheduled_date.toISOString(),
        status: gift.delivery_status,
      })),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      month: targetMonth,
      year: targetYear,
    };
  }

  async deleteUser(userId: string) {
    // Optionally: delete related data first if not cascading
    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    console.log(userId, isActive);
    await this.prisma.user.update({
      where: { id: userId },
      data: { approved_at: isActive ? new Date() : null },
    });
    return { success: true, isActive };
  }
}
