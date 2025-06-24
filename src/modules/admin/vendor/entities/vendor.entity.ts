/**
 * Vendor Entity
 * Represents a gift card vendor (e.g., Amazon, Walmart, Target)
 * Used for organizing gift cards by their source vendor
 */
export class Vendor {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
