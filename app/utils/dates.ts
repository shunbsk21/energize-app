import { Timestamp } from 'firebase/firestore';

export const formatDateLabel = (iso: string): string => {
  try {
    const date = new Date(`${iso}T00:00:00`);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

export const formatFullDate = (d?: string): string => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const formatDateKey = (d: Date): string => d.toLocaleDateString('sv-SE');

export const formatDateForLabel = (dateValue: string | Date | Timestamp | undefined | null): string => {
  if (!dateValue) return new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  if (typeof dateValue === 'string' || dateValue instanceof Date) {
    return new Date(dateValue).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  }
  // Assuming it's a Firestore Timestamp
  return dateValue.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
};
