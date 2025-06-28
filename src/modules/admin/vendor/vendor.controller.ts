import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

/**
 * Vendor Controller
 * Handles HTTP requests for vendor management
 * Admin-only access
 */
@ApiBearerAuth()
@ApiTags('Vendor Management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/vendor')
export class VendorController {
  constructor(private readonly vendor_service: VendorService) {}

  /**
   * Create a new vendor
   */
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({
    status: 201,
    description: 'Vendor created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data',
  })
  @Post()
  @UseInterceptors(FileInterceptor('logo', { storage: memoryStorage() }))
  async create(
    @Body() create_vendor_dto: CreateVendorDto,
    @UploadedFile() logo: Express.Multer.File,
  ) {
    try {
      const result = await this.vendor_service.create(create_vendor_dto, logo);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get all vendors with optional filtering and dynamic pagination
   */
  @ApiOperation({ summary: 'Get all vendors' })
  @ApiResponse({
    status: 200,
    description: 'Vendors retrieved successfully',
  })
  @Get()
  async findAll(
    @Query()
    query: {
      is_active?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
  ) {
    try {
      const filters = {
        is_active:
          query.is_active === 'true'
            ? true
            : query.is_active === 'false'
              ? false
              : undefined,
        search: query.search,
      };

      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 10;

      const result = await this.vendor_service.findAll(filters, page, limit);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get a single vendor by ID
   */
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vendor retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor not found',
  })
  @Get(':id')
  async findOne(@Param('id') vendor_id: string) {
    try {
      const result = await this.vendor_service.findOne(vendor_id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Update vendor information
   */
  @ApiOperation({ summary: 'Update vendor' })
  @ApiResponse({
    status: 200,
    description: 'Vendor updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor not found',
  })
  @Patch(':id')
  @UseInterceptors(FileInterceptor('logo', { storage: memoryStorage() }))
  async update(
    @Param('id') vendor_id: string,
    @Body() update_vendor_dto: UpdateVendorDto,
    @UploadedFile() logo: Express.Multer.File,
  ) {
    try {
      const result = await this.vendor_service.update(
        vendor_id,
        update_vendor_dto,
        logo,
      );
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete (deactivate) a vendor
   */
  @ApiOperation({ summary: 'Delete vendor' })
  @ApiResponse({
    status: 200,
    description: 'Vendor deactivated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete vendor with active gift cards',
  })
  @Delete(':id')
  async remove(@Param('id') vendor_id: string) {
    try {
      const result = await this.vendor_service.remove(vendor_id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
