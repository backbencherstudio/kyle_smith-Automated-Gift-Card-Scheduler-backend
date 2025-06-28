import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { DateHelper } from '../../../common/helper/date.helper';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { StringHelper } from '../../../common/helper/string.helper';
import { GiftCardStatus } from '../gift-card-inventory/dto/create-gift-card-inventory.dto';

/**
 * Vendor Service
 * Handles business logic for vendor management
 */
@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new vendor
   * @param create_vendor_dto - Vendor creation data
   * @param logo - Vendor logo file
   * @returns Created vendor information
   */
  async create(create_vendor_dto: CreateVendorDto, logo?: Express.Multer.File) {
    try {
      let logoFileName: string | undefined;
      if (logo) {
        logoFileName = `${StringHelper.randomString()}${logo.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.vendor + logoFileName,
          logo.buffer,
        );
      }

      const vendor_data = {
        name: create_vendor_dto.name,
        description: create_vendor_dto.description,
        website: create_vendor_dto.website,
        logo: logoFileName,
        is_active: create_vendor_dto.is_active ?? true,
      };

      const vendor = await this.prisma.vendor.create({
        data: vendor_data,
        select: {
          id: true,
          name: true,
          description: true,
          website: true,
          logo: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        success: true,
        message: 'Vendor created successfully',
        data: vendor,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get all vendors with optional filtering and dynamic pagination
   * @param filters - Optional filters for vendor list
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated list of vendors
   */
  async findAll(
    filters?: {
      is_active?: boolean;
      search?: string;
    },
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const where_condition: any = {};

      // Filter by active status
      if (filters?.is_active !== undefined) {
        where_condition.is_active = filters.is_active;
      }

      // Search by name or description
      if (filters?.search) {
        where_condition.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Dynamic pagination
      const skip = (page - 1) * limit;

      // Get total count
      const total = await this.prisma.vendor.count({
        where: where_condition,
      });

      // Get vendors for current page
      const vendors = await this.prisma.vendor.findMany({
        where: where_condition,
        select: {
          id: true,
          name: true,
          description: true,
          website: true,
          logo: true,
          is_active: true,
          created_at: true,
          updated_at: true,

          _count: {
            select: {
              gift_card_inventory: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip: skip,
        take: limit,
      });

      return {
        success: true,
        data: vendors,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get a single vendor by ID
   * @param vendor_id - Vendor ID
   * @returns Vendor details
   */
  async findOne(vendor_id: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendor_id },
        select: {
          id: true,
          name: true,
          description: true,
          website: true,
          logo: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          gift_card_inventory: {
            select: {
              id: true,
              face_value: true,
              selling_price: true,
              status: true,
              created_at: true,
            },
            orderBy: {
              created_at: 'desc',
            },
            take: 10, // Show last 10 gift cards
          },
          _count: {
            select: {
              gift_card_inventory: true,
            },
          },
        },
      });

      if (!vendor) {
        return {
          success: false,
          message: 'Vendor not found',
        };
      }

      return {
        success: true,
        data: vendor,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Update vendor information
   * @param vendor_id - Vendor ID
   * @param update_vendor_dto - Updated vendor data
   * @param logo - Vendor logo file
   * @returns Updated vendor information
   */
  async update(
    vendor_id: string,
    update_vendor_dto: UpdateVendorDto,
    logo?: Express.Multer.File,
  ) {
    try {
      let logoFileName: string | undefined;

      // 1. Fetch the existing vendor
      const existingVendor = await this.prisma.vendor.findUnique({
        where: { id: vendor_id },
      });

      // 2. If a new logo is uploaded, handle file replacement
      if (logo) {
        // Delete old logo if it exists
        if (existingVendor.logo) {
          await SojebStorage.delete(
            appConfig().storageUrl.vendor + existingVendor.logo,
          );
        }
        // Upload new logo
        logoFileName = `${StringHelper.randomString()}${logo.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.vendor + logoFileName,
          logo.buffer,
        );
      }

      // 3. Update vendor record
      const vendor = await this.prisma.vendor.update({
        where: { id: vendor_id },
        data: {
          ...update_vendor_dto,
          ...(logoFileName && { logo: logoFileName }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          website: true,
          logo: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        success: true,
        message: 'Vendor updated successfully',
        data: vendor,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete a vendor (soft delete by setting is_active to false)
   * @param vendor_id - Vendor ID
   * @returns Deletion confirmation
   */
  async remove(vendor_id: string) {
    try {
      // Check current inventory status
      const active_gift_cards = await this.prisma.giftCardInventory.count({
        where: {
          vendor_id: vendor_id,
          status: GiftCardStatus.AVAILABLE,
        },
      });

      // Always allow soft delete, but provide information
      await this.prisma.vendor.update({
        where: { id: vendor_id },
        data: {
          is_active: false,
          updated_at: DateHelper.now(),
        },
      });

      // Return appropriate message based on inventory
      if (active_gift_cards > 0) {
        return {
          success: true,
          message: `Vendor deactivated successfully. ${active_gift_cards} gift cards remain available for existing customers.`,
          remainingCards: active_gift_cards,
          note: 'Vendor will not appear in new sales, but existing inventory remains accessible.',
        };
      } else {
        return {
          success: true,
          message: 'Vendor deactivated successfully.',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
