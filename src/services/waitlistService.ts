import { WaitlistEntry, WaitlistStatus, NotificationLog } from '@/types';
import { parseISO, isAfter } from 'date-fns';

const STORAGE_KEYS = {
  WAITLIST: 'scaffold_rentals_waitlist',
  NOTIFICATIONS: 'scaffold_rentals_notifications',
};

export function loadWaitlist(): WaitlistEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WAITLIST);
    if (stored) return JSON.parse(stored) as WaitlistEntry[];
  } catch (e) {
    console.error('Failed to load waitlist:', e);
  }
  return [];
}

export function saveWaitlist(waitlist: WaitlistEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WAITLIST, JSON.stringify(waitlist));
  } catch (e) {
    console.error('Failed to save waitlist:', e);
  }
}

export function loadNotifications(): NotificationLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (stored) return JSON.parse(stored) as NotificationLog[];
  } catch (e) {
    console.error('Failed to load notifications:', e);
  }
  return [];
}

export function saveNotifications(notifications: NotificationLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function addToWaitlist(
  entry: Omit<WaitlistEntry, 'id' | 'status' | 'createdAt'>
): WaitlistEntry {
  return {
    ...entry,
    id: generateId(),
    status: 'waiting',
    createdAt: new Date().toISOString(),
  };
}

export function getSortedWaitlist(waitlist: WaitlistEntry[]): WaitlistEntry[] {
  return [...waitlist]
    .filter(e => e.status === 'waiting' || e.status === 'notified')
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
    });
}

export function getWaitlistByType(
  waitlist: WaitlistEntry[],
  scaffoldType: string
): WaitlistEntry[] {
  return getSortedWaitlist(waitlist).filter(e => e.scaffoldType === scaffoldType);
}

export function notifyNextCandidate(
  waitlist: WaitlistEntry[],
  scaffoldType: string,
  availableQuantity: number
): { waitlist: WaitlistEntry[]; notified: WaitlistEntry | null; notification: NotificationLog | null } {
  const candidates = getWaitlistByType(waitlist, scaffoldType)
    .filter(e => e.status === 'waiting' && e.quantity <= availableQuantity);

  if (candidates.length === 0) {
    return { waitlist, notified: null, notification: null };
  }

  const next = candidates[0];
  const now = new Date();

  const updatedWaitlist = waitlist.map(e =>
    e.id === next.id
      ? { ...e, status: 'notified' as WaitlistStatus, notifiedAt: now.toISOString() }
      : e
  );

  const notification: NotificationLog = {
    id: generateId(),
    waitlistEntryId: next.id,
    customerName: next.customerName,
    scaffoldType,
    quantity: next.quantity,
    sentAt: now.toISOString(),
    method: 'system',
    status: 'sent',
    message: `尊敬的${next.customerName}，您候补的${scaffoldType}脚手架（数量${next.quantity}）已有空位，请在30分钟内确认，否则将自动释放给下一位候补客户。`,
  };

  return { waitlist: updatedWaitlist, notified: next, notification };
}

export function confirmWaitlistEntry(
  waitlist: WaitlistEntry[],
  entryId: string
): { waitlist: WaitlistEntry[]; confirmed: WaitlistEntry | null } {
  const entry = waitlist.find(e => e.id === entryId);
  if (!entry) return { waitlist, confirmed: null };

  const updatedWaitlist = waitlist.map(e =>
    e.id === entryId
      ? { ...e, status: 'confirmed' as WaitlistStatus, confirmedAt: new Date().toISOString() }
      : e
  );

  return { waitlist: updatedWaitlist, confirmed: entry };
}

export function cancelWaitlistEntry(
  waitlist: WaitlistEntry[],
  entryId: string
): WaitlistEntry[] {
  return waitlist.map(e =>
    e.id === entryId ? { ...e, status: 'cancelled' as WaitlistStatus } : e
  );
}

export function expireNotifiedEntries(waitlist: WaitlistEntry[]): {
  waitlist: WaitlistEntry[];
  expired: WaitlistEntry[];
  newNotifications: NotificationLog[];
} {
  const expired: WaitlistEntry[] = [];
  const newNotifications: NotificationLog[] = [];
  const now = new Date();
  const thirtyMinutes = 30 * 60 * 1000;

  const updatedWaitlist = waitlist.map(e => {
    if (e.status === 'notified' && e.notifiedAt) {
      const notifiedTime = parseISO(e.notifiedAt);
      if (now.getTime() - notifiedTime.getTime() > thirtyMinutes) {
        expired.push(e);
        newNotifications.push({
          id: generateId(),
          waitlistEntryId: e.id,
          customerName: e.customerName,
          scaffoldType: e.scaffoldType,
          quantity: e.quantity,
          sentAt: now.toISOString(),
          method: 'system',
          status: 'sent',
          message: `${e.customerName}，您的候补资格已超时取消，已将资源分配给下一位候补客户。`,
        });
        return { ...e, status: 'expired' as WaitlistStatus };
      }
    }
    return e;
  });

  return { waitlist: updatedWaitlist, expired, newNotifications };
}

export function getWaitingCount(waitlist: WaitlistEntry[]): number {
  return waitlist.filter(e => e.status === 'waiting').length;
}
