import { RentalOrder, Scaffold, ScaffoldStatus, RentalStatus, WaitlistEntry, RateRule, InventoryLog } from '@/types';
import { addMinutes, isAfter, isBefore, parseISO, format } from 'date-fns';

const STORAGE_KEYS = {
  SCAFFOLDS: 'scaffold_rentals_scaffolds',
  ORDERS: 'scaffold_rentals_orders',
  RATE_RULES: 'scaffold_rentals_rate_rules',
  ACTIVE_RULE_ID: 'scaffold_rentals_active_rule_id',
  INVENTORY_LOGS: 'scaffold_rentals_inventory_logs',
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return defaultValue;
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

export function loadScaffolds(): Scaffold[] {
  return loadFromStorage<Scaffold[]>(STORAGE_KEYS.SCAFFOLDS, []);
}

export function saveScaffolds(scaffolds: Scaffold[]): void {
  saveToStorage(STORAGE_KEYS.SCAFFOLDS, scaffolds);
}

export function loadOrders(): RentalOrder[] {
  return loadFromStorage<RentalOrder[]>(STORAGE_KEYS.ORDERS, []);
}

export function saveOrders(orders: RentalOrder[]): void {
  saveToStorage(STORAGE_KEYS.ORDERS, orders);
}

export function loadRateRules(): RateRule[] {
  return loadFromStorage<RateRule[]>(STORAGE_KEYS.RATE_RULES, []);
}

export function saveRateRules(rules: RateRule[]): void {
  saveToStorage(STORAGE_KEYS.RATE_RULES, rules);
}

export function loadActiveRuleId(): string | null {
  return loadFromStorage<string | null>(STORAGE_KEYS.ACTIVE_RULE_ID, null);
}

export function saveActiveRuleId(id: string | null): void {
  saveToStorage(STORAGE_KEYS.ACTIVE_RULE_ID, id);
}

export function loadInventoryLogs(): InventoryLog[] {
  return loadFromStorage<InventoryLog[]>(STORAGE_KEYS.INVENTORY_LOGS, []);
}

export function saveInventoryLogs(logs: InventoryLog[]): void {
  saveToStorage(STORAGE_KEYS.INVENTORY_LOGS, logs);
}

export function createRentalOrder(
  orderData: Omit<RentalOrder, 'id' | 'status' | 'createdAt'>
): RentalOrder {
  return {
    ...orderData,
    id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

export function isOrderOverdue(order: RentalOrder): boolean {
  const endTime = parseISO(order.endTime);
  const now = new Date();
  return isAfter(now, endTime) && order.status === 'active';
}

export function shouldAutoRelease(order: RentalOrder): boolean {
  if (order.status !== 'active' && order.status !== 'overdue') {
    return false;
  }
  const endTime = parseISO(order.endTime);
  const releaseTime = addMinutes(endTime, order.autoReleaseAfterMinutes);
  return isAfter(new Date(), releaseTime);
}

export function checkOverdueRentals(orders: RentalOrder[]): RentalOrder[] {
  return orders.filter(o => isOrderOverdue(o) && o.status === 'active');
}

export function autoReleaseExpired(
  orders: RentalOrder[],
  scaffolds: Scaffold[]
): { orders: RentalOrder[]; scaffolds: Scaffold[]; released: RentalOrder[] } {
  const released: RentalOrder[] = [];
  const updatedOrders = orders.map(order => {
    if (shouldAutoRelease(order)) {
      released.push(order);
      return { ...order, status: 'released' as RentalStatus, actualEndTime: new Date().toISOString() };
    }
    if (isOrderOverdue(order) && order.status === 'active') {
      return { ...order, status: 'overdue' as RentalStatus };
    }
    return order;
  });

  const releasedOrderIds = released.map(o => o.scaffoldId);
  const updatedScaffolds = scaffolds.map(s => {
    if (releasedOrderIds.includes(s.id) && s.status === 'rented') {
      return { ...s, status: 'available' as ScaffoldStatus };
    }
    return s;
  });

  return { orders: updatedOrders, scaffolds: updatedScaffolds, released };
}

export function getScaffoldAvailability(
  scaffoldId: string,
  checkDate: Date,
  orders: RentalOrder[]
): boolean {
  const dayStart = new Date(checkDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(checkDate);
  dayEnd.setHours(23, 59, 59, 999);

  const conflictingOrders = orders.filter(o => {
    if (o.scaffoldId !== scaffoldId) return false;
    if (o.status === 'completed' || o.status === 'released') return false;
    const orderStart = parseISO(o.startTime);
    const orderEnd = parseISO(o.endTime);
    return !(isBefore(orderEnd, dayStart) || isAfter(orderStart, dayEnd));
  });

  return conflictingOrders.length === 0;
}

export function getOrdersByDateRange(
  orders: RentalOrder[],
  start: Date,
  end: Date
): RentalOrder[] {
  return orders.filter(o => {
    const orderStart = parseISO(o.startTime);
    const orderEnd = parseISO(o.endTime);
    return !(isBefore(orderEnd, start) || isAfter(orderStart, end));
  });
}

export function getOrdersByScaffold(
  orders: RentalOrder[],
  scaffoldId: string
): RentalOrder[] {
  return orders.filter(o => o.scaffoldId === scaffoldId);
}

export function createScaffold(
  data: Omit<Scaffold, 'id' | 'createdAt' | 'status'> & { status?: ScaffoldStatus }
): Scaffold {
  return {
    ...data,
    id: generateId(),
    status: data.status || 'available',
    createdAt: new Date().toISOString(),
  };
}

export function getScaffoldAvailabilityDetail(
  scaffoldId: string,
  orders: RentalOrder[],
  checkDate: Date = new Date()
): { isAvailable: boolean; activeOrder: RentalOrder | null; upcomingOrders: RentalOrder[] } {
  const now = checkDate;
  const activeOrder = orders.find(o => {
    if (o.scaffoldId !== scaffoldId) return false;
    if (o.status === 'completed' || o.status === 'released') return false;
    const orderStart = parseISO(o.startTime);
    const orderEnd = parseISO(o.endTime);
    return !isBefore(now, orderStart) && !isAfter(now, orderEnd);
  }) || null;

  const upcomingOrders = orders.filter(o => {
    if (o.scaffoldId !== scaffoldId) return false;
    if (o.status === 'completed' || o.status === 'released') return false;
    const orderStart = parseISO(o.startTime);
    return isAfter(orderStart, now);
  }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

  const isCurrentlyRented = activeOrder && (activeOrder.status === 'pending' || activeOrder.status === 'active' || activeOrder.status === 'overdue');

  return {
    isAvailable: !isCurrentlyRented,
    activeOrder,
    upcomingOrders,
  };
}

export function getDynamicScaffoldStatus(
  scaffold: Scaffold,
  orders: RentalOrder[],
  checkDate: Date = new Date()
): ScaffoldStatus {
  if (scaffold.status === 'maintenance') return 'maintenance';
  const { activeOrder } = getScaffoldAvailabilityDetail(scaffold.id, orders, checkDate);
  if (activeOrder && (activeOrder.status === 'pending' || activeOrder.status === 'active' || activeOrder.status === 'overdue')) {
    return 'rented';
  }
  return 'available';
}

export function hasScheduleConflict(
  scaffoldId: string,
  orders: RentalOrder[],
  startTime: Date,
  endTime: Date,
  excludeOrderId?: string
): boolean {
  const conflictingOrders = orders.filter(o => {
    if (o.scaffoldId !== scaffoldId) return false;
    if (excludeOrderId && o.id === excludeOrderId) return false;
    if (o.status === 'completed' || o.status === 'released') return false;
    const orderStart = parseISO(o.startTime);
    const orderEnd = parseISO(o.endTime);
    return !(isBefore(endTime, orderStart) || isAfter(startTime, orderEnd));
  });
  return conflictingOrders.length > 0;
}

export function pickupOrder(order: RentalOrder): RentalOrder {
  const now = new Date();
  return {
    ...order,
    status: 'active',
    actualStartTime: now.toISOString(),
  };
}

export function returnOrder(order: RentalOrder): RentalOrder {
  const now = new Date();
  return {
    ...order,
    status: 'completed',
    actualEndTime: now.toISOString(),
  };
}

export function processStatusTransitions(
  orders: RentalOrder[]
): { orders: RentalOrder[]; toActive: RentalOrder[]; toOverdue: RentalOrder[]; toReleased: RentalOrder[] } {
  const now = new Date();
  const toActive: RentalOrder[] = [];
  const toOverdue: RentalOrder[] = [];
  const toReleased: RentalOrder[] = [];

  const updatedOrders = orders.map(order => {
    if (order.status === 'active') {
      const endTime = parseISO(order.endTime);
      if (isAfter(now, endTime)) {
        const updated = { ...order, status: 'overdue' as RentalStatus };
        toOverdue.push(updated);
        return updated;
      }
    }

    if (order.status === 'active' || order.status === 'overdue') {
      const endTime = parseISO(order.endTime);
      const releaseTime = addMinutes(endTime, order.autoReleaseAfterMinutes);
      if (isAfter(now, releaseTime)) {
        const updated = { ...order, status: 'released' as RentalStatus, actualEndTime: now.toISOString() };
        toReleased.push(updated);
        return updated;
      }
    }

    return order;
  });

  return { orders: updatedOrders, toActive, toOverdue, toReleased };
}
