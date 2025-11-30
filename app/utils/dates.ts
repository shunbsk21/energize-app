export const formatLocalISO = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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
