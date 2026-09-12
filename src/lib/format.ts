export function timezoneLabel(now = new Date()): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  }).formatToParts(now)
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? 'Local'
}

export function formatClock(now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(now)
}

export function formatTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

/** `HH:MM` for `<input type="time">`, using the local clock. */
export function formatTimeInput(value: number | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
