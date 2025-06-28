import { ApiProperty } from '@nestjs/swagger';

export class UserGiftsDto {
  @ApiProperty({ description: 'Total scheduled gifts' })
  totalScheduled: number;

  @ApiProperty({ description: 'User gifts with status' })
  gifts: UserGiftDto[];

  @ApiProperty({ description: 'Status summary' })
  summary: {
    pending: number;
    sent: number;
    failed: number;
    processing: number;
  };

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}

export class UserGiftDto {
  @ApiProperty({ description: 'Gift scheduling ID' })
  id: string;

  @ApiProperty({ description: 'Recipient information' })
  recipient: {
    name: string;
    email: string;
    birthday: string;
  };

  @ApiProperty({ description: 'Gift card details' })
  giftCard: {
    vendor: string;
    amount: number;
    code: string | null;
    status: 'PENDING' | 'SENT' | 'FAILED';
  };

  @ApiProperty({ description: 'Scheduling information' })
  scheduling: {
    scheduledDate: string;
    deliveryEmail: string;
    customMessage: string | null;
  };

  @ApiProperty({ description: 'Status information' })
  status: {
    deliveryStatus: string;
    sentAt: string | null;
    queueStatus: string;
    processingTime: number | null;
    errorMessage?: string;
  };

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}
