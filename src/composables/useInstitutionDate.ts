import { parseDate, type CalendarDate } from '@internationalized/date';
import { computed, type ComputedRef } from 'vue';
import { sessionState } from '@/state/session';

const localToday = (): string => {
  const now = new Date();

  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const useInstitutionToday = (): ComputedRef<string> =>
  computed(() => sessionState.current.value?.institution?.today ?? localToday());

export const useInstitutionCalendarDate = (): ComputedRef<CalendarDate> =>
  computed(() => parseDate(useInstitutionToday().value));
