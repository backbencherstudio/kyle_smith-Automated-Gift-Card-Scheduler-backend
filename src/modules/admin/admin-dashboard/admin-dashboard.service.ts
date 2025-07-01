import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DashboardOverviewDto,
  ChartDataPoint,
} from './dto/dashboard-overview.dto';
import dayjs from 'dayjs';

// Helper: isUpcoming (copy from your gift-recipient.service.ts or import if shared)
function isUpcoming(birthdayDate: Date): boolean {
  const today = new Date();
  const now = dayjs(today);
  const birthday = dayjs(birthdayDate);
  let nextBirthday = birthday.year(now.year());
  if (nextBirthday.isBefore(now, 'day')) {
    nextBirthday = nextBirthday.add(1, 'year');
  }
  const daysUntilBirthday = nextBirthday.diff(now, 'day');
  return daysUntilBirthday <= 30 && daysUntilBirthday >= 0;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    range: 'weekly' | 'monthly' | 'yearly' = 'weekly',
  ): Promise<DashboardOverviewDto> {
    // 1. Metrics (only verified users)
    const [totalUsers, totalGiftSent, totalRevenue, failedTransactions] =
      await Promise.all([
        this.prisma.user.count({
          where: { deleted_at: null, email_verified_at: { not: null } },
        }),
        this.prisma.giftScheduling.count({
          where: { delivery_status: 'SENT' },
        }),
        this.prisma.paymentTransaction.aggregate({
          _sum: { paid_amount: true },
          where: { status: 'succeeded' },
        }),
        this.prisma.paymentTransaction.count({ where: { status: 'failed' } }),
      ]);

    // 2. Chart Data (only verified users)
    let chartData: ChartDataPoint[];
    if (range === 'weekly') chartData = await this.getWeeklyUserChart();
    else if (range === 'monthly') chartData = await this.getMonthlyUserChart();
    else if (range === 'yearly') chartData = await this.getYearlyUserChart();
    else throw new BadRequestException('Invalid range parameter');

    // 3. Upcoming Birthdays (use isUpcoming logic)
    const allRecipients = await this.prisma.giftRecipient.findMany({
      include: { user: true },
    });
    const upcoming_gifts = allRecipients
      .filter((r) => r.user?.email_verified_at && isUpcoming(r.birthday_date))
      .map((r) => ({
        name: r.name,
        email: r.email,
        birthday: dayjs(r.birthday_date).format('D MMM YYYY'),
      }))
      .slice(0, 5); // Limit to 5

    // 4. Recent Activity (last 10, sender must be verified)
    const recent_activity = await this.prisma.giftScheduling
      .findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          recipient: true,
          user: true,
          inventory: true,
        },
      })
      .then((gifts) =>
        gifts
          .filter((g) => g.user?.email_verified_at) // Only verified senders
          .map((g) => ({
            sender_name: g.user?.name || '',
            recipient_name: g.recipient?.name || '',
            recipient_email: g.recipient?.email || '',
            event_date: dayjs(g.recipient?.birthday_date).format('D MMM YYYY'),
            gift_send_date: dayjs(g.scheduled_date).format('D MMM YYYY'),
            amount: Number(g.inventory?.selling_price || 0),
            status:
              g.delivery_status === 'SENT'
                ? 'Completed'
                : g.delivery_status === 'FAILED'
                  ? 'Failed'
                  : g.delivery_status,
          })),
      );

    return {
      metrics: {
        total_users: totalUsers,
        total_gift_sent: totalGiftSent,
        total_revenue: Number(totalRevenue._sum.paid_amount || 0),
        failed_transactions: failedTransactions,
      },
      new_user_chart: chartData,
      upcoming_gifts,
      recent_activity,
    };
  }

  // Helper: Weekly chart (Sat–Fri)
  async getWeeklyUserChart(): Promise<ChartDataPoint[]> {
    const weekDays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const startOfWeek = dayjs().startOf('week');
    const endOfWeek = dayjs().endOf('week');
    const users = await this.prisma.user.findMany({
      where: {
        created_at: {
          gte: startOfWeek.toDate(),
          lte: endOfWeek.toDate(),
        },
        deleted_at: null,
        email_verified_at: { not: null },
      },
      select: { created_at: true },
    });
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      const day = dayjs(u.created_at).format('ddd');
      counts[day] = (counts[day] || 0) + 1;
    });
    return weekDays.map((label) => ({
      label,
      users: counts[label] || 0,
    }));
  }

  // Helper: Monthly chart (Day 1–30/31)
  async getMonthlyUserChart(): Promise<ChartDataPoint[]> {
    const daysInMonth = dayjs().daysInMonth();
    const startOfMonth = dayjs().startOf('month');
    const endOfMonth = dayjs().endOf('month');
    const users = await this.prisma.user.findMany({
      where: {
        created_at: {
          gte: startOfMonth.toDate(),
          lte: endOfMonth.toDate(),
        },
        deleted_at: null,
        email_verified_at: { not: null },
      },
      select: { created_at: true },
    });
    const counts: Record<number, number> = {};
    users.forEach((u) => {
      const day = dayjs(u.created_at).date();
      counts[day] = (counts[day] || 0) + 1;
    });
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: `Day ${i + 1}`,
      users: counts[i + 1] || 0,
    }));
  }

  // Helper: Yearly chart (Jan–Dec)
  async getYearlyUserChart(): Promise<ChartDataPoint[]> {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const startOfYear = dayjs().startOf('year');
    const endOfYear = dayjs().endOf('year');
    const users = await this.prisma.user.findMany({
      where: {
        created_at: {
          gte: startOfYear.toDate(),
          lte: endOfYear.toDate(),
        },
        deleted_at: null,
        email_verified_at: { not: null },
      },
      select: { created_at: true },
    });
    const counts: Record<number, number> = {};
    users.forEach((u) => {
      const month = dayjs(u.created_at).month();
      counts[month] = (counts[month] || 0) + 1;
    });
    return months.map((label, i) => ({
      label,
      users: counts[i] || 0,
    }));
  }
}
