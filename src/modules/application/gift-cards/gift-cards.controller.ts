import { Controller, Get, Param, Query } from '@nestjs/common';
import { GiftCardsService } from './gift-cards.service';
import { FilterGiftCardsDto } from './dto/filter-gift-cards.dto';
import { BrowseVendorsDto } from './dto/browse-vendors.dto';

@Controller('gift-cards')
export class GiftCardsController {
  constructor(private readonly service: GiftCardsService) {}

  @Get()
  async findAll(@Query() filter: FilterGiftCardsDto) {
    return this.service.findAll(filter);
  }

  
  @Get('vendors')
  async listVendors() {
    return this.service.listVendors();
  }

  @Get('browse')
  async browseVendors(@Query() filter: BrowseVendorsDto) {
    return this.service.browseVendors(filter);
  }

  @Get('vendors/:id')
  async getVendorDetails(@Param('id') id: string) {
    return this.service.getVendorDetails(id);
  }
  
  @Get('vendors/:id/availability/:amount')
  async checkVendorAvailability(
    @Param('id') vendor_id: string,
    @Param('amount') face_value: string,
  ) {
    const amount = parseFloat(face_value);
    if (isNaN(amount)) {
      return {
        success: false,
        message: 'Invalid amount provided',
      };
    }
    return this.service.checkVendorAvailability(vendor_id, amount);
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  
  @Get(':id/availability')
  async checkAvailability(@Param('id') id: string) {
    return this.service.checkAvailability(id);
  }
}
