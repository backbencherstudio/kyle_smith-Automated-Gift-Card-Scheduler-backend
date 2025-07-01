import { ApiProperty } from '@nestjs/swagger';

export class UserStatusUpdateDto {
  @ApiProperty() isActive: boolean;
}
