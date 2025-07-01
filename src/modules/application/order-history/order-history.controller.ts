import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { OrderHistoryService } from './order-history.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard)
@Controller('order-history')
export class OrderHistoryController {
  constructor(private readonly orderHistoryService: OrderHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get order history' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getOrderHistory(
    @Req() req,
    @Query('query') query?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const user_id = req.user.userId;
    return this.orderHistoryService.findAll(user_id, { query, page, limit });
  }
}
