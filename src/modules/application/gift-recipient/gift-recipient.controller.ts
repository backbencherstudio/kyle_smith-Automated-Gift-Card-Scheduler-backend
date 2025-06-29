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
} from '@nestjs/common';
import { GiftRecipientService } from './gift-recipient.service';
import { CreateGiftRecipientDto } from './dto/create-gift-recipient.dto';
import { UpdateGiftRecipientDto } from './dto/update-gift-recipient.dto';
import { FilterGiftRecipientDto } from './dto/filter-gift-recipient.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilterGiftRecipientWithGiftsDto } from './dto/filter-gift-recipient-with-gifts.dto';

@ApiTags('Gift Recipients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gift-recipients')
export class GiftRecipientController {
  constructor(private readonly giftRecipientService: GiftRecipientService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new gift recipient' })
  async create(@Body() createDto: CreateGiftRecipientDto, @Request() req: any) {
    const user_id = req.user?.userId;

    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }

    return this.giftRecipientService.create(createDto, user_id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all gift recipients for the user' })
  async findAll(@Query() filter: FilterGiftRecipientDto, @Request() req: any) {
    const user_id = req.user?.userId;

    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }

    try {
      // ✅ Validate and convert parameters
      const validatedFilter = {
        search: filter.search,
        page: filter.page ? parseInt(filter.page.toString()) : 1,
        limit: filter.limit ? parseInt(filter.limit.toString()) : 10,
      };

      // ✅ Validate ranges
      if (validatedFilter.page < 1) {
        return {
          success: false,
          message: 'Page must be greater than 0',
        };
      }

      if (validatedFilter.limit < 1) {
        return {
          success: false,
          message: 'Limit must be greater than 0',
        };
      }

      const result = await this.giftRecipientService.findAll(
        validatedFilter,
        user_id,
      );
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch recipients',
      };
    }
  }

  @Get('with-gifts')
  @ApiOperation({
    summary: 'Get all gift recipients with gift scheduling information',
  })
  async findAllWithGifts(
    @Query() filter: FilterGiftRecipientWithGiftsDto,
    @Request() req: any,
  ) {
    console.log(filter);
    console.log(req.user?.userId);
    const user_id = req.user?.userId;

    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }

    try {
      // Validate and convert parameters
      const validatedFilter = {
        search: filter.search,
        month: filter.month ? parseInt(filter.month.toString()) : undefined,
        day: filter.day ? parseInt(filter.day.toString()) : undefined,
        page: filter.page ? parseInt(filter.page.toString()) : 1,
        limit: filter.limit ? parseInt(filter.limit.toString()) : 10,
        gift_status: filter.gift_status,
      };

      // Validate ranges
      if (validatedFilter.page < 1) {
        return {
          success: false,
          message: 'Page must be greater than 0',
        };
      }

      if (validatedFilter.limit < 1) {
        return {
          success: false,
          message: 'Limit must be greater than 0',
        };
      }

      if (
        validatedFilter.month &&
        (validatedFilter.month < 1 || validatedFilter.month > 12)
      ) {
        return {
          success: false,
          message: 'Month must be between 1 and 12',
        };
      }

      if (
        validatedFilter.day &&
        (validatedFilter.day < 1 || validatedFilter.day > 31)
      ) {
        return {
          success: false,
          message: 'Day must be between 1 and 31',
        };
      }

      const result = await this.giftRecipientService.findAllWithGifts(
        validatedFilter,
        user_id,
      );
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch recipients with gifts',
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific gift recipient' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const user_id = req.user?.userId;

    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }

    return this.giftRecipientService.findOne(id, user_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a gift recipient' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGiftRecipientDto,
    @Request() req: any,
  ) {
    const user_id = req.user?.userId;

    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }

    return this.giftRecipientService.update(id, updateDto, user_id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a gift recipient' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const user_id = req.user?.userId;

    if (!user_id) {
      return {
        success: false,
        message: 'User not authenticated or invalid token',
      };
    }

    return this.giftRecipientService.remove(id, user_id);
  }
}
