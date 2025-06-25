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
import { GiftSchedulingService } from './gift-scheduling.service';
import { CreateGiftSchedulingDto } from './dto/create-gift-scheduling.dto';
import { UpdateGiftSchedulingDto } from './dto/update-gift-scheduling.dto';
import { FilterGiftSchedulingDto } from './dto/filter-gift-scheduling.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Gift Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gift-scheduling')
export class GiftSchedulingController {
  constructor(private readonly giftSchedulingService: GiftSchedulingService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a new gift' })
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
    return this.giftSchedulingService.create(createDto, user_id);
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
