import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { GiftSchedulingService } from './gift-scheduling.service';
import { CreateGiftSchedulingDto } from './dto/create-gift-scheduling.dto';
import { UpdateGiftSchedulingDto } from './dto/update-gift-scheduling.dto';
import { FilterGiftSchedulingDto } from './dto/filter-gift-scheduling.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from 'src/modules/wallet/wallet.service';

@ApiTags('Gift Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gift-scheduling')
export class GiftSchedulingController {
  constructor(
    private readonly giftSchedulingService: GiftSchedulingService,
    private readonly walletService: WalletService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a new gift with payment' })
  async create(
    @Body() createDto: CreateGiftSchedulingDto,
    @Request() req: any,
  ) {
    const user_id = req.user?.userId;
    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }

    try {
      // 1. Get user's default payment method
      const defaultCardResult =
        await this.walletService.getDefaultCardForPayment(user_id);

      if (!defaultCardResult.success || !defaultCardResult.data) {
        return {
          success: false,
          message:
            'No default payment method found. Please add a card to your wallet.',
        };
      }

      const { payment_method_id } = defaultCardResult.data;

      // 2. Create gift schedule with payment
      const result = await this.giftSchedulingService.createWithPayment(
        createDto,
        user_id,
        payment_method_id,
      );

      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to schedule gift',
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all scheduled gifts for the user' })
  async findAll(@Query() filter: FilterGiftSchedulingDto, @Request() req: any) {
    const user_id = req.user?.userId;
    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }
    return this.giftSchedulingService.findAll(filter, user_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific scheduled gift' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const user_id = req.user?.userId;
    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }
    return this.giftSchedulingService.findOne(id, user_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scheduled gift' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGiftSchedulingDto,
    @Request() req: any,
  ) {
    const user_id = req.user?.userId;
    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }
    return this.giftSchedulingService.update(id, updateDto, user_id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a scheduled gift' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const user_id = req.user?.userId;
    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }
    return this.giftSchedulingService.remove(id, user_id);
  }
}
