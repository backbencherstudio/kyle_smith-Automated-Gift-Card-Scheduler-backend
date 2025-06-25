import { PartialType } from '@nestjs/swagger';
import { CreateGiftSchedulingDto } from './create-gift-scheduling.dto';

export class UpdateGiftSchedulingDto extends PartialType(
  CreateGiftSchedulingDto,
) {}
