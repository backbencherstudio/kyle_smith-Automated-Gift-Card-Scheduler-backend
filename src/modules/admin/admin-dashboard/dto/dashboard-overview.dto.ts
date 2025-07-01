export interface DashboardMetrics {
  total_users: number;
  total_gift_sent: number;
  total_revenue: number;
  failed_transactions: number;
}

export interface ChartDataPoint {
  label: string;
  users: number;
}

export interface NewUserChart {
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
  yearly: ChartDataPoint[];
}

export interface UpcomingGift {
  name: string;
  email: string;
  birthday: string;
}

export interface RecentActivity {
  sender_name: string;
  recipient_name: string;
  recipient_email: string;
  event_date: string;
  gift_send_date: string;
  amount: number;
  status: string;
}

export interface DashboardOverviewDto {
  metrics: DashboardMetrics;
  new_user_chart: ChartDataPoint[];
  upcoming_gifts: UpcomingGift[];
  recent_activity: RecentActivity[];
}
