import { PartialType } from '@nestjs/swagger';
import { CreateGiftRecipientDto } from './create-gift-recipient.dto';

export class UpdateGiftRecipientDto extends PartialType(
  CreateGiftRecipientDto,
) {}
