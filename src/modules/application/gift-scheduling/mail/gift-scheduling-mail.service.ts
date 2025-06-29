import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class GiftSchedulingMailService {
  constructor(
    @InjectQueue('gift-scheduling-mail-queue') private queue: Queue,
  ) {}

  async sendGiftEmail(params: {
    to: string;
    recipient_name: string;
    sender_name: string;
    sender_email: string;
    vendor_name: string;
    face_value: number;
    scheduled_date: Date;
    custom_message: string;
    gift_card_code: string;
    user_id: string;
    gift_scheduling_id: string;
    delay?: number;
  }) {
    await this.queue.add(
      'sendGiftEmail',
      {
        to: params.to,
        subject: `🎁 Your Gift Card from ${params.vendor_name}`,
        template: 'gift-delivery',
        context: {
          recipient_name: params.recipient_name,
          sender_name: params.sender_name,
          sender_email: params.sender_email,
          vendor_name: params.vendor_name,
          face_value: params.face_value,
          scheduled_date: params.scheduled_date,
          custom_message: params.custom_message,
          gift_card_code: params.gift_card_code,
          user_id: params.user_id,
          gift_scheduling_id: params.gift_scheduling_id,
        },
      },
      {
        delay: params.delay || 0,
      },
    );
  }
}
