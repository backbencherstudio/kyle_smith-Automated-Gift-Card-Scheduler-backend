import { ApiProperty } from '@nestjs/swagger';

export class UserGiftHistoryItemDto {
  @ApiProperty() recipientName: string;
  @ApiProperty() recipientEmail: string;
  @ApiProperty() giftSendDate: string;
  @ApiProperty() message: string | null;
  @ApiProperty() amount: number;
  @ApiProperty() eventDate: string;
  @ApiProperty() status: string;
}

export class UserGiftHistoryDto {
  @ApiProperty({ type: [UserGiftHistoryItemDto] })
  gifts: UserGiftHistoryItemDto[];
}
