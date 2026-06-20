import { RateRule, Scaffold, RentalOrder, WaitlistEntry, Invoice, InventoryLog, NotificationLog } from '@/types';
import { addDays, addHours, subDays, parseISO } from 'date-fns';
import { calculateRentalFee } from './billingService';

export function createMockRateRules(): RateRule[] {
  const now = new Date();
  return [
    {
      id: 'rule-default',
      name: '标准费率规则',
      effectiveDate: now.toISOString().split('T')[0],
      isActive: true,
      createdAt: subDays(now, 30).toISOString(),
      slots: [
        { id: 's1', startTime: '00:00', endTime: '06:00', rateType: 'valley', pricePerHour: 3.0 },
        { id: 's2', startTime: '06:00', endTime: '08:00', rateType: 'normal', pricePerHour: 5.0 },
        { id: 's3', startTime: '08:00', endTime: '12:00', rateType: 'peak', pricePerHour: 8.5 },
        { id: 's4', startTime: '12:00', endTime: '14:00', rateType: 'normal', pricePerHour: 5.0 },
        { id: 's5', startTime: '14:00', endTime: '18:00', rateType: 'peak', pricePerHour: 8.5 },
        { id: 's6', startTime: '18:00', endTime: '22:00', rateType: 'normal', pricePerHour: 5.0 },
        { id: 's7', startTime: '22:00', endTime: '24:00', rateType: 'valley', pricePerHour: 3.0 },
      ],
    },
    {
      id: 'rule-holiday',
      name: '节假日费率规则',
      effectiveDate: addDays(now, 7).toISOString().split('T')[0],
      isActive: false,
      createdAt: subDays(now, 15).toISOString(),
      slots: [
        { id: 'h1', startTime: '00:00', endTime: '08:00', rateType: 'valley', pricePerHour: 2.5 },
        { id: 'h2', startTime: '08:00', endTime: '20:00', rateType: 'peak', pricePerHour: 10.0 },
        { id: 'h3', startTime: '20:00', endTime: '24:00', rateType: 'normal', pricePerHour: 5.5 },
      ],
    },
  ];
}

export function createMockScaffolds(): Scaffold[] {
  const types = ['门式脚手架', '碗扣式脚手架', '扣件式钢管脚手架', '盘扣式脚手架'];
  const statuses: ('available' | 'rented' | 'maintenance')[] = ['available', 'rented', 'maintenance'];
  
  return [
    { id: 'sc-001', code: 'SF-2024-001', type: types[0], poleCount: 120, status: statuses[1], location: 'A区-01', createdAt: subDays(new Date(), 90).toISOString() },
    { id: 'sc-002', code: 'SF-2024-002', type: types[0], poleCount: 150, status: statuses[0], location: 'A区-02', createdAt: subDays(new Date(), 85).toISOString() },
    { id: 'sc-003', code: 'SF-2024-003', type: types[1], poleCount: 200, status: statuses[1], location: 'B区-01', createdAt: subDays(new Date(), 80).toISOString() },
    { id: 'sc-004', code: 'SF-2024-004', type: types[1], poleCount: 180, status: statuses[0], location: 'B区-02', createdAt: subDays(new Date(), 75).toISOString() },
    { id: 'sc-005', code: 'SF-2024-005', type: types[2], poleCount: 300, status: statuses[2], location: '维修区', notes: '部分杆件变形待更换', createdAt: subDays(new Date(), 70).toISOString() },
    { id: 'sc-006', code: 'SF-2024-006', type: types[2], poleCount: 250, status: statuses[0], location: 'C区-01', createdAt: subDays(new Date(), 65).toISOString() },
    { id: 'sc-007', code: 'SF-2024-007', type: types[3], poleCount: 100, status: statuses[1], location: 'C区-02', createdAt: subDays(new Date(), 60).toISOString() },
    { id: 'sc-008', code: 'SF-2024-008', type: types[3], poleCount: 160, status: statuses[0], location: 'D区-01', createdAt: subDays(new Date(), 55).toISOString() },
  ];
}

export function createMockOrders(rateRules: RateRule[], scaffolds: Scaffold[]): RentalOrder[] {
  const activeRule = rateRules.find(r => r.isActive)!;
  const now = new Date();

  const orderData = [
    {
      scaffoldId: 'sc-001',
      customerName: '中建八局第三工程公司',
      customerPhone: '13800138001',
      startOffset: { days: -2, hours: 8 },
      endOffset: { days: 3, hours: 18 },
      quantity: 2,
    },
    {
      scaffoldId: 'sc-003',
      customerName: '上海建工集团',
      customerPhone: '13900139002',
      startOffset: { days: -1, hours: 6 },
      endOffset: { days: 1, hours: 22 },
      quantity: 1,
    },
    {
      scaffoldId: 'sc-007',
      customerName: '中铁建设集团',
      customerPhone: '13700137003',
      startOffset: { days: 0, hours: 9 },
      endOffset: { days: 5, hours: 17 },
      quantity: 3,
    },
  ];

  return orderData.map((data, idx) => {
    const scaffold = scaffolds.find(s => s.id === data.scaffoldId)!;
    const startTime = addHours(addDays(now, data.startOffset.days), data.startOffset.hours);
    const endTime = addHours(addDays(now, data.endOffset.days), data.endOffset.hours);
    const billingResult = calculateRentalFee(startTime, endTime, data.quantity, activeRule);

    return {
      id: `order-${1000 + idx}`,
      scaffoldId: data.scaffoldId,
      scaffoldCode: scaffold.code,
      scaffoldType: scaffold.type,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      quantity: data.quantity,
      status: 'active' as const,
      autoReleaseAfterMinutes: 120,
      totalAmount: billingResult.totalAmount,
      billingResult,
      createdAt: startTime.toISOString(),
    };
  });
}

export function createMockWaitlist(): WaitlistEntry[] {
  const now = new Date();
  return [
    {
      id: 'wl-001',
      customerName: '万科建筑工程',
      phone: '13600136001',
      scaffoldType: '门式脚手架',
      quantity: 2,
      priority: 2,
      createdAt: subDays(now, 1).toISOString(),
      status: 'waiting',
      notes: '急需，三天内使用',
    },
    {
      id: 'wl-002',
      customerName: '保利建设',
      phone: '13500135002',
      scaffoldType: '门式脚手架',
      quantity: 1,
      priority: 1,
      createdAt: subDays(now, 2).toISOString(),
      status: 'waiting',
    },
    {
      id: 'wl-003',
      customerName: '绿地集团',
      phone: '13400134003',
      scaffoldType: '碗扣式脚手架',
      quantity: 2,
      priority: 3,
      createdAt: subDays(now, 3).toISOString(),
      status: 'notified',
      notifiedAt: subDays(now, 0).toISOString(),
    },
    {
      id: 'wl-004',
      customerName: '龙湖地产',
      phone: '13300133004',
      scaffoldType: '盘扣式脚手架',
      quantity: 1,
      priority: 1,
      createdAt: subDays(now, 5).toISOString(),
      status: 'waiting',
    },
  ];
}

export function createMockInvoices(orders: RentalOrder[]): Invoice[] {
  return orders.slice(0, 2).map((order, idx) => ({
    id: `inv-${2000 + idx}`,
    orderId: order.id,
    customerName: order.customerName,
    billingResult: order.billingResult!,
    createdAt: order.createdAt,
    status: idx === 0 ? 'issued' : 'draft',
    totalAmount: order.totalAmount!,
    issuedAt: idx === 0 ? order.createdAt : undefined,
  }));
}

export function createMockInventoryLogs(scaffolds: Scaffold[]): InventoryLog[] {
  const now = new Date();
  return [
    { id: 'inv-log-001', scaffoldId: 'sc-001', scaffoldCode: 'SF-2024-001', action: 'out', poleChange: -120, poleAfter: 0, createdAt: subDays(now, 2).toISOString(), operator: '张主管', notes: '出库租赁' },
    { id: 'inv-log-002', scaffoldId: 'sc-003', scaffoldCode: 'SF-2024-003', action: 'out', poleChange: -200, poleAfter: 0, createdAt: subDays(now, 1).toISOString(), operator: '李主管', notes: '出库租赁' },
    { id: 'inv-log-003', scaffoldId: 'sc-005', scaffoldCode: 'SF-2024-005', action: 'adjust', poleChange: -15, poleAfter: 285, createdAt: subDays(now, 3).toISOString(), operator: '王工', notes: '维修损耗15根' },
    { id: 'inv-log-004', scaffoldId: 'sc-007', scaffoldCode: 'SF-2024-007', action: 'out', poleChange: -100, poleAfter: 0, createdAt: now.toISOString(), operator: '张主管', notes: '出库租赁' },
  ];
}

export function createMockNotifications(waitlist: WaitlistEntry[]): NotificationLog[] {
  const notified = waitlist.find(w => w.status === 'notified');
  if (!notified) return [];

  return [{
    id: 'notif-001',
    waitlistEntryId: notified.id,
    customerName: notified.customerName,
    scaffoldType: notified.scaffoldType,
    quantity: notified.quantity,
    sentAt: notified.notifiedAt || new Date().toISOString(),
    method: 'system',
    status: 'delivered',
    message: `尊敬的${notified.customerName}，您候补的${notified.scaffoldType}脚手架（数量${notified.quantity}）已有空位，请在30分钟内确认。`,
  }];
}
