import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GiftLogService } from './gift-log.service';
import { GiftLogQueryDto } from './dto/gift-log-query.dto';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('admin/gift-log')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
export class GiftLogController {
  constructor(private readonly giftLogService: GiftLogService) {}

  @Get()
  async getGiftLog(@Query() query: GiftLogQueryDto) {
    return this.giftLogService.getGiftLog(query);
  }

  @Get('payment-history')
  async getPaymentHistory(@Query() query: any) {
    return this.giftLogService.getPaymentHistory(query);
  }
}
