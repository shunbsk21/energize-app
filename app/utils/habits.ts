import { Habit } from '../types';

export const normalizeKey = (d: string | Date): string => {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    dt.setHours(0, 0, 0, 0);
    return dt.toLocaleDateString('sv-SE');
  } catch {
    return String(d);
  }
};

export const isHabitScheduledForDate = (habit: Habit, date: Date): boolean => {
  if (!habit.startDate) return false;
  const habitStartDate = new Date(habit.startDate);
  habitStartDate.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate < habitStartDate) return false;

  switch (habit.frequencyType) {
    case 'daily':
      return true;
    case 'weekly':
      return (habit.frequencyValue || []).includes(targetDate.getDay());
    case 'monthly':
      return (habit.frequencyValue || []).includes(targetDate.getDate());
    default:
      return false;
  }
};

export const getDoneSetForHabit = (habit: Habit): Set<string> => {
  if (habit.type === 'amount') {
    const amtMap = habit.completedAmounts || {};
    const target = habit.target ?? 0;
    const keys: string[] = [];
    Object.entries(amtMap).forEach(([rawKey, rawVal]) => {
      const key = normalizeKey(rawKey);
      const v = Number(rawVal);
      if (Number.isNaN(v)) return;
      if (target > 0 ? v >= target : v > 0) keys.push(key);
    });
    (habit.completedDates || []).forEach(d => keys.push(normalizeKey(d)));
    return new Set(keys);
  }
  return new Set((habit.completedDates || []).map(normalizeKey));
};

export const isHabitCompletedOnDate = (habit: Habit, dateKey: string): boolean => {
  const normalizedDateKey = normalizeKey(dateKey);
  if (habit.type === 'amount') {
    const amount = (habit.completedAmounts || {})[normalizedDateKey] ?? 0;
    const target = habit.target ?? 0;
    return target > 0 ? amount >= target : amount > 0;
  }
  return (habit.completedDates || []).map(normalizeKey).includes(normalizedDateKey);
};

export const calculateCompletionStatus = (date: Date, habits: Habit[]): 'none' | 'partial' | 'full' => {
  const dateStr = normalizeKey(date);
  const scheduledHabits = habits.filter(h => {
    if (!isHabitScheduledForDate(h, date)) return false;
    const skipped = (h.skippedDates || []).map(normalizeKey);
    return !skipped.includes(dateStr);
  });

  if (scheduledHabits.length === 0) return 'none';

  const completedCount = scheduledHabits.filter(h => isHabitCompletedOnDate(h, dateStr)).length;

  if (completedCount === 0) return 'none';
  if (completedCount === scheduledHabits.length) return 'full';
  return 'partial';
};

export const calculateCompletionPercentForDate = (date: Date, habitsList: Habit[]): number => {
  const dateStr = normalizeKey(date);
  const scheduled = habitsList.filter(h => {
    if (!isHabitScheduledForDate(h, date)) return false;
    const skipped = (h.skippedDates || []).map(normalizeKey);
    return !skipped.includes(dateStr);
  });
  if (scheduled.length === 0) return 0;
  const completedCount = scheduled.filter(h => isHabitCompletedOnDate(h, dateStr)).length;
  return Math.round((completedCount / scheduled.length) * 100);
};

const parseKeyToDate = (k: string): Date | null => {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
    const m = String(k).match(ymd);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
      const dt = new Date(y, mo, d); dt.setHours(0,0,0,0); return dt;
    }
    const dt = new Date(k);
    if (!Number.isNaN(dt.getTime())) { dt.setHours(0,0,0,0); return dt; }
    return null;
};

const getStreakStartDate = (habit: Habit, doneSet: Set<string>, skipSet: Set<string>): Date => {
    const allKeys = [...Array.from(doneSet), ...Array.from(skipSet)];
    const parsedDates = allKeys.map(k => parseKeyToDate(k)).filter(Boolean) as Date[];
    let startFromHabit = habit.startDate ? parseKeyToDate(habit.startDate) : null;
    if (startFromHabit) startFromHabit.setHours(0,0,0,0);
    let earliestRecorded: Date | null = null;
    if (parsedDates.length > 0) {
      earliestRecorded = parsedDates.reduce((a,b) => a.getTime() <= b.getTime() ? a : b);
      earliestRecorded.setHours(0,0,0,0);
    }
    if (startFromHabit && earliestRecorded) {
      return (earliestRecorded.getTime() < startFromHabit.getTime()) ? earliestRecorded : startFromHabit;
    } else if (startFromHabit) {
      return startFromHabit;
    } else if (earliestRecorded) {
      return earliestRecorded;
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    return today;
};

export const calculateCurrentStreak = (habit: Habit): number => {
  const doneSet = getDoneSetForHabit(habit);
  if (!doneSet || doneSet.size === 0) return 0;

  const skipSet = new Set((habit.skippedDates || []).map(normalizeKey));
  const start = getStreakStartDate(habit, doneSet, skipSet);

  const isScheduled = (date: Date) => {
    if (date < start) return false;
    const key = normalizeKey(date);
    if (doneSet.has(key) || skipSet.has(key)) return true;
    return isHabitScheduledForDate(habit, date);
  };

  const today = new Date(); today.setHours(0,0,0,0);
  let lastRecordedScheduled: Date | null = null;
  for (let d = new Date(today); d >= start; d.setDate(d.getDate() - 1)) {
    if (!isScheduled(d)) continue;
    const k = normalizeKey(d);
    if (doneSet.has(k) || skipSet.has(k)) { lastRecordedScheduled = new Date(d); break; }
  }
  if (!lastRecordedScheduled) return 0;

  for (let d = new Date(lastRecordedScheduled); d <= today; d.setDate(d.getDate() + 1)) {
    if (d.getTime() === lastRecordedScheduled.getTime()) continue;
    if (!isScheduled(d)) continue;
    const key = normalizeKey(d);
    if (!doneSet.has(key) && !skipSet.has(key)) {
      return 0;
    }
  }

  let streak = 0;
  for (let cur = new Date(lastRecordedScheduled); cur >= start; cur.setDate(cur.getDate() - 1)) {
    if (!isScheduled(cur)) continue;
    const key = normalizeKey(cur);
    if (doneSet.has(key)) { streak++; continue; }
    if (skipSet.has(key)) { continue; }
    break;
  }
  return streak;
};

export const calculateLongestStreak = (habit: Habit): number => {
  const doneSet = getDoneSetForHabit(habit);
  const skipSet = new Set((habit.skippedDates || []).map(normalizeKey));
  if (!doneSet || doneSet.size === 0) return 0;

  const start = getStreakStartDate(habit, doneSet, skipSet);
  const end = new Date(); end.setHours(0,0,0,0);

  const isScheduled = (date: Date) => {
    if (date < start) return false;
    const key = normalizeKey(date);
    if (doneSet.has(key) || skipSet.has(key)) return true;
    return isHabitScheduledForDate(habit, date);
  };

  const scheduledDates: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isScheduled(d)) scheduledDates.push(new Date(d));
  }

  let longest = 0;
  let currentStreak = 0;
  for (const d of scheduledDates) {
    const key = normalizeKey(d);
    if (doneSet.has(key)) {
      currentStreak++;
    } else if (!skipSet.has(key)) {
      longest = Math.max(longest, currentStreak);
      currentStreak = 0;
    }
  }
  longest = Math.max(longest, currentStreak);
  return longest;
};
