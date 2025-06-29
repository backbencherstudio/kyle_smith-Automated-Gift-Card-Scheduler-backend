import { IsOptional, IsString, IsNumber, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FilterGiftRecipientDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}
