import { ApiProperty } from '@nestjs/swagger';

export class UserManagementListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty() totalGiftSend: number;
  @ApiProperty() birthdayContact: number;
  @ApiProperty() totalGiftAmount: number;
  @ApiProperty() isActive: boolean;
}

export class UserManagementListDto {
  @ApiProperty({ type: [UserManagementListItemDto] })
  users: UserManagementListItemDto[];

  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}
