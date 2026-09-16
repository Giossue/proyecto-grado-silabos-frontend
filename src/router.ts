import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '@/pages/LoginPage.vue';
import WorkspacePage from '@/pages/WorkspacePage.vue';
import DashboardPage from '@/pages/DashboardPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/ingresar', component: LoginPage, meta: { guest: true } },
    { path: '/', component: WorkspacePage, meta: { requiresAuth: true } },
    { path: '/panel', component: DashboardPage, meta: { requiresAuth: true } },
  ],
});
