import type { DashboardDeadline } from '@/api/dashboard';

export const deadlineElapsed = (deadline: DashboardDeadline): number => {
  if (['overdue', 'closed'].includes(deadline.state)) return 100;
  if (deadline.state === 'upcoming') return 0;
  const total = Math.round((Date.parse(deadline.due_at) - Date.parse(deadline.starts_at)) / 86_400_000);
  if (!Number.isFinite(total) || total <= 0) return 100;
  const done = total - Math.max(0, deadline.days_until_due);
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
};
