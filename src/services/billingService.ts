import { RateType, TimeSlot, BillingSegment, BillingResult, RateRule } from '@/types';
import { parse, addMinutes, differenceInMinutes, isSameDay, format, setHours, setMinutes } from 'date-fns';

const RATE_LABELS: Record<RateType, string> = {
  peak: '高峰',
  normal: '平峰',
  valley: '低谷',
};

const RATE_COLORS: Record<RateType, string> = {
  peak: 'bg-industrial-peak',
  normal: 'bg-industrial-normal',
  valley: 'bg-industrial-valley',
};

export function getRateLabel(type: RateType): string {
  return RATE_LABELS[type];
}

export function getRateColor(type: RateType): string {
  return RATE_COLORS[type];
}

export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

export function createDateTime(baseDate: Date, timeStr: string): Date {
  const { hours, minutes } = parseTimeString(timeStr);
  return setMinutes(setHours(new Date(baseDate), hours), minutes);
}

export function findSlotForTime(slots: TimeSlot[], time: Date): TimeSlot | null {
  const timeStr = format(time, 'HH:mm');
  for (const slot of slots) {
    if (timeStr >= slot.startTime && timeStr < slot.endTime) {
      return slot;
    }
  }
  if (slots.length > 0) {
    const lastSlot = slots[slots.length - 1];
    if (timeStr >= lastSlot.startTime || timeStr < slots[0].startTime) {
      return lastSlot;
    }
  }
  return null;
}

export function getNextSlotChangeTime(slots: TimeSlot[], currentTime: Date): Date {
  const currentTimeStr = format(currentTime, 'HH:mm');
  const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (const slot of sortedSlots) {
    if (slot.startTime > currentTimeStr) {
      return createDateTime(currentTime, slot.startTime);
    }
  }

  const nextDay = new Date(currentTime);
  nextDay.setDate(nextDay.getDate() + 1);
  return createDateTime(nextDay, sortedSlots[0].startTime);
}

export function splitTimeByRateSlots(
  startTime: Date,
  endTime: Date,
  slots: TimeSlot[]
): BillingSegment[] {
  const segments: BillingSegment[] = [];
  let currentTime = new Date(startTime);

  while (currentTime < endTime) {
    const currentSlot = findSlotForTime(slots, currentTime);
    if (!currentSlot) {
      break;
    }

    const nextChangeTime = getNextSlotChangeTime(slots, currentTime);
    const segmentEnd = nextChangeTime < endTime ? nextChangeTime : endTime;
    const durationMinutes = differenceInMinutes(segmentEnd, currentTime);
    const durationHours = durationMinutes / 60;

    segments.push({
      rateType: currentSlot.rateType,
      startTime: new Date(currentTime),
      endTime: new Date(segmentEnd),
      durationHours,
      unitPrice: currentSlot.pricePerHour,
      subtotal: durationHours * currentSlot.pricePerHour,
    });

    currentTime = new Date(segmentEnd);
  }

  return segments;
}

export function aggregateSegments(segments: BillingSegment[]): BillingSegment[] {
  const aggregated: BillingSegment[] = [];
  const typeMap = new Map<RateType, BillingSegment>();

  for (const seg of segments) {
    const existing = typeMap.get(seg.rateType);
    if (existing) {
      existing.durationHours += seg.durationHours;
      existing.subtotal += seg.subtotal;
      existing.endTime = seg.endTime;
    } else {
      typeMap.set(seg.rateType, { ...seg });
    }
  }

  const order: RateType[] = ['peak', 'normal', 'valley'];
  for (const type of order) {
    const seg = typeMap.get(type);
    if (seg && seg.durationHours > 0) {
      aggregated.push(seg);
    }
  }

  return aggregated;
}

export function calculateRentalFee(
  startTime: Date,
  endTime: Date,
  quantity: number,
  rule: RateRule
): BillingResult {
  const rawSegments = splitTimeByRateSlots(startTime, endTime, rule.slots);
  const segments = rawSegments.map(s => ({
    ...s,
    subtotal: s.subtotal * quantity,
  }));

  const totalAmount = segments.reduce((sum, s) => sum + s.subtotal, 0);
  const totalHours = segments.reduce((sum, s) => sum + s.durationHours, 0);

  let peakHours = 0;
  let normalHours = 0;
  let valleyHours = 0;

  for (const s of segments) {
    if (s.rateType === 'peak') peakHours += s.durationHours;
    else if (s.rateType === 'normal') normalHours += s.durationHours;
    else if (s.rateType === 'valley') valleyHours += s.durationHours;
  }

  return {
    segments,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalHours,
    peakHours,
    normalHours,
    valleyHours,
  };
}

export function formatDuration(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}小时`;
  if (wholeHours === 0) return `${minutes}分钟`;
  return `${wholeHours}小时${minutes}分钟`;
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}
