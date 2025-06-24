import { Module } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { PrismaModule } from '../../../prisma/prisma.module';

/**
 * Vendor Module
 * Provides vendor management functionality for admin users
 */
@Module({
  imports: [PrismaModule],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService], // Export for use in other modules
})
export class VendorModule {}
