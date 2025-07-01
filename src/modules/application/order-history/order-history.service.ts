import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderHistoryResponseDto } from './dto/order-history.dto';

@Injectable()
export class OrderHistoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user_id: string,
    filter: { query?: string; page?: number; limit?: number },
  ): Promise<OrderHistoryResponseDto & { totalPages: number }> {
    const { query, page = 1, limit = 10 } = filter;
    const safeLimit = Math.max(1, Number(limit) || 10);
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * safeLimit;

    // Fetch transactions for the user (paginated)
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      skip,
      take: safeLimit,
      include: { inventory: true },
    });

    // For each transaction, join to GiftScheduling and filter by query if needed
    const data = (
      await Promise.all(
        transactions.map(async (tx) => {
          const giftSchedule = await this.prisma.giftScheduling.findFirst({
            where: {
              inventory_id: tx.inventory_id,
              user_id,
            },
            include: { recipient: true },
          });

          // Prepare fields for searching
          const recipientName = giftSchedule?.recipient?.name || '';
          const recipientEmail = giftSchedule?.recipient?.email || '';
          const status = tx.status || '';
          const giftAmount = tx.inventory?.face_value
            ? String(tx.inventory.face_value)
            : '';

          // If query is present, filter in-memory
          if (query) {
            const q = query.toLowerCase();
            if (
              !recipientName.toLowerCase().includes(q) &&
              !recipientEmail.toLowerCase().includes(q) &&
              !status.toLowerCase().includes(q) &&
              !giftAmount.includes(q)
            ) {
              return null;
            }
          }

          return {
            date: tx.created_at.toISOString(),
            recipient_name: recipientName,
            gift_amount: Number(tx.inventory?.face_value || 0),
            recipient_email: recipientEmail,
            status: status,
          };
        }),
      )
    ).filter(Boolean);

    // For total, apply the same query filter
    const allTx = await this.prisma.paymentTransaction.findMany({
      where: { user_id },
      include: { inventory: true },
    });

    let total = allTx.length;
    if (query) {
      const q = query.toLowerCase();
      total = 0;
      for (const tx of allTx) {
        const giftSchedule = await this.prisma.giftScheduling.findFirst({
          where: {
            inventory_id: tx.inventory_id,
            user_id,
          },
          include: { recipient: true },
        });
        const recipientName = giftSchedule?.recipient?.name || '';
        const recipientEmail = giftSchedule?.recipient?.email || '';
        const status = tx.status || '';
        const giftAmount = tx.inventory?.face_value
          ? String(tx.inventory.face_value)
          : '';
        if (
          recipientName.toLowerCase().includes(q) ||
          recipientEmail.toLowerCase().includes(q) ||
          status.toLowerCase().includes(q) ||
          giftAmount.includes(q)
        ) {
          total++;
        }
      }
    }

    const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 1;

    return {
      success: true,
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }
}
