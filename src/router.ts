import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '@/pages/LoginPage.vue';
import WorkspacePage from '@/pages/WorkspacePage.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import TeacherSyllabiPage from '@/pages/TeacherSyllabiPage.vue';
import TeacherSyllabusDetailPage from '@/pages/TeacherSyllabusDetailPage.vue';
import PasswordRecoveryPage from '@/pages/PasswordRecoveryPage.vue';
import ResetPasswordPage from '@/pages/ResetPasswordPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/ingresar', component: LoginPage, meta: { guest: true } },
    { path: '/recuperar-contrasena', component: PasswordRecoveryPage, meta: { guest: true } },
    { path: '/restablecer-contrasena', component: ResetPasswordPage, meta: { guest: true } },
    { path: '/', component: WorkspacePage, meta: { requiresAuth: true } },
    { path: '/panel', component: DashboardPage, meta: { requiresAuth: true } },
    { path: '/mis-silabos', component: TeacherSyllabiPage, meta: { requiresAuth: true } },
    { path: '/mis-silabos/:syllabus', component: TeacherSyllabusDetailPage, meta: { requiresAuth: true } },
  ],
});
