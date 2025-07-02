import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { GiftLogQueryDto } from './dto/gift-log-query.dto';

@Injectable()
export class GiftLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async getGiftLog(query: GiftLogQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { status, recipientEmail, recipientName, dateFrom, dateTo } = query;

    const where: any = {};

    if (status) where.job_status = status;
    if (recipientEmail)
      where.recipient_email = { contains: recipientEmail, mode: 'insensitive' };
    if (recipientName)
      where.recipient_name = { contains: recipientName, mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where.completed_at = {};
      if (dateFrom) where.completed_at.gte = new Date(dateFrom);
      if (dateTo) where.completed_at.lte = new Date(dateTo);
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.queueJobHistory.count({ where }),
      this.prisma.queueJobHistory.findMany({
        where,
        orderBy: { completed_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          recipient_name: true,
          recipient_email: true,
          sender_name: true,
          completed_at: true,
          custom_message: true,
          face_value: true,
          job_status: true,
        },
      }),
    ]);

    return {
      data: data.map((item) => ({
        senderName: item.sender_name,
        recipientName: item.recipient_name,
        recipientEmail: item.recipient_email,
        sendDate: item.completed_at,
        message: item.custom_message,
        amount: Number(item.face_value),
        status: item.job_status,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPaymentHistory({ page = 1, limit = 10, month, year, status }: any) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);

    // Date filtering
    let where: any = {};
    if (status) where.status = status;
    if (month && year) {
      const startDate = new Date(
        Number(year),
        Number(month) - 1,
        1,
        0,
        0,
        0,
        0,
      );
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      where.created_at = { gte: startDate, lte: endDate };
    }

    // Fetch paginated transactions
    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: {
          id: true,
          user_id: true,
          user: { select: { name: true } },
          created_at: true,
          amount: true,
          status: true,
        },
      }),
    ]);

    // Cache default card per user for this page
    const userCardCache: Record<string, string> = {};

    const data = await Promise.all(
      transactions.map(async (tx) => {
        let method = 'Card';
        if (tx.user_id) {
          if (!(tx.user_id in userCardCache)) {
            const defaultCard = await this.walletService.getDefaultCard(
              tx.user_id,
            );
            if (defaultCard?.data && defaultCard.data.payment_method_id) {
              // Fetch card details from Stripe
              try {
                const stripeCard = await (
                  await import('src/common/lib/Payment/stripe/StripePayment')
                ).StripePayment.getPaymentMethodById(
                  defaultCard.data.payment_method_id,
                );
                method = stripeCard.card
                  ? `${stripeCard.card.brand} Card`
                  : 'Card';
                userCardCache[tx.user_id] = method;
              } catch {
                userCardCache[tx.user_id] = 'Card';
              }
            } else {
              userCardCache[tx.user_id] = 'Card';
            }
          }
          method = userCardCache[tx.user_id];
        }
        return {
          paymentId: tx.id,
          userName: tx.user?.name || '',
          method,
          date: tx.created_at,
          amount: Number(tx.amount),
          status: tx.status,
        };
      }),
    );

    return {
      data,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
