import { create } from 'zustand';
import {
  RateRule, Scaffold, RentalOrder, WaitlistEntry, Invoice,
  InventoryLog, NotificationLog, BillingResult, ScaffoldStatus, WaitlistStatus
} from '@/types';
import {
  createMockRateRules, createMockScaffolds, createMockOrders,
  createMockWaitlist, createMockInvoices, createMockInventoryLogs,
  createMockNotifications
} from '@/services/mockData';
import {
  loadScaffolds, saveScaffolds, loadOrders, saveOrders,
  createRentalOrder, autoReleaseExpired, createScaffold,
  loadRateRules, saveRateRules, loadActiveRuleId, saveActiveRuleId,
  loadInventoryLogs, saveInventoryLogs, pickupOrder, returnOrder,
  processStatusTransitions
} from '@/services/scheduleService';
import {
  loadWaitlist, saveWaitlist, loadNotifications, saveNotifications,
  addToWaitlist, notifyNextCandidate, confirmWaitlistEntry,
  cancelWaitlistEntry, expireNotifiedEntries
} from '@/services/waitlistService';
import {
  loadInvoices, saveInvoices, generateInvoice, issueInvoice, markInvoicePaid
} from '@/services/invoiceService';
import { calculateRentalFee } from '@/services/billingService';

interface AppState {
  rateRules: RateRule[];
  activeRuleId: string | null;
  scaffolds: Scaffold[];
  rentalOrders: RentalOrder[];
  waitlist: WaitlistEntry[];
  invoices: Invoice[];
  inventoryLogs: InventoryLog[];
  notifications: NotificationLog[];
  initialized: boolean;

  initStore: () => void;
  setActiveRule: (id: string) => void;
  addRateRule: (rule: RateRule) => void;
  updateRateRule: (id: string, updates: Partial<RateRule>) => void;
  
  addScaffold: (data: Omit<Scaffold, 'id' | 'createdAt' | 'status'> & { status?: ScaffoldStatus }) => void;
  updateScaffold: (id: string, updates: Partial<Scaffold>) => void;
  deleteScaffold: (id: string) => void;
  
  createRental: (data: Omit<RentalOrder, 'id' | 'status' | 'createdAt' | 'billingResult' | 'totalAmount' | 'startTime' | 'endTime' | 'quantity'> & { startTime: Date; endTime: Date; quantity: number }) => BillingResult;
  pickupRental: (orderId: string) => void;
  returnRental: (orderId: string) => void;

  recalculateOrderBilling: (orderId: string) => BillingResult | null;
  
  addWaitlistEntry: (entry: Omit<WaitlistEntry, 'id' | 'status' | 'createdAt'>) => void;
  processWaitlistNotification: (scaffoldType: string, availableQuantity: number) => void;
  confirmWaitlist: (entryId: string) => void;
  cancelWaitlist: (entryId: string) => void;
  
  createInvoice: (orderId: string) => void;
  issueInvoiceById: (invoiceId: string) => void;
  payInvoice: (invoiceId: string) => void;
  
  addInventoryLog: (log: InventoryLog) => void;
  
  processAutoRelease: () => { released: RentalOrder[]; expiredWaitlist: WaitlistEntry[]; newNotifications: NotificationLog[] };
}

const INIT_KEY = 'scaffold_rental_initialized_v4';

export const useAppStore = create<AppState>((set, get) => ({
  rateRules: [],
  activeRuleId: null,
  scaffolds: [],
  rentalOrders: [],
  waitlist: [],
  invoices: [],
  inventoryLogs: [],
  notifications: [],
  initialized: false,

  initStore: () => {
    const state = get();
    if (state.initialized) return;

    const isInitialized = localStorage.getItem(INIT_KEY);
    
    if (!isInitialized) {
      const rateRules = createMockRateRules();
      const scaffolds = createMockScaffolds();
      const rentalOrders = createMockOrders(rateRules, scaffolds);
      const waitlist = createMockWaitlist();
      const invoices = createMockInvoices(rentalOrders);
      const inventoryLogs = createMockInventoryLogs(scaffolds);
      const notifications = createMockNotifications(waitlist);
      const activeRuleId = rateRules.find(r => r.isActive)?.id || null;

      saveScaffolds(scaffolds);
      saveOrders(rentalOrders);
      saveWaitlist(waitlist);
      saveInvoices(invoices);
      saveNotifications(notifications);
      saveRateRules(rateRules);
      saveActiveRuleId(activeRuleId);
      saveInventoryLogs(inventoryLogs);
      localStorage.setItem(INIT_KEY, '1');

      set({
        rateRules,
        activeRuleId,
        scaffolds,
        rentalOrders,
        waitlist,
        invoices,
        inventoryLogs,
        notifications,
        initialized: true,
      });
    } else {
      const storedRateRules = loadRateRules();
      const storedActiveRuleId = loadActiveRuleId();
      const scaffolds = loadScaffolds();
      const rentalOrders = loadOrders();
      const waitlist = loadWaitlist();
      const invoices = loadInvoices();
      const notifications = loadNotifications();
      const inventoryLogs = loadInventoryLogs();

      const mockRateRules = createMockRateRules();
      const mockScaffolds = createMockScaffolds();
      const mockOrders = createMockOrders(mockRateRules, mockScaffolds);

      set({
        rateRules: storedRateRules.length > 0 ? storedRateRules : mockRateRules,
        activeRuleId: storedActiveRuleId || mockRateRules.find(r => r.isActive)?.id || null,
        scaffolds: scaffolds.length > 0 ? scaffolds : mockScaffolds,
        rentalOrders: rentalOrders.length > 0 ? rentalOrders : mockOrders,
        waitlist: waitlist.length > 0 ? waitlist : createMockWaitlist(),
        invoices: invoices.length > 0 ? invoices : createMockInvoices(rentalOrders.length > 0 ? rentalOrders : mockOrders),
        inventoryLogs: inventoryLogs.length > 0 ? inventoryLogs : createMockInventoryLogs(scaffolds.length > 0 ? scaffolds : mockScaffolds),
        notifications: notifications.length > 0 ? notifications : createMockNotifications(waitlist.length > 0 ? waitlist : createMockWaitlist()),
        initialized: true,
      });
    }
  },

  setActiveRule: (id: string) => {
    const rateRules = get().rateRules.map(r => ({
      ...r,
      isActive: r.id === id,
    }));
    saveRateRules(rateRules);
    saveActiveRuleId(id);
    set({ rateRules, activeRuleId: id });
  },

  addRateRule: (rule: RateRule) => {
    const rateRules = [...get().rateRules, rule];
    saveRateRules(rateRules);
    set({ rateRules });
  },

  updateRateRule: (id: string, updates: Partial<RateRule>) => {
    const rateRules = get().rateRules.map(r => r.id === id ? { ...r, ...updates } : r);
    saveRateRules(rateRules);
    const newActive = rateRules.find(r => r.isActive);
    if (newActive) saveActiveRuleId(newActive.id);
    set({ rateRules, activeRuleId: newActive?.id || null });
  },

  addScaffold: (data) => {
    const scaffold = createScaffold(data);
    const scaffolds = [...get().scaffolds, scaffold];
    saveScaffolds(scaffolds);
    set({ scaffolds });
  },

  updateScaffold: (id, updates) => {
    const scaffolds = get().scaffolds.map(s => s.id === id ? { ...s, ...updates } : s);
    saveScaffolds(scaffolds);
    set({ scaffolds });
  },

  deleteScaffold: (id) => {
    const scaffolds = get().scaffolds.filter(s => s.id !== id);
    saveScaffolds(scaffolds);
    set({ scaffolds });
  },

  createRental: (data) => {
    const { startTime, endTime, quantity, ...rest } = data;
    const activeRule = get().rateRules.find(r => r.id === get().activeRuleId);
    if (!activeRule) throw new Error('No active rate rule');

    const billingResult = calculateRentalFee(startTime, endTime, quantity, activeRule);
    
    const orderData = {
      ...rest,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      quantity,
    };
    const order = createRentalOrder(orderData);
    const now = new Date();
    if (startTime > now) {
      order.status = 'pending';
    }
    order.billingResult = billingResult;
    order.totalAmount = billingResult.totalAmount;

    const rentalOrders = [...get().rentalOrders, order];
    saveOrders(rentalOrders);

    set({ rentalOrders });
    return billingResult;
  },

  pickupRental: (orderId) => {
    const state = get();
    const order = state.rentalOrders.find(o => o.id === orderId);
    if (!order) return;

    if (order.status !== 'pending' && order.status !== 'active') return;

    const hasPickupLog = state.inventoryLogs.some(l => l.relatedOrderId === order.id && l.source === 'rental_out');
    if (hasPickupLog) {
      alert('该订单已办理取架，不可重复操作');
      return;
    }

    const updatedOrder = pickupOrder(order);
    const rentalOrders = state.rentalOrders.map(o => o.id === orderId ? updatedOrder : o);
    saveOrders(rentalOrders);

    const scaffold = state.scaffolds.find(s => s.id === order.scaffoldId);
    const inventoryLogs = [...state.inventoryLogs];
    const scaffolds = [...state.scaffolds];

    if (scaffold) {
      if (scaffold.poleCount <= 0) {
        alert('当前脚手架杆件数为0，无法出库，请检查库存');
        return;
      }
      const change = -scaffold.poleCount;
      const poleAfter = 0;
      const invLog: InventoryLog = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        scaffoldId: scaffold.id,
        scaffoldCode: scaffold.code,
        action: 'out',
        source: 'rental_out',
        poleChange: change,
        poleAfter,
        createdAt: new Date().toISOString(),
        operator: '系统',
        relatedOrderId: order.id,
        notes: `取架出库 - ${order.customerName}`,
      };
      inventoryLogs.unshift(invLog);
      saveInventoryLogs(inventoryLogs);

      const updatedScaffolds = scaffolds.map(s => s.id === scaffold.id ? { ...s, poleCount: poleAfter } : s);
      saveScaffolds(updatedScaffolds);
      set({ rentalOrders, inventoryLogs, scaffolds: updatedScaffolds });
    } else {
      set({ rentalOrders });
    }
  },

  returnRental: (orderId) => {
    const state = get();
    const order = state.rentalOrders.find(o => o.id === orderId);
    if (!order) return;

    if (order.status !== 'active' && order.status !== 'overdue') return;

    const hasReturnLog = state.inventoryLogs.some(l => l.relatedOrderId === order.id && (l.source === 'rental_in' || l.source === 'auto_release'));
    if (hasReturnLog) {
      alert('该订单已办理归还或已释放，不可重复操作');
      return;
    }

    const pickupLog = state.inventoryLogs.find(l => l.relatedOrderId === order.id && l.source === 'rental_out');
    const expectedReturnQuantity = pickupLog ? Math.abs(pickupLog.poleChange) : order.quantity;

    const updatedOrder = returnOrder(order);
    const activeRule = state.rateRules.find(r => r.id === state.activeRuleId);
    if (activeRule) {
      const actualStart = order.actualStartTime ? new Date(order.actualStartTime) : new Date(order.startTime);
      const actualEnd = new Date(updatedOrder.actualEndTime!);
      const finalBilling = calculateRentalFee(actualStart, actualEnd, order.quantity, activeRule);
      updatedOrder.finalBillingResult = finalBilling;
      updatedOrder.finalAmount = finalBilling.totalAmount;
    }

    const rentalOrders = state.rentalOrders.map(o => o.id === orderId ? updatedOrder : o);
    saveOrders(rentalOrders);

    const scaffold = state.scaffolds.find(s => s.id === order.scaffoldId);
    const inventoryLogs = [...state.inventoryLogs];
    const scaffolds = [...state.scaffolds];

    if (scaffold) {
      const change = expectedReturnQuantity;
      const poleAfter = scaffold.poleCount + change;
      const invLog: InventoryLog = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        scaffoldId: scaffold.id,
        scaffoldCode: scaffold.code,
        action: 'in',
        source: 'rental_in',
        poleChange: change,
        poleAfter,
        createdAt: new Date().toISOString(),
        operator: '系统',
        relatedOrderId: order.id,
        notes: `归还入库 - ${order.customerName}`,
      };
      inventoryLogs.unshift(invLog);
      saveInventoryLogs(inventoryLogs);

      const updatedScaffolds = scaffolds.map(s => s.id === scaffold.id ? { ...s, poleCount: poleAfter } : s);
      saveScaffolds(updatedScaffolds);
      set({ rentalOrders, inventoryLogs, scaffolds: updatedScaffolds });
    } else {
      set({ rentalOrders });
    }
  },

  recalculateOrderBilling: (orderId) => {
    const state = get();
    const order = state.rentalOrders.find(o => o.id === orderId);
    if (!order) return null;
    const activeRule = state.rateRules.find(r => r.id === state.activeRuleId);
    if (!activeRule) return null;

    const actualStart = order.actualStartTime ? new Date(order.actualStartTime) : new Date(order.startTime);
    const actualEnd = order.actualEndTime ? new Date(order.actualEndTime) : new Date(order.endTime);
    return calculateRentalFee(actualStart, actualEnd, order.quantity, activeRule);
  },

  addWaitlistEntry: (entry) => {
    const waitlist = [...get().waitlist, addToWaitlist(entry)];
    saveWaitlist(waitlist);
    set({ waitlist });
  },

  processWaitlistNotification: (scaffoldType, availableQuantity) => {
    const result = notifyNextCandidate(get().waitlist, scaffoldType, availableQuantity);
    if (result.notification) {
      const notifications = [...get().notifications, result.notification];
      saveNotifications(notifications);
      set({ waitlist: result.waitlist, notifications });
    }
  },

  confirmWaitlist: (entryId) => {
    const result = confirmWaitlistEntry(get().waitlist, entryId);
    saveWaitlist(result.waitlist);
    set({ waitlist: result.waitlist });
  },

  cancelWaitlist: (entryId) => {
    const waitlist = cancelWaitlistEntry(get().waitlist, entryId);
    saveWaitlist(waitlist);
    set({ waitlist });
  },

  createInvoice: (orderId) => {
    const state = get();
    const order = state.rentalOrders.find(o => o.id === orderId);
    if (!order) return;

    let finalBilling: BillingResult;
    let originalBilling: BillingResult | undefined;

    if (order.finalBillingResult) {
      finalBilling = order.finalBillingResult;
      originalBilling = order.billingResult;
    } else {
      const recalc = state.recalculateOrderBilling(orderId);
      finalBilling = recalc || order.billingResult!;
      originalBilling = order.billingResult && recalc ? order.billingResult : undefined;
    }

    const originalAmount = originalBilling?.totalAmount;
    const finalAmount = finalBilling.totalAmount;

    const invoice: Invoice = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      orderId: order.id,
      customerName: order.customerName,
      billingResult: finalBilling,
      originalBillingResult: originalBilling,
      createdAt: new Date().toISOString(),
      status: 'draft',
      totalAmount: finalAmount,
      originalAmount,
      amountDiff: originalAmount !== undefined ? finalAmount - originalAmount : undefined,
    };

    const invoices = [...state.invoices, invoice];
    saveInvoices(invoices);
    set({ invoices });
  },

  issueInvoiceById: (invoiceId) => {
    const invoices = get().invoices.map(i =>
      i.id === invoiceId ? issueInvoice(i) : i
    );
    saveInvoices(invoices);
    set({ invoices });
  },

  payInvoice: (invoiceId) => {
    const invoices = get().invoices.map(i =>
      i.id === invoiceId ? markInvoicePaid(i) : i
    );
    saveInvoices(invoices);
    set({ invoices });
  },

  addInventoryLog: (log) => {
    const inventoryLogs = [log, ...get().inventoryLogs];
    saveInventoryLogs(inventoryLogs);
    set({ inventoryLogs });
  },

  processAutoRelease: () => {
    const state = get();
    const statusResult = processStatusTransitions(state.rentalOrders);
    const expireResult = expireNotifiedEntries(state.waitlist);
    
    let finalOrders = statusResult.orders;
    let finalWaitlist = expireResult.waitlist;
    let finalNotifications = [...state.notifications, ...expireResult.newNotifications];
    let finalScaffolds = [...state.scaffolds];
    let finalInventoryLogs = [...state.inventoryLogs];

    if (statusResult.toReleased.length > 0) {
      for (const released of statusResult.toReleased) {
        const { waitlist: wl, notification: notif } = notifyNextCandidate(
          finalWaitlist,
          released.scaffoldType,
          released.quantity
        );
        finalWaitlist = wl;
        if (notif) finalNotifications.push(notif);

        const scaffold = finalScaffolds.find(s => s.id === released.scaffoldId);
        if (scaffold) {
          const originalScaffold = createMockScaffolds().find(ms => ms.id === scaffold.id);
          const change = originalScaffold ? originalScaffold.poleCount : released.quantity;
          const poleAfter = scaffold.poleCount + change;
          const invLog: InventoryLog = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2) + released.id,
            scaffoldId: scaffold.id,
            scaffoldCode: scaffold.code,
            action: 'in',
            source: 'auto_release',
            poleChange: change,
            poleAfter,
            createdAt: new Date().toISOString(),
            operator: '系统',
            relatedOrderId: released.id,
            notes: `超时释放自动入库 - ${released.customerName}`,
          };
          finalInventoryLogs.unshift(invLog);
          finalScaffolds = finalScaffolds.map(s => s.id === scaffold.id ? { ...s, poleCount: poleAfter } : s);
        }
      }
    }

    if (statusResult.toActive.length > 0) {
      for (const activated of statusResult.toActive) {
        const scaffold = finalScaffolds.find(s => s.id === activated.scaffoldId);
        if (scaffold && scaffold.poleCount > 0) {
          const change = -scaffold.poleCount;
          const poleAfter = 0;
          const invLog: InventoryLog = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2) + activated.id,
            scaffoldId: scaffold.id,
            scaffoldCode: scaffold.code,
            action: 'out',
            source: 'rental_out',
            poleChange: change,
            poleAfter,
            createdAt: new Date().toISOString(),
            operator: '系统',
            relatedOrderId: activated.id,
            notes: `预约到点自动出库 - ${activated.customerName}`,
          };
          finalInventoryLogs.unshift(invLog);
          finalScaffolds = finalScaffolds.map(s => s.id === scaffold.id ? { ...s, poleCount: poleAfter } : s);
        }
      }
    }

    saveOrders(finalOrders);
    saveScaffolds(finalScaffolds);
    saveWaitlist(finalWaitlist);
    saveNotifications(finalNotifications);
    saveInventoryLogs(finalInventoryLogs);

    set({
      rentalOrders: finalOrders,
      scaffolds: finalScaffolds,
      waitlist: finalWaitlist,
      notifications: finalNotifications,
      inventoryLogs: finalInventoryLogs,
    });

    return {
      released: statusResult.toReleased,
      expiredWaitlist: expireResult.expired,
      newNotifications: expireResult.newNotifications,
    };
  },
}));
