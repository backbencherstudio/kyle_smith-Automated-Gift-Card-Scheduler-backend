import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryTransactionService } from './inventory-transaction.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { FilterInventoryTransactionDto } from './dto/filter-inventory-transaction.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('admin/inventory-transaction')
@UseGuards(JwtAuthGuard)
export class InventoryTransactionController {
  constructor(private readonly service: InventoryTransactionService) {}

  @Post()
  async create(@Body() dto: CreateInventoryTransactionDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll(@Query() filter: FilterInventoryTransactionDto) {
    return this.service.findAll(filter);
  }

  
  @Get('reports')
  async getReports(@Query() filter: FilterInventoryTransactionDto) {
      return this.service.getReports(filter);
    }
    
    @Get('analytics')
    async getAnalytics(@Query() filter: FilterInventoryTransactionDto) {
        return this.service.getAnalytics(filter);
    }
    @Get(':id')
    async findOne(@Param('id') id: string) {
      return this.service.findOne(id);
    }
}
