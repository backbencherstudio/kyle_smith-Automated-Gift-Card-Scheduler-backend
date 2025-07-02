export class GiftLogEntryEntity {
  recipientName: string;
  recipientEmail: string;
  sendDate: Date;
  message: string | null;
  amount: number;
  status: string;
}
