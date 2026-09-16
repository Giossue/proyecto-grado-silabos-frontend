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

export type Dashboard = {
  metrics: DashboardMetric[];
  setup: SetupChecklist | null;
  faculty_logo: { name: string; current_url: string; configured: boolean } | null;
};

export const getDashboard = () => api<Dashboard>('/dashboard');
