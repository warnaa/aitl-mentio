/** Invalid or nonexistent wall times stay raw so the ISO schema reports the error. */
export function localDatetimeToInstant(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];
  const expected = value.split(/[-T:]/).map(Number);
  if (parts.some((part, index) => part !== expected[index])) return value;
  return date.toISOString();
}
