const numbers = new Intl.NumberFormat('en-US');
const days = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

export const number = (value: number) => numbers.format(value);
/** A day in UTC, the same on the server and in every browser. */
export const day = (value: Date | string) => days.format(new Date(value));
