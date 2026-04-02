const TASHKENT_OFFSET_HOURS = 5;
const TASHKENT_OFFSET_MS = TASHKENT_OFFSET_HOURS * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isDateOnlyString = (value: string) => DATE_ONLY_PATTERN.test(value);

export const parseDateOnlyInTashkent = (value: string, endOfDay = false) => {
  const [year, month, day] = value.split('-').map(Number);
  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;
  const millisecond = endOfDay ? 999 : 0;

  return new Date(Date.UTC(year, month - 1, day, hour - TASHKENT_OFFSET_HOURS, minute, second, millisecond));
};

export const parseDateInputInTashkent = (
  value: string,
  options?: { endOfDay?: boolean },
) => {
  const trimmed = value.trim();
  if (isDateOnlyString(trimmed)) {
    return parseDateOnlyInTashkent(trimmed, options?.endOfDay ?? false);
  }

  return new Date(trimmed);
};

export const toTashkentDateKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
};

export const getTashkentTodayKey = (base = new Date()) => toTashkentDateKey(base);

export const getTashkentMonthStartKey = (base = new Date()) => {
  const currentKey = toTashkentDateKey(base);
  return `${currentKey.slice(0, 7)}-01`;
};
