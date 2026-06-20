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
  createRentalOrder, autoReleaseExpired, createScaffold
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

const INIT_KEY = 'scaffold_rental_initialized_v1';

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

      saveScaffolds(scaffolds);
      saveOrders(rentalOrders);
      saveWaitlist(waitlist);
      saveInvoices(invoices);
      saveNotifications(notifications);
      localStorage.setItem(INIT_KEY, '1');

      set({
        rateRules,
        activeRuleId: rateRules.find(r => r.isActive)?.id || null,
        scaffolds,
        rentalOrders,
        waitlist,
        invoices,
        inventoryLogs,
        notifications,
        initialized: true,
      });
    } else {
      const rateRules = createMockRateRules();
      const scaffolds = loadScaffolds();
      const rentalOrders = loadOrders();
      const waitlist = loadWaitlist();
      const invoices = loadInvoices();
      const notifications = loadNotifications();
      const inventoryLogs = createMockInventoryLogs(scaffolds.length > 0 ? scaffolds : createMockScaffolds());

      set({
        rateRules,
        activeRuleId: rateRules.find(r => r.isActive)?.id || null,
        scaffolds: scaffolds.length > 0 ? scaffolds : createMockScaffolds(),
        rentalOrders: rentalOrders.length > 0 ? rentalOrders : createMockOrders(rateRules, scaffolds.length > 0 ? scaffolds : createMockScaffolds()),
        waitlist: waitlist.length > 0 ? waitlist : createMockWaitlist(),
        invoices: invoices.length > 0 ? invoices : createMockInvoices(rentalOrders.length > 0 ? rentalOrders : createMockOrders(rateRules, scaffolds.length > 0 ? scaffolds : createMockScaffolds())),
        inventoryLogs,
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
    set({ rateRules, activeRuleId: id });
  },

  addRateRule: (rule: RateRule) => {
    set({ rateRules: [...get().rateRules, rule] });
  },

  updateRateRule: (id: string, updates: Partial<RateRule>) => {
    set({
      rateRules: get().rateRules.map(r => r.id === id ? { ...r, ...updates } : r),
    });
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
    order.billingResult = billingResult;
    order.totalAmount = billingResult.totalAmount;

    const rentalOrders = [...get().rentalOrders, order];
    saveOrders(rentalOrders);

    const scaffolds = get().scaffolds.map(s =>
      s.id === data.scaffoldId ? { ...s, status: 'rented' as ScaffoldStatus } : s
    );
    saveScaffolds(scaffolds);

    set({ rentalOrders, scaffolds });
    return billingResult;
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
    const order = get().rentalOrders.find(o => o.id === orderId);
    if (!order) return;
    const invoice = generateInvoice(order);
    const invoices = [...get().invoices, invoice];
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
    set({ inventoryLogs: [...get().inventoryLogs, log] });
  },

  processAutoRelease: () => {
    const state = get();
    const releaseResult = autoReleaseExpired(state.rentalOrders, state.scaffolds);
    const expireResult = expireNotifiedEntries(state.waitlist);
    
    let finalOrders = releaseResult.orders.length > 0 ? releaseResult.orders : state.rentalOrders;
    let finalWaitlist = expireResult.waitlist;
    let finalNotifications = [...state.notifications, ...expireResult.newNotifications];
    let finalScaffolds = releaseResult.scaffolds;

    for (const released of releaseResult.released) {
      const { waitlist: wl, notification: notif } = notifyNextCandidate(
        finalWaitlist,
        released.scaffoldType,
        released.quantity
      );
      finalWaitlist = wl;
      if (notif) finalNotifications.push(notif);
    }

    saveOrders(finalOrders.length > 0 ? finalOrders : state.rentalOrders);
    saveScaffolds(finalScaffolds.length > 0 ? finalScaffolds : state.scaffolds);
    saveWaitlist(finalWaitlist);
    saveNotifications(finalNotifications);

    set({
      rentalOrders: finalOrders.length > 0 ? finalOrders : state.rentalOrders,
      scaffolds: finalScaffolds.length > 0 ? finalScaffolds : state.scaffolds,
      waitlist: finalWaitlist,
      notifications: finalNotifications,
    });

    return {
      released: releaseResult.released,
      expiredWaitlist: expireResult.expired,
      newNotifications: expireResult.newNotifications,
    };
  },
}));
