import { ApiProperty } from '@nestjs/swagger';
import { InventoryTransactionType } from '../dto/create-inventory-transaction.dto';

export class InventoryTransaction {
  @ApiProperty() id: string;
  @ApiProperty() inventory_id: string;
  @ApiProperty({ enum: InventoryTransactionType })
  transaction_type: InventoryTransactionType;
  @ApiProperty() quantity: number;
  @ApiProperty() unit_price: number;
  @ApiProperty() total_amount: number;
  @ApiProperty() user_id?: string;
  @ApiProperty() notes?: string;
  @ApiProperty() created_at: string;
}
