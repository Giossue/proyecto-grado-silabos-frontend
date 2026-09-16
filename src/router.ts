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
import NotificationsPage from '@/pages/NotificationsPage.vue';
import AdminUsersPage from '@/pages/AdminUsersPage.vue';
import AcademicGovernancePage from '@/pages/AcademicGovernancePage.vue';
import AdminProcessesPage from '@/pages/AdminProcessesPage.vue';
import CoordinationConvocationsPage from '@/pages/CoordinationConvocationsPage.vue';
import CoordinationConvocationDetailPage from '@/pages/CoordinationConvocationDetailPage.vue';
import CoordinationReviewsPage from '@/pages/CoordinationReviewsPage.vue';
import CoordinationReviewDetailPage from '@/pages/CoordinationReviewDetailPage.vue';
import CoordinationSourcesPage from '@/pages/CoordinationSourcesPage.vue';
import CoordinationSourceDetailPage from '@/pages/CoordinationSourceDetailPage.vue';
import CoordinationAcademicStructurePage from '@/pages/CoordinationAcademicStructurePage.vue';
import AdminTemplatePage from '@/pages/AdminTemplatePage.vue';
import DocumentsPage from '@/pages/DocumentsPage.vue';

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
    { path: '/notificaciones', component: NotificationsPage, meta: { requiresAuth: true } },
    { path: '/administracion/usuarios', component: AdminUsersPage, meta: { requiresAuth: true } },
    { path: '/administracion/estructura-academica', component: AcademicGovernancePage, meta: { requiresAuth: true } },
    { path: '/administracion/procesos', component: AdminProcessesPage, meta: { requiresAuth: true } },
    { path: '/administracion/plantilla', component: AdminTemplatePage, meta: { requiresAuth: true } },
    { path: '/coordinacion/convocatorias', component: CoordinationConvocationsPage, meta: { requiresAuth: true } },
    { path: '/coordinacion/convocatorias/:convocation', component: CoordinationConvocationDetailPage, meta: { requiresAuth: true } },
    { path: '/coordinacion/revisiones', component: CoordinationReviewsPage, meta: { requiresAuth: true } },
    { path: '/coordinacion/revisiones/:revision', component: CoordinationReviewDetailPage, meta: { requiresAuth: true } },
    { path: '/coordinacion/fuentes', component: CoordinationSourcesPage, meta: { requiresAuth: true } },
    { path: '/coordinacion/fuentes/:source', component: CoordinationSourceDetailPage, meta: { requiresAuth: true } },
    { path: '/coordinacion/estructura-academica', component: CoordinationAcademicStructurePage, meta: { requiresAuth: true } },
    { path: '/revisiones/:revision/documentos', component: DocumentsPage, meta: { requiresAuth: true } },
    { path: '/mis-silabos', component: TeacherSyllabiPage, meta: { requiresAuth: true } },
    { path: '/mis-silabos/:syllabus', component: TeacherSyllabusDetailPage, meta: { requiresAuth: true } },
  ],
});
