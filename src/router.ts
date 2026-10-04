import { createRouter, createWebHistory, type RouteLocationNormalized } from "vue-router";
import { sessionState } from "@/state/session";
import { rememberIntendedRoute } from "@/lib/intended-route";
import {
  paths,
  roleDocuments,
  roleEntry as resolveRoleEntry,
  roleHome as resolveRoleHome,
  roleNotifications,
  roleSetting,
  type RoleCode,
} from "@/lib/routes";

const LoginPage = () => import("@/pages/LoginPage.vue");
const WorkspacePage = () => import("@/pages/WorkspacePage.vue");
const DashboardPage = () => import("@/pages/DashboardPage.vue");
const TeacherSyllabiPage = () => import("@/pages/TeacherSyllabiPage.vue");
const TeacherSyllabusDetailPage = () => import("@/pages/TeacherSyllabusDetailPage.vue");
const PasswordRecoveryPage = () => import("@/pages/PasswordRecoveryPage.vue");
const ResetPasswordPage = () => import("@/pages/ResetPasswordPage.vue");
const ActivateAccountPage = () => import("@/pages/ActivateAccountPage.vue");
const VerifyEmailPage = () => import("@/pages/VerifyEmailPage.vue");
const TwoFactorChallengePage = () => import("@/pages/TwoFactorChallengePage.vue");
const SecurityPage = () => import("@/pages/SecurityPage.vue");
const ProfilePage = () => import("@/pages/ProfilePage.vue");
const NotificationsPage = () => import("@/pages/NotificationsPage.vue");
const AdminUsersPage = () => import("@/pages/AdminUsersPage.vue");
const AcademicGovernancePage = () => import("@/pages/AcademicGovernancePage.vue");
const AdminProcessesPage = () => import("@/pages/AdminProcessesPage.vue");
const AdminTemplatePage = () => import("@/pages/AdminTemplatePage.vue");
const AdminAuditPage = () => import("@/pages/AdminAuditPage.vue");
const AdminJobsPage = () => import("@/pages/AdminJobsPage.vue");
const CoordinationConvocationsPage = () => import("@/pages/CoordinationConvocationsPage.vue");

const CoordinationReviewsPage = () => import("@/pages/CoordinationReviewsPage.vue");
const CoordinationReviewDetailPage = () => import("@/pages/CoordinationReviewDetailPage.vue");
const CoordinationReviewComparisonPage = () => import("@/pages/CoordinationReviewComparisonPage.vue");
const CoordinationAcademicStructurePage = () => import("@/pages/CoordinationAcademicStructurePage.vue");
const DocumentsPage = () => import("@/pages/DocumentsPage.vue");
const LibraryReviewsPage = () => import("@/pages/LibraryReviewsPage.vue");
const LibraryReviewDetailPage = () => import("@/pages/LibraryReviewDetailPage.vue");
const NotFoundPage = () => import("@/pages/NotFoundPage.vue");

const replaceParams = (target: string, route: RouteLocationNormalized): string =>
  target.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => String(route.params[key] ?? ""));

const canonicalFromAlias = (route: RouteLocationNormalized, target: string) => ({
  path: replaceParams(target, route),
  query: route.query,
});

const rememberProtectedDestination = (route: RouteLocationNormalized): void => {
  if (route.path === paths.roleSelection || route.path === paths.emailVerificationRequired) return;
  rememberIntendedRoute(
    route.fullPath,
    route.matched.some((record) => record.meta.requiresAuth === true),
  );
};

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginPage, meta: { guest: true } },
    { path: "/ingresar", component: LoginPage, meta: { guest: true, aliasTarget: "/login" } },
    { path: "/recuperar-contrasena", component: PasswordRecoveryPage, meta: { guest: true } },
    { path: "/restablecer-contrasena", component: ResetPasswordPage, meta: { guest: true } },
    { path: "/activar-cuenta", component: ActivateAccountPage, meta: { shell: false } },
    { path: "/api/v1/authentication/email-verification/:user/:hash", component: VerifyEmailPage, meta: { shell: false } },
    { path: "/verificar-correo", component: VerifyEmailPage, meta: { requiresAuth: true, shell: false } },
    { path: "/verificar-dos-factores", component: TwoFactorChallengePage, meta: { guest: true } },
    { path: "/", redirect: "/login" },
    { path: "/rol", component: WorkspacePage, meta: { requiresAuth: true, layout: "workspace", title: "Seleccionar ámbito de trabajo" } },

    { path: "/panel", component: DashboardPage, meta: { requiresAuth: true, aliasTarget: "/dashboard", title: "Panel" } },
    { path: "/dashboard", component: DashboardPage, meta: { requiresAuth: true, shortcut: "panel", title: "Panel" } },
    { path: "/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, shortcut: "notifications", title: "Notificaciones" } },
    { path: "/fuentes", redirect: "/dashboard" },
    { path: "/fuentes/:source", redirect: "/dashboard" },
    { path: "/settings", redirect: "/settings/profile", meta: { requiresAuth: true } },
    { path: "/settings/profile", component: ProfilePage, meta: { requiresAuth: true, shortcut: "profile", title: "Perfil" } },
    { path: "/settings/security", component: SecurityPage, meta: { requiresAuth: true, shortcut: "security", title: "Seguridad" } },
    { path: "/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, shortcut: "profile", title: "Perfil" } },
    { path: "/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, shortcut: "security", title: "Seguridad" } },
    { path: "/seguridad", component: SecurityPage, meta: { requiresAuth: true, shortcut: "security", title: "Seguridad" } },
    { path: "/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, shortcut: "documents", title: "Documentos" } },

    { path: "/admin/panel", component: DashboardPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Panel" } },
    { path: "/admin/usuarios", component: AdminUsersPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Usuarios y roles" } },
    { path: "/admin/estructura-academica", component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Estructura académica" } },
    { path: "/admin/estructura-academica/:section", component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Estructura académica" } },
    { path: "/admin/convocatorias", component: AdminProcessesPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Convocatorias" } },
    { path: "/admin/plantilla", component: AdminTemplatePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Plantilla" } },
    { path: "/admin/auditoria", component: AdminAuditPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Auditoría" } },
    { path: "/admin/procesos", component: AdminJobsPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Trabajos fallidos" } },
    { path: "/admin/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Perfil" } },
    { path: "/admin/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Seguridad" } },
    { path: "/admin/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Notificaciones" } },

    { path: "/coordinacion/panel", component: DashboardPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Panel" } },
    { path: "/coordinacion/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Notificaciones" } },
    { path: "/coordinacion/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Perfil" } },
    { path: "/coordinacion/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Seguridad" } },
    { path: "/coordinacion/convocatorias", component: CoordinationConvocationsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Convocatorias" } },

    { path: "/coordinacion/revisiones", component: CoordinationReviewsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Revisión" } },
    { path: "/coordinacion/revisiones/:revision", component: CoordinationReviewDetailPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Detalle de revisión" } },
    { path: "/coordinacion/revisiones/:before/comparar/:after", component: CoordinationReviewComparisonPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Comparar revisiones" } },
    { path: "/coordinacion/fuentes", redirect: "/dashboard" },
    { path: "/coordinacion/fuentes/:source", redirect: "/dashboard" },
    { path: "/coordinacion/estructura-academica", redirect: "/coordinacion/malla", meta: { requiresAuth: true, roles: ["coordinador"] } },
    { path: "/coordinacion/malla", component: CoordinationAcademicStructurePage, props: { mode: "curriculum" }, meta: { requiresAuth: true, roles: ["coordinador"], title: "Malla" } },
    { path: "/coordinacion/materias-asignaciones", component: CoordinationAcademicStructurePage, props: { mode: "schedule" }, meta: { requiresAuth: true, roles: ["coordinador"], title: "Materias y asignaciones" } },
    { path: "/coordinacion/asignaciones-docentes", redirect: "/coordinacion/materias-asignaciones", meta: { requiresAuth: true, roles: ["coordinador"] } },
    { path: "/coordinacion/materias-paralelos", redirect: "/coordinacion/materias-asignaciones", meta: { requiresAuth: true, roles: ["coordinador"] } },
    { path: "/coordinacion/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Documentos" } },

    { path: "/docente/panel", component: DashboardPage, meta: { requiresAuth: true, roles: ["docente"], title: "Panel" } },
    { path: "/docente/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["docente"], title: "Notificaciones" } },
    { path: "/docente/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["docente"], title: "Perfil" } },
    { path: "/docente/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["docente"], title: "Seguridad" } },
    { path: "/docente/mis-silabos", component: TeacherSyllabiPage, meta: { requiresAuth: true, roles: ["docente"], title: "Mis sílabos" } },
    { path: "/docente/mis-silabos/:syllabus", component: TeacherSyllabusDetailPage, meta: { requiresAuth: true, roles: ["docente"], title: "Mis sílabos", layout: "syllabus-editor" } },
    { path: "/docente/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, roles: ["docente"], title: "Documentos" } },

    { path: "/biblioteca/panel", component: DashboardPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Panel" } },
    { path: "/biblioteca/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Notificaciones" } },
    { path: "/biblioteca/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Perfil" } },
    { path: "/biblioteca/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Seguridad" } },
    { path: "/biblioteca/revisiones", component: LibraryReviewsPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Revisiones de biblioteca" } },
    { path: "/biblioteca/revisiones/:revision", component: LibraryReviewDetailPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Revisión de bibliografía" } },

    { path: "/administracion/usuarios", component: AdminUsersPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/usuarios" } },
    { path: "/administracion/estructura-academica", component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/estructura-academica" } },
    { path: "/administracion/procesos", component: AdminProcessesPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/convocatorias" } },
    { path: "/administracion/trabajos", component: AdminJobsPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/procesos" } },
    { path: "/administracion/plantilla", component: AdminTemplatePage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/plantilla" } },
    { path: "/administracion/auditoria", component: AdminAuditPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/auditoria" } },
    { path: "/mis-silabos", component: TeacherSyllabiPage, meta: { requiresAuth: true, roles: ["docente"], aliasTarget: "/docente/mis-silabos" } },
    { path: "/mis-silabos/:syllabus", component: TeacherSyllabusDetailPage, meta: { requiresAuth: true, roles: ["docente"], aliasTarget: "/docente/mis-silabos/:syllabus", layout: "syllabus-editor" } },

    { path: "/:pathMatch(.*)*", component: NotFoundPage, meta: { title: "Página no encontrada" } },
  ],
});

router.beforeEach(async (to) => {
  const needsSession = to.meta.requiresAuth === true || to.meta.guest === true;
  const session = needsSession ? await sessionState.load() : null;

  if (to.meta.guest === true) {
    if (!session && typeof to.query.redirect === "string") {
      const intended = router.resolve(to.query.redirect);
      rememberIntendedRoute(to.query.redirect, intended.matched.some((record) => record.meta.requiresAuth === true));
    }
    if (!session) {
      if (typeof to.meta.aliasTarget === "string") {
        const query = { ...to.query };
        delete query.redirect;
        return { path: replaceParams(to.meta.aliasTarget, to), query };
      }
      return true;
    }
    if (!session.user.email_verified) return paths.emailVerificationRequired;
    if (!session.active_role) return paths.roleSelection;
    return resolveRoleEntry(session.active_role.code);
  }

  if (to.meta.requiresAuth !== true) return true;
  if (!session) {
    rememberIntendedRoute(to.fullPath);
    return paths.login;
  }
  if (!session.user.email_verified && to.path !== paths.emailVerificationRequired) {
    rememberProtectedDestination(to);
    return paths.emailVerificationRequired;
  }
  if (session.user.email_verified && to.path === paths.emailVerificationRequired) return paths.dashboard;
  if (to.path === "/") return true;
  if (!session.active_role) {
    if (to.path === paths.roleSelection) return true;
    rememberProtectedDestination(to);
    return paths.roleSelection;
  }

  const code = session.active_role.code;
  if (typeof to.meta.aliasTarget === "string") return canonicalFromAlias(to, to.meta.aliasTarget);

  if (typeof to.meta.shortcut === "string") {
    const shortcuts: Record<string, () => string> = {
      panel: () => resolveRoleHome(code),
      notifications: () => roleNotifications(code),
      profile: () => roleSetting(code, "profile"),
      security: () => roleSetting(code, "security"),
      documents: () => roleDocuments(code, String(to.params.revision)),
    };
    const destination = shortcuts[to.meta.shortcut]?.();
    if (destination) return { path: destination, query: to.query };
  }

  const allowedRoles = to.meta.roles as RoleCode[] | undefined;
  if (allowedRoles && !allowedRoles.includes(code)) return resolveRoleHome(code);

  return true;
});
