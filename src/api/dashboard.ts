import { api } from '@/api/client';

export type DashboardMetric = {
  key: string;
  label: string;
  value: number;
  suffix: string | null;
  hint: string;
};

export type SetupStep = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  action: string | null;
};

export type SetupChecklist = {
  title: string;
  intro: string;
  done: number;
  total: number;
  steps: SetupStep[];
};

export type DashboardDeadline = {
  period: string;
  starts_at: string;
  due_at: string;
  state: 'upcoming' | 'active' | 'paused' | 'overdue' | 'closed';
  days_until_start: number;
  days_until_due: number;
  convocation_id: string | null;
};

export type CoordinationConvocation = {
  process_id: string;
  period: string;
  convocation_id: string | null;
  can_open: boolean;
};

export type Dashboard = {
  metrics: DashboardMetric[];
  setup: SetupChecklist | null;
  deadline: DashboardDeadline | null;
  coordination_convocation: CoordinationConvocation | null;
};

export const getDashboard = () => api<Dashboard>('/dashboard');
