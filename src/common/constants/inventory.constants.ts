export const INVENTORY_THRESHOLDS = {
  CRITICAL: 2, // 2 or fewer cards = critical
  LOW: 5, // 5 or fewer cards = low
  WARNING: 10, // 10 or fewer cards = warning
} as const;

export const INVENTORY_NOTIFICATION_TYPES = {
  CRITICAL: 'inventory_critical',
  LOW: 'inventory_low',
  WARNING: 'inventory_warning',
} as const;
