export function formatInstant(value: string, timeZone: string): string {
  return (
    new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(
      new Date(value),
    ) + ` (${timeZone})`
  );
}
