import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationEvents } from 'src/common/events/notification.events';

// ✅ DEFINE INVENTORY THRESHOLDS (since constants file doesn't exist yet)
const INVENTORY_THRESHOLDS = {
  CRITICAL: 2, // 2 or fewer cards = critical
  LOW: 5, // 5 or fewer cards = low
  WARNING: 10, // 10 or fewer cards = warning
} as const;

@Injectable()
export class InventoryMonitorService {
  constructor(
    private prisma: PrismaService,
    private notificationEvents: NotificationEvents,
  ) {}

  /**
   * Check inventory levels for all vendors and trigger notifications
   */
  async checkInventoryLevels() {
    try {
      // ✅ FIX: Use correct Prisma relation name
      const vendorInventory = await this.prisma.vendor.findMany({
        where: { is_active: true },
        include: {
          gift_card_inventory: {
            // ✅ FIXED: snake_case relation name
            where: { status: 'AVAILABLE' },
            select: {
              face_value: true,
              id: true,
            },
          },
        },
      });

      for (const vendor of vendorInventory) {
        // ✅ FIX: Use correct property name
        const inventoryByValue = this.groupInventoryByFaceValue(
          vendor.gift_card_inventory, // ✅ FIXED: snake_case property name
        );

        for (const [faceValue, count] of Object.entries(inventoryByValue)) {
          await this.checkAndNotifyLowInventory(
            vendor,
            Number(faceValue),
            count,
          );
        }
      }

      return { success: true, message: 'Inventory levels checked' };
    } catch (error) {
      console.error('Error checking inventory levels:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Check inventory for specific vendor and face value
   */
  async checkVendorInventory(vendorId: string, faceValue: number) {
    try {
      const availableCount = await this.prisma.giftCardInventory.count({
        where: {
          vendor_id: vendorId,
          face_value: faceValue,
          status: 'AVAILABLE',
        },
      });

      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (vendor) {
        await this.checkAndNotifyLowInventory(
          vendor,
          faceValue,
          availableCount,
        );
      }

      return { success: true, count: availableCount };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Group inventory by face value
   */
  private groupInventoryByFaceValue(inventory: any[]) {
    const grouped: { [key: number]: number } = {};

    for (const item of inventory) {
      const faceValue = Number(item.face_value);
      grouped[faceValue] = (grouped[faceValue] || 0) + 1;
    }

    return grouped;
  }

  /**
   * Check inventory level and send notification if needed
   */
  private async checkAndNotifyLowInventory(
    vendor: any,
    faceValue: number,
    count: number,
  ) {
    let notificationType = null;
    let threshold = null;

    if (count <= INVENTORY_THRESHOLDS.CRITICAL) {
      notificationType = 'inventory_critical';
      threshold = INVENTORY_THRESHOLDS.CRITICAL;
    } else if (count <= INVENTORY_THRESHOLDS.LOW) {
      notificationType = 'inventory_low';
      threshold = INVENTORY_THRESHOLDS.LOW;
    } else if (count <= INVENTORY_THRESHOLDS.WARNING) {
      notificationType = 'inventory_warning';
      threshold = INVENTORY_THRESHOLDS.WARNING;
    }

    if (notificationType) {
      await this.notificationEvents.onInventoryLow({
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        face_value: faceValue,
        current_stock: count,
        threshold: threshold,
        notification_type: notificationType,
      });
    }
  }
}
