import { PartialType } from '@nestjs/swagger';
import { CreateGiftCardInventoryDto } from './create-gift-card-inventory.dto';

export class UpdateGiftCardInventoryDto extends PartialType(
  CreateGiftCardInventoryDto,
) {}
