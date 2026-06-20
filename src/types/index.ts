export type RateType = 'peak' | 'normal' | 'valley';

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  rateType: RateType;
  pricePerHour: number;
}

export interface RateRule {
  id: string;
  name: string;
  effectiveDate: string;
  slots: TimeSlot[];
  isActive: boolean;
  createdAt: string;
}

export interface BillingSegment {
  rateType: RateType;
  startTime: Date;
  endTime: Date;
  durationHours: number;
  unitPrice: number;
  subtotal: number;
}

export interface BillingResult {
  segments: BillingSegment[];
  totalAmount: number;
  totalHours: number;
  peakHours: number;
  normalHours: number;
  valleyHours: number;
}

export type ScaffoldStatus = 'available' | 'rented' | 'maintenance';

export interface Scaffold {
  id: string;
  code: string;
  type: string;
  poleCount: number;
  status: ScaffoldStatus;
  location?: string;
  notes?: string;
  createdAt: string;
}

export type RentalStatus = 'pending' | 'active' | 'completed' | 'overdue' | 'released';

export interface RentalOrder {
  id: string;
  scaffoldId: string;
  scaffoldCode: string;
  scaffoldType: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  quantity: number;
  status: RentalStatus;
  autoReleaseAfterMinutes: number;
  totalAmount?: number;
  finalAmount?: number;
  billingResult?: BillingResult;
  finalBillingResult?: BillingResult;
  createdAt: string;
}

export type WaitlistStatus = 'waiting' | 'notified' | 'confirmed' | 'expired' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  customerName: string;
  phone: string;
  scaffoldType: string;
  quantity: number;
  priority: number;
  createdAt: string;
  status: WaitlistStatus;
  notifiedAt?: string;
  confirmedAt?: string;
  notes?: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  orderId: string;
  customerName: string;
  billingResult: BillingResult;
  originalBillingResult?: BillingResult;
  createdAt: string;
  status: InvoiceStatus;
  totalAmount: number;
  originalAmount?: number;
  amountDiff?: number;
  issuedAt?: string;
  paidAt?: string;
}

export type InventorySource = 'manual' | 'rental_out' | 'rental_in' | 'auto_release';

export interface InventoryLog {
  id: string;
  scaffoldId: string;
  scaffoldCode: string;
  action: 'in' | 'out' | 'adjust';
  source: InventorySource;
  poleChange: number;
  poleAfter: number;
  createdAt: string;
  operator: string;
  relatedOrderId?: string;
  notes?: string;
}

export interface NotificationLog {
  id: string;
  waitlistEntryId: string;
  customerName: string;
  scaffoldType: string;
  quantity: number;
  sentAt: string;
  method: 'sms' | 'email' | 'system';
  status: 'sent' | 'delivered' | 'failed';
  message: string;
}
