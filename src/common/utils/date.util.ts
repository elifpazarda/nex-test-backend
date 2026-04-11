import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export const DateUtil = {
  now(): string {
    return dayjs.utc().toISOString();
  },

  format(date: Date | string): string {
    return dayjs.utc(date).toISOString();
  },

  toReadable(date: Date | string): string {
    return dayjs.utc(date).format('YYYY-MM-DD HH:mm:ss');
  },
};
