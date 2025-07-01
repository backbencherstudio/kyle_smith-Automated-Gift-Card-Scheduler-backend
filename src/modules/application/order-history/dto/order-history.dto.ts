export interface OrderHistoryItemDto {
  date: string; // ISO string
  recipient_name: string;
  gift_amount: number;
  recipient_email: string;
  status: string;
}

export interface OrderHistoryResponseDto {
  success: boolean;
  data: OrderHistoryItemDto[];
  total: number;
  page: number;
  limit: number;
}
