import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterGiftCardsDto } from './dto/filter-gift-cards.dto';
import { BrowseVendorsDto } from './dto/browse-vendors.dto';
import { VendorAvailabilityDto } from './dto/vendor-availability.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class GiftCardsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: FilterGiftCardsDto) {
    try {
      const {
        vendor_id,
        min_price,
        max_price,
        search,
        offset = 0,
        limit = 20,
      } = filter;

      const where: any = { status: 'AVAILABLE' };
      if (vendor_id) where.vendor_id = vendor_id;
      if (min_price || max_price) {
        where.selling_price = {};
        if (min_price) where.selling_price.gte = min_price;
        if (max_price) where.selling_price.lte = max_price;
      }
      if (search) {
        where.OR = [
          { vendor: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.giftCardInventory.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: { vendor: true },
        }),
        this.prisma.giftCardInventory.count({ where }),
      ]);

      // Map to user-friendly output
      const result = data.map((card) => ({
        id: card.id,
        vendor_id: card.vendor_id,
        vendor_name: card.vendor?.name,
        face_value: card.face_value,
        selling_price: card.selling_price,
        status: card.status,
        purchase_date: card.purchase_date,
        expiry_date: card.expiry_date,
      }));

      return { success: true, data: result, total, offset, limit };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async findOne(id: string) {
    try {
      const card = await this.prisma.giftCardInventory.findUnique({
        where: { id },
        include: { vendor: true },
      });
      if (!card || card.status !== 'AVAILABLE') {
        return {
          success: false,
          message: 'Gift card not found or unavailable',
        };
      }
      return {
        success: true,
        data: {
          id: card.id,
          vendor_id: card.vendor_id,
          vendor_name: card.vendor?.name,
          face_value: card.face_value,
          selling_price: card.selling_price,
          status: card.status,
          purchase_date: card.purchase_date,
          expiry_date: card.expiry_date,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async checkAvailability(id: string) {
    try {
      const card = await this.prisma.giftCardInventory.findUnique({
        where: { id },
      });
      return {
        success: true,
        available: !!card && card.status === 'AVAILABLE',
      };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async listVendors() {
    try {
      const vendors = await this.prisma.vendor.findMany({
        where: { is_active: true },
        select: { id: true, name: true, logo: true },
      });

      // ✅ CLEANED: Generate logo URLs only
      const vendors_with_logos = vendors.map((vendor) => {
        let logo_url = null;
        if (vendor.logo) {
          logo_url = SojebStorage.url(
            appConfig().storageUrl.vendor + vendor.logo,
          );
        }

        return {
          id: vendor.id,
          name: vendor.name,
          logo_url: logo_url, // ✅ Only logo_url, no redundant logo field
        };
      });

      return { success: true, data: vendors_with_logos };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  // ✅ CLEANED: Browse vendors without redundant logo field
  async browseVendors(filter: BrowseVendorsDto) {
    try {
      const { search, min_price, max_price } = filter;

      // Build where clause for vendors
      const vendorWhere: any = { is_active: true };
      if (search) {
        vendorWhere.name = { contains: search, mode: 'insensitive' };
      }

      // Get all active vendors
      const vendors = await this.prisma.vendor.findMany({
        where: vendorWhere,
        select: {
          id: true,
          name: true,
          logo: true,
          description: true,
        },
      });

      // For each vendor, get available denominations and price ranges
      const vendors_with_denominations = await Promise.all(
        vendors.map(async (vendor) => {
          // Build where clause for cards
          const cardWhere: any = {
            vendor_id: vendor.id,
            status: 'AVAILABLE',
          };

          if (min_price || max_price) {
            cardWhere.selling_price = {};
            if (min_price) cardWhere.selling_price.gte = min_price;
            if (max_price) cardWhere.selling_price.lte = max_price;
          }

          // Get available denominations with single selling_price
          const denominations = await this.prisma.giftCardInventory.groupBy({
            by: ['face_value'],
            where: cardWhere,
            _count: { face_value: true },
            _min: { selling_price: true },
            orderBy: { face_value: 'asc' },
          });

          // Get face_value range (Amazon's prices)
          const face_value_range =
            await this.prisma.giftCardInventory.aggregate({
              where: cardWhere,
              _min: { face_value: true },
              _max: { face_value: true },
            });

          // ✅ CLEANED: Generate logo URL only
          let logo_url = null;
          if (vendor.logo) {
            logo_url = SojebStorage.url(
              appConfig().storageUrl.vendor + vendor.logo,
            );
          }

          return {
            id: vendor.id,
            name: vendor.name,
            logo_url: logo_url, // ✅ Only logo_url, no redundant logo field
            description: vendor.description,
            available_denominations: denominations.map((d) => ({
              face_value: d.face_value,
              available_count: d._count.face_value,
              selling_price: d._min.selling_price,
            })),
            price_range: {
              min: face_value_range._min.face_value || 0,
              max: face_value_range._max.face_value || 0,
            },
            total_available_cards: denominations.reduce(
              (sum, d) => sum + d._count.face_value,
              0,
            ),
          };
        }),
      );

      // Filter out vendors with no available cards
      const available_vendors = vendors_with_denominations.filter(
        (vendor) => vendor.total_available_cards > 0,
      );

      return {
        success: true,
        data: available_vendors,
        total: available_vendors.length,
      };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  // ✅ CLEANED: Get vendor details without redundant logo field
  async getVendorDetails(vendor_id: string) {
    try {
      // Get vendor info
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendor_id, is_active: true },
        select: {
          id: true,
          name: true,
          logo: true,
          description: true,
          website: true,
        },
      });

      if (!vendor) {
        return {
          success: false,
          message: 'Vendor not found or inactive',
        };
      }

      // Get available denominations with single selling_price and sorting
      const denominations = await this.prisma.giftCardInventory.groupBy({
        by: ['face_value'],
        where: {
          vendor_id: vendor_id,
          status: 'AVAILABLE',
        },
        _count: { face_value: true },
        _min: { selling_price: true },
        orderBy: { face_value: 'asc' },
      });

      // Get face_value range
      const face_value_range = await this.prisma.giftCardInventory.aggregate({
        where: {
          vendor_id: vendor_id,
          status: 'AVAILABLE',
        },
        _min: { face_value: true },
        _max: { face_value: true },
      });

      // ✅ CLEANED: Generate logo URL only
      let logo_url = null;
      if (vendor.logo) {
        logo_url = SojebStorage.url(
          appConfig().storageUrl.vendor + vendor.logo,
        );
      }

      return {
        success: true,
        data: {
          vendor: {
            id: vendor.id,
            name: vendor.name,
            logo_url: logo_url, // ✅ Only logo_url, no redundant logo field
            description: vendor.description,
            website: vendor.website,
          },
          available_denominations: denominations.map((d) => ({
            face_value: d.face_value,
            available_count: d._count.face_value,
            selling_price: d._min.selling_price,
          })),
          price_range: {
            min: face_value_range._min.face_value || 0,
            max: face_value_range._max.face_value || 0,
          },
          total_available_cards: denominations.reduce(
            (sum, d) => sum + d._count.face_value,
            0,
          ),
        },
      };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  // ✅ UPDATED: Check availability with clean structure
  async checkVendorAvailability(vendor_id: string, face_value: number) {
    try {
      // Check if vendor exists and is active
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendor_id, is_active: true },
        select: { id: true, name: true },
      });

      if (!vendor) {
        return {
          success: false,
          message: 'Vendor not found or inactive',
        };
      }

      // Count available cards for this vendor + amount
      const available_count = await this.prisma.giftCardInventory.count({
        where: {
          vendor_id: vendor_id,
          face_value: face_value,
          status: 'AVAILABLE',
        },
      });

      // ✅ FIXED: Get single selling price for this denomination
      const price_info = await this.prisma.giftCardInventory.findFirst({
        where: {
          vendor_id: vendor_id,
          face_value: face_value,
          status: 'AVAILABLE',
        },
        select: { selling_price: true },
      });

      return {
        success: true,
        data: {
          vendor_id: vendor_id,
          vendor_name: vendor.name,
          face_value: face_value,
          available_count: available_count,
          selling_price: price_info?.selling_price || 0, // ✅ Single selling_price
          is_available: available_count > 0,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }
}
