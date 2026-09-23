const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const parseDate = (value: string): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.getUTCFullYear() === Number(match[1])
        && date.getUTCMonth() === Number(match[2]) - 1
        && date.getUTCDate() === Number(match[3])
        ? date
        : null;
};

const mondayOf = (date: Date): Date => {
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    return new Date(date.getTime() - daysSinceMonday * DAY_MS);
};

/** Counts the Monday-to-Sunday calendar weeks touched by the inclusive range. */
export const calculateAcademicPeriodWeeks = (startsOn: string, endsOn: string): number | null => {
    const start = parseDate(startsOn);
    const end = parseDate(endsOn);
    if (!start || !end || end < start) return null;

    const firstMonday = mondayOf(start);
    const lastMonday = mondayOf(end);
    return Math.floor((lastMonday.getTime() - firstMonday.getTime()) / WEEK_MS) + 1;
};
