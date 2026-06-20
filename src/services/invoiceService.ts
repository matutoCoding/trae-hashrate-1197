import { Invoice, InvoiceStatus, RentalOrder, BillingResult } from '@/types';
import { format } from 'date-fns';

const STORAGE_KEY = 'scaffold_rentals_invoices';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function loadInvoices(): Invoice[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Invoice[];
  } catch (e) {
    console.error('Failed to load invoices:', e);
  }
  return [];
}

export function saveInvoices(invoices: Invoice[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error('Failed to save invoices:', e);
  }
}

export function generateInvoice(order: RentalOrder): Invoice {
  if (!order.billingResult) {
    throw new Error('Order has no billing result');
  }

  return {
    id: generateId(),
    orderId: order.id,
    customerName: order.customerName,
    billingResult: order.billingResult,
    createdAt: new Date().toISOString(),
    status: 'draft',
    totalAmount: order.billingResult.totalAmount,
  };
}

export function issueInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    status: 'issued',
    issuedAt: new Date().toISOString(),
  };
}

export function markInvoicePaid(invoice: Invoice): Invoice {
  return {
    ...invoice,
    status: 'paid',
    paidAt: new Date().toISOString(),
  };
}

export function markInvoiceOverdue(invoice: Invoice): Invoice {
  return {
    ...invoice,
    status: 'overdue',
  };
}

export function exportInvoiceAsCSV(invoice: Invoice): string {
  const rows: string[][] = [];
  
  rows.push(['脚手架租赁账单']);
  rows.push(['账单编号', invoice.id]);
  rows.push(['客户名称', invoice.customerName]);
  rows.push(['创建时间', format(new Date(invoice.createdAt), 'yyyy-MM-dd HH:mm:ss')]);
  rows.push(['状态', invoice.status]);
  rows.push([]);
  rows.push(['时段类型', '开始时间', '结束时间', '时长(小时)', '单价(元/小时)', '小计(元)']);
  
  for (const seg of invoice.billingResult.segments) {
    const typeLabel = seg.rateType === 'peak' ? '高峰' : seg.rateType === 'normal' ? '平峰' : '低谷';
    rows.push([
      typeLabel,
      format(seg.startTime, 'yyyy-MM-dd HH:mm'),
      format(seg.endTime, 'yyyy-MM-dd HH:mm'),
      seg.durationHours.toFixed(2),
      seg.unitPrice.toFixed(2),
      seg.subtotal.toFixed(2),
    ]);
  }
  
  rows.push([]);
  rows.push(['总计', '', '', invoice.billingResult.totalHours.toFixed(2), '', invoice.totalAmount.toFixed(2)]);
  
  return rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function filterInvoices(
  invoices: Invoice[],
  filters: {
    status?: InvoiceStatus;
    customerName?: string;
    startDate?: string;
    endDate?: string;
  }
): Invoice[] {
  return invoices.filter(inv => {
    if (filters.status && inv.status !== filters.status) return false;
    if (filters.customerName && !inv.customerName.includes(filters.customerName)) return false;
    if (filters.startDate && inv.createdAt < filters.startDate) return false;
    if (filters.endDate && inv.createdAt > filters.endDate + 'T23:59:59') return false;
    return true;
  });
}
