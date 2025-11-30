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
