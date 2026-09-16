import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '@/pages/LoginPage.vue';
import WorkspacePage from '@/pages/WorkspacePage.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import TeacherSyllabiPage from '@/pages/TeacherSyllabiPage.vue';
import TeacherSyllabusDetailPage from '@/pages/TeacherSyllabusDetailPage.vue';
import PasswordRecoveryPage from '@/pages/PasswordRecoveryPage.vue';
import ResetPasswordPage from '@/pages/ResetPasswordPage.vue';
import VerifyEmailPage from '@/pages/VerifyEmailPage.vue';
import TwoFactorChallengePage from '@/pages/TwoFactorChallengePage.vue';
import SecurityPage from '@/pages/SecurityPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/ingresar', component: LoginPage, meta: { guest: true } },
    { path: '/recuperar-contrasena', component: PasswordRecoveryPage, meta: { guest: true } },
    { path: '/restablecer-contrasena', component: ResetPasswordPage, meta: { guest: true } },
    { path: '/api/v1/authentication/email-verification/:user/:hash', component: VerifyEmailPage, meta: { guest: true } },
    { path: '/verificar-dos-factores', component: TwoFactorChallengePage, meta: { guest: true } },
    { path: '/', component: WorkspacePage, meta: { requiresAuth: true } },
    { path: '/panel', component: DashboardPage, meta: { requiresAuth: true } },
    { path: '/seguridad', component: SecurityPage, meta: { requiresAuth: true } },
    { path: '/mis-silabos', component: TeacherSyllabiPage, meta: { requiresAuth: true } },
    { path: '/mis-silabos/:syllabus', component: TeacherSyllabusDetailPage, meta: { requiresAuth: true } },
  ],
});
