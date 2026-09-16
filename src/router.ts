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
import AdminAuditPage from '@/pages/AdminAuditPage.vue';
import AdminJobsPage from '@/pages/AdminJobsPage.vue';
import CoordinationReportsPage from '@/pages/CoordinationReportsPage.vue';
import { sessionState } from '@/state/session';

type RoleCode = 'administrador' | 'coordinador' | 'docente';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/ingresar', component: LoginPage, meta: { guest: true } },
    { path: '/recuperar-contrasena', component: PasswordRecoveryPage, meta: { guest: true } },
    { path: '/restablecer-contrasena', component: ResetPasswordPage, meta: { guest: true } },
    { path: '/api/v1/authentication/email-verification/:user/:hash', component: VerifyEmailPage, meta: { guest: true } },
    { path: '/verificar-dos-factores', component: TwoFactorChallengePage, meta: { guest: true } },
    { path: '/', component: WorkspacePage, meta: { requiresAuth: true, shell: false } },
    { path: '/panel', component: DashboardPage, meta: { requiresAuth: true } },
    { path: '/seguridad', component: SecurityPage, meta: { requiresAuth: true } },
    { path: '/notificaciones', component: NotificationsPage, meta: { requiresAuth: true } },
    { path: '/administracion/usuarios', component: AdminUsersPage, meta: { requiresAuth: true, roles: ['administrador'] } },
    { path: '/administracion/estructura-academica', component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ['administrador'] } },
    { path: '/administracion/procesos', component: AdminProcessesPage, meta: { requiresAuth: true, roles: ['administrador'] } },
    { path: '/administracion/plantilla', component: AdminTemplatePage, meta: { requiresAuth: true, roles: ['administrador'] } },
    { path: '/administracion/auditoria', component: AdminAuditPage, meta: { requiresAuth: true, roles: ['administrador'] } },
    { path: '/administracion/trabajos', component: AdminJobsPage, meta: { requiresAuth: true, roles: ['administrador'] } },
    { path: '/coordinacion/convocatorias', component: CoordinationConvocationsPage, meta: { requiresAuth: true, roles: ['coordinador'] } },
    { path: '/coordinacion/convocatorias/:convocation', component: CoordinationConvocationDetailPage, meta: { requiresAuth: true, roles: ['coordinador'] } },
    { path: '/coordinacion/revisiones', component: CoordinationReviewsPage, meta: { requiresAuth: true, roles: ['coordinador'] } },
    { path: '/coordinacion/revisiones/:revision', component: CoordinationReviewDetailPage, meta: { requiresAuth: true, roles: ['coordinador'] } },
    { path: '/coordinacion/fuentes', component: CoordinationSourcesPage, meta: { requiresAuth: true, roles: ['coordinador'] } },
    { path: '/coordinacion/fuentes/:source', component: CoordinationSourceDetailPage, meta: { requiresAuth: true, roles: ['coordinador'] } },
    { path: '/coordinacion/estructura-academica', component: CoordinationAcademicStructurePage, meta: { requiresAuth: true, roles: ['coordinador'] } },
    { path: '/coordinacion/informes', component: CoordinationReportsPage, meta: { requiresAuth: true, roles: ['coordinador'] } },
    { path: '/revisiones/:revision/documentos', component: DocumentsPage, meta: { requiresAuth: true } },
    { path: '/mis-silabos', component: TeacherSyllabiPage, meta: { requiresAuth: true, roles: ['docente'] } },
    { path: '/mis-silabos/:syllabus', component: TeacherSyllabusDetailPage, meta: { requiresAuth: true, roles: ['docente'] } },
  ],
});

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth !== true) return true;

  const session = await sessionState.load();
  if (!session) return { path: '/ingresar', query: { redirect: to.fullPath } };
  if ((session.user.must_change_password || !session.user.email_verified) && to.path !== '/') return '/';
  if (to.path === '/') return true;
  if (!session.active_role) return '/';

  const allowedRoles = to.meta.roles as RoleCode[] | undefined;
  if (allowedRoles && !allowedRoles.includes(session.active_role.code)) return '/panel';

  return true;
});
