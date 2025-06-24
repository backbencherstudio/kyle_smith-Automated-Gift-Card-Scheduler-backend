import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { GiftCardInventoryService } from './gift-card-inventory.service';
import { CreateGiftCardInventoryDto } from './dto/create-gift-card-inventory.dto';
import { UpdateGiftCardInventoryDto } from './dto/update-gift-card-inventory.dto';
import { FilterGiftCardInventoryDto } from './dto/filter-gift-card-inventory.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('admin/gift-card-inventory')
@UseGuards(JwtAuthGuard)
export class GiftCardInventoryController {
  constructor(private readonly service: GiftCardInventoryService) {}

  @Post()
  async create(@Body() dto: CreateGiftCardInventoryDto) {
    return this.service.create(dto);
  }

  @Post('bulk-upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    return this.service.bulkUpload(file);
  }

  @Get()
  async findAll(@Query() filter: FilterGiftCardInventoryDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGiftCardInventoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
