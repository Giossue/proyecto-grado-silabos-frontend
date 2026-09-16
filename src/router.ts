import { createRouter, createWebHistory } from "vue-router";
import { sessionState } from "@/state/session";

const LoginPage = () => import("@/pages/LoginPage.vue");
const WorkspacePage = () => import("@/pages/WorkspacePage.vue");
const DashboardPage = () => import("@/pages/DashboardPage.vue");
const TeacherSyllabiPage = () => import("@/pages/TeacherSyllabiPage.vue");
const TeacherSyllabusDetailPage = () => import("@/pages/TeacherSyllabusDetailPage.vue");
const PasswordRecoveryPage = () => import("@/pages/PasswordRecoveryPage.vue");
const ResetPasswordPage = () => import("@/pages/ResetPasswordPage.vue");
const VerifyEmailPage = () => import("@/pages/VerifyEmailPage.vue");
const TwoFactorChallengePage = () => import("@/pages/TwoFactorChallengePage.vue");
const SecurityPage = () => import("@/pages/SecurityPage.vue");
const ProfilePage = () => import("@/pages/ProfilePage.vue");
const AppearancePage = () => import("@/pages/AppearancePage.vue");
const NotificationsPage = () => import("@/pages/NotificationsPage.vue");
const AdminUsersPage = () => import("@/pages/AdminUsersPage.vue");
const AdminUserDetailPage = () => import("@/pages/AdminUserDetailPage.vue");
const AcademicGovernancePage = () => import("@/pages/AcademicGovernancePage.vue");
const AdminProcessesPage = () => import("@/pages/AdminProcessesPage.vue");
const AdminTemplatePage = () => import("@/pages/AdminTemplatePage.vue");
const AdminAuditPage = () => import("@/pages/AdminAuditPage.vue");
const AdminJobsPage = () => import("@/pages/AdminJobsPage.vue");
const CoordinationConvocationsPage = () => import("@/pages/CoordinationConvocationsPage.vue");
const CoordinationConvocationDetailPage = () => import("@/pages/CoordinationConvocationDetailPage.vue");
const CoordinationReviewsPage = () => import("@/pages/CoordinationReviewsPage.vue");
const CoordinationReviewDetailPage = () => import("@/pages/CoordinationReviewDetailPage.vue");
const CoordinationReviewComparisonPage = () => import("@/pages/CoordinationReviewComparisonPage.vue");
const CoordinationSourcesPage = () => import("@/pages/CoordinationSourcesPage.vue");
const CoordinationSourceDetailPage = () => import("@/pages/CoordinationSourceDetailPage.vue");
const CoordinationAiConfigurationPage = () => import("@/pages/CoordinationAiConfigurationPage.vue");
const CoordinationAcademicStructurePage = () => import("@/pages/CoordinationAcademicStructurePage.vue");
const CoordinationReportsPage = () => import("@/pages/CoordinationReportsPage.vue");
const DocumentsPage = () => import("@/pages/DocumentsPage.vue");

type RoleCode = "administrador" | "coordinador" | "docente";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/ingresar", component: LoginPage, meta: { guest: true } },
    {
      path: "/recuperar-contrasena",
      component: PasswordRecoveryPage,
      meta: { guest: true },
    },
    {
      path: "/restablecer-contrasena",
      component: ResetPasswordPage,
      meta: { guest: true },
    },
    {
      path: "/api/v1/authentication/email-verification/:user/:hash",
      component: VerifyEmailPage,
      meta: { guest: true },
    },
    {
      path: "/verificar-dos-factores",
      component: TwoFactorChallengePage,
      meta: { guest: true },
    },
    {
      path: "/",
      component: WorkspacePage,
      meta: { requiresAuth: true },
    },
    { path: "/panel", component: DashboardPage, meta: { requiresAuth: true, title: "Panel" } },
    {
      path: "/seguridad",
      redirect: "/configuracion/seguridad",
      meta: { requiresAuth: true, title: "Seguridad" },
    },
    {
      path: "/configuracion/perfil",
      component: ProfilePage,
      meta: { requiresAuth: true, title: "Perfil" },
    },
    {
      path: "/configuracion/seguridad",
      component: SecurityPage,
      meta: { requiresAuth: true, title: "Seguridad" },
    },
    {
      path: "/configuracion/apariencia",
      component: AppearancePage,
      meta: { requiresAuth: true, title: "Apariencia" },
    },
    {
      path: "/notificaciones",
      component: NotificationsPage,
      meta: { requiresAuth: true, title: "Notificaciones" },
    },
    {
      path: "/administracion/usuarios",
      component: AdminUsersPage,
      meta: { requiresAuth: true, roles: ["administrador"], title: "Usuarios y roles" },
    },
    {
      path: "/administracion/usuarios/:user",
      component: AdminUserDetailPage,
      meta: { requiresAuth: true, roles: ["administrador"], title: "Detalle de usuario" },
    },
    {
      path: "/administracion/estructura-academica",
      component: AcademicGovernancePage,
      meta: { requiresAuth: true, roles: ["administrador"], title: "Estructura académica" },
    },
    {
      path: "/administracion/procesos",
      component: AdminProcessesPage,
      meta: { requiresAuth: true, roles: ["administrador"], title: "Convocatorias" },
    },
    {
      path: "/administracion/plantilla",
      component: AdminTemplatePage,
      meta: { requiresAuth: true, roles: ["administrador"], title: "Plantilla" },
    },
    {
      path: "/administracion/auditoria",
      component: AdminAuditPage,
      meta: { requiresAuth: true, roles: ["administrador"], title: "Auditoría" },
    },
    {
      path: "/administracion/trabajos",
      component: AdminJobsPage,
      meta: { requiresAuth: true, roles: ["administrador"], title: "Trabajos asíncronos" },
    },
    {
      path: "/coordinacion/convocatorias",
      component: CoordinationConvocationsPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Convocatorias" },
    },
    {
      path: "/coordinacion/convocatorias/:convocation",
      component: CoordinationConvocationDetailPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Detalle de convocatoria" },
    },
    {
      path: "/coordinacion/revisiones",
      component: CoordinationReviewsPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Revisión" },
    },
    {
      path: "/coordinacion/revisiones/:revision",
      component: CoordinationReviewDetailPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Detalle de revisión" },
    },
    {
      path: "/coordinacion/revisiones/:before/comparar/:after",
      component: CoordinationReviewComparisonPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Comparar revisiones" },
    },
    {
      path: "/coordinacion/fuentes",
      component: CoordinationSourcesPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Fuentes académicas" },
    },
    {
      path: "/coordinacion/fuentes/:source",
      component: CoordinationSourceDetailPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Fuente académica" },
    },
    {
      path: "/coordinacion/configuracion-ia",
      component: CoordinationAiConfigurationPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Configuración IA" },
    },
    {
      path: "/coordinacion/estructura-academica",
      redirect: "/coordinacion/malla",
      meta: { requiresAuth: true, roles: ["coordinador"] },
    },
    {
      path: "/coordinacion/malla",
      component: CoordinationAcademicStructurePage,
      props: { mode: "curriculum" },
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Malla" },
    },
    {
      path: "/coordinacion/materias-paralelos",
      component: CoordinationAcademicStructurePage,
      props: { mode: "schedule" },
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Materias y paralelos" },
    },
    {
      path: "/coordinacion/asignaciones-docentes",
      component: CoordinationAcademicStructurePage,
      props: { mode: "teachers" },
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Asignación docente" },
    },
    {
      path: "/coordinacion/informes",
      component: CoordinationReportsPage,
      meta: { requiresAuth: true, roles: ["coordinador"], title: "Informes" },
    },
    {
      path: "/revisiones/:revision/documentos",
      component: DocumentsPage,
      meta: { requiresAuth: true, title: "Documentos" },
    },
    {
      path: "/mis-silabos",
      component: TeacherSyllabiPage,
      meta: { requiresAuth: true, roles: ["docente"], title: "Mis sílabos" },
    },
    {
      path: "/mis-silabos/:syllabus",
      component: TeacherSyllabusDetailPage,
      meta: { requiresAuth: true, roles: ["docente"], title: "Sílabo" },
    },
  ],
});

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth !== true) return true;

  const session = await sessionState.load();
  if (!session) return { path: "/ingresar", query: { redirect: to.fullPath } };
  if (
    (session.user.must_change_password || !session.user.email_verified) &&
    to.path !== "/"
  )
    return "/";
  if (to.path === "/") return true;
  if (!session.active_role) return "/";

  const allowedRoles = to.meta.roles as RoleCode[] | undefined;
  if (allowedRoles && !allowedRoles.includes(session.active_role.code))
    return "/panel";

  return true;
});
