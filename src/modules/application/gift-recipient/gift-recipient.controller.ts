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

    return this.giftRecipientService.findAll(filter, user_id);
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
