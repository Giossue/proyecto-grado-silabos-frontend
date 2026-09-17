import { createRouter, createWebHistory, type RouteLocationNormalized } from "vue-router";
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
const CoordinationAcademicStructurePage = () => import("@/pages/CoordinationAcademicStructurePage.vue");
const CoordinationReportsPage = () => import("@/pages/CoordinationReportsPage.vue");
const DocumentsPage = () => import("@/pages/DocumentsPage.vue");
const NotFoundPage = () => import("@/pages/NotFoundPage.vue");

type RoleCode = "administrador" | "coordinador" | "docente";

const roleHomes: Record<RoleCode, string> = {
  administrador: "/admin/panel",
  coordinador: "/coordinacion/panel",
  docente: "/docente/panel",
};

const roleHome = (code: RoleCode | undefined): string => code ? roleHomes[code] : "/";

const replaceParams = (target: string, route: RouteLocationNormalized): string =>
  target.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => String(route.params[key] ?? ""));

const canonicalFromAlias = (route: RouteLocationNormalized, target: string) => ({
  path: replaceParams(target, route),
  query: route.query,
});

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/ingresar", component: LoginPage, meta: { guest: true } },
    { path: "/recuperar-contrasena", component: PasswordRecoveryPage, meta: { guest: true } },
    { path: "/restablecer-contrasena", component: ResetPasswordPage, meta: { guest: true } },
    { path: "/api/v1/authentication/email-verification/:user/:hash", component: VerifyEmailPage, meta: { guest: true } },
    { path: "/verificar-correo", component: VerifyEmailPage, meta: { requiresAuth: true, shell: false } },
    { path: "/verificar-dos-factores", component: TwoFactorChallengePage, meta: { guest: true } },
    { path: "/", component: WorkspacePage, meta: { requiresAuth: true } },

    // Direcciones cortas compartidas: el guard las resuelve al área activa.
    { path: "/panel", component: DashboardPage, meta: { requiresAuth: true, shortcut: "panel", title: "Panel" } },
    { path: "/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, shortcut: "notifications", title: "Notificaciones" } },
    { path: "/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, shortcut: "profile", title: "Perfil" } },
    { path: "/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, shortcut: "security", title: "Seguridad" } },
    { path: "/configuracion/apariencia", component: AppearancePage, meta: { requiresAuth: true, shortcut: "appearance", title: "Apariencia" } },
    { path: "/seguridad", component: SecurityPage, meta: { requiresAuth: true, shortcut: "security", title: "Seguridad" } },
    { path: "/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, shortcut: "documents", title: "Documentos" } },

    // Administración — rutas canónicas del monolito.
    { path: "/admin/panel", component: DashboardPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Panel" } },
    { path: "/admin/usuarios", component: AdminUsersPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Usuarios y roles" } },
    { path: "/admin/usuarios/:user", component: AdminUserDetailPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Detalle de usuario", breadcrumbTitle: "Usuarios", breadcrumbHref: "/admin/usuarios" } },
    { path: "/admin/estructura-academica", component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Estructura académica" } },
    { path: "/admin/estructura-academica/:section", component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Estructura académica" } },
    { path: "/admin/convocatorias", component: AdminProcessesPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Convocatorias" } },
    { path: "/admin/plantilla", component: AdminTemplatePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Plantilla" } },
    { path: "/admin/auditoria", component: AdminAuditPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Auditoría" } },
    { path: "/admin/procesos", component: AdminJobsPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Auditoría" } },
    { path: "/admin/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Perfil" } },
    { path: "/admin/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Seguridad" } },
    { path: "/admin/configuracion/apariencia", component: AppearancePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Apariencia" } },
    { path: "/admin/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Notificaciones" } },

    // Coordinación.
    { path: "/coordinacion/panel", component: DashboardPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Panel" } },
    { path: "/coordinacion/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Notificaciones" } },
    { path: "/coordinacion/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Perfil" } },
    { path: "/coordinacion/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Seguridad" } },
    { path: "/coordinacion/configuracion/apariencia", component: AppearancePage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Apariencia" } },
    { path: "/coordinacion/convocatorias", component: CoordinationConvocationsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Convocatorias" } },
    { path: "/coordinacion/convocatorias/:convocation", component: CoordinationConvocationDetailPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Detalle de convocatoria", breadcrumbTitle: "Convocatorias", breadcrumbHref: "/coordinacion/convocatorias" } },
    { path: "/coordinacion/revisiones", component: CoordinationReviewsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Revisión" } },
    { path: "/coordinacion/revisiones/:revision", component: CoordinationReviewDetailPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Detalle de revisión", breadcrumbTitle: "Revisión", breadcrumbHref: "/coordinacion/revisiones" } },
    { path: "/coordinacion/revisiones/:before/comparar/:after", component: CoordinationReviewComparisonPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Comparar revisiones", breadcrumbTitle: "Revisión", breadcrumbHref: "/coordinacion/revisiones" } },
    { path: "/coordinacion/fuentes", component: CoordinationSourcesPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Fuentes académicas" } },
    { path: "/coordinacion/fuentes/:source", component: CoordinationSourceDetailPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Fuente académica", breadcrumbTitle: "Fuentes académicas", breadcrumbHref: "/coordinacion/fuentes" } },
    { path: "/coordinacion/estructura-academica", redirect: "/coordinacion/malla", meta: { requiresAuth: true, roles: ["coordinador"] } },
    { path: "/coordinacion/malla", component: CoordinationAcademicStructurePage, props: { mode: "curriculum" }, meta: { requiresAuth: true, roles: ["coordinador"], title: "Malla" } },
    { path: "/coordinacion/materias-paralelos", component: CoordinationAcademicStructurePage, props: { mode: "schedule" }, meta: { requiresAuth: true, roles: ["coordinador"], title: "Materias y paralelos" } },
    { path: "/coordinacion/asignaciones-docentes", component: CoordinationAcademicStructurePage, props: { mode: "teachers" }, meta: { requiresAuth: true, roles: ["coordinador"], title: "Asignación docente" } },
    { path: "/coordinacion/informes", component: CoordinationReportsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Informes" } },
    { path: "/coordinacion/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Documentos" } },

    // Docencia.
    { path: "/docente/panel", component: DashboardPage, meta: { requiresAuth: true, roles: ["docente"], title: "Panel" } },
    { path: "/docente/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["docente"], title: "Notificaciones" } },
    { path: "/docente/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["docente"], title: "Perfil" } },
    { path: "/docente/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["docente"], title: "Seguridad" } },
    { path: "/docente/configuracion/apariencia", component: AppearancePage, meta: { requiresAuth: true, roles: ["docente"], title: "Apariencia" } },
    { path: "/docente/mis-silabos", component: TeacherSyllabiPage, meta: { requiresAuth: true, roles: ["docente"], title: "Mis sílabos", breadcrumbTitle: "Mis sílabos", breadcrumbHref: "/docente/mis-silabos" } },
    { path: "/docente/mis-silabos/:syllabus", component: TeacherSyllabusDetailPage, meta: { requiresAuth: true, roles: ["docente"], title: "Mis sílabos", breadcrumbTitle: "Mis sílabos", breadcrumbHref: "/docente/mis-silabos" } },
    { path: "/docente/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, roles: ["docente"], title: "Documentos" } },

    // URLs publicadas por la SPA anterior: se normalizan con replace.
    { path: "/administracion/usuarios", component: AdminUsersPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/usuarios" } },
    { path: "/administracion/usuarios/:user", component: AdminUserDetailPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/usuarios/:user" } },
    { path: "/administracion/estructura-academica", component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/estructura-academica" } },
    { path: "/administracion/procesos", component: AdminProcessesPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/convocatorias" } },
    { path: "/administracion/trabajos", component: AdminJobsPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/procesos" } },
    { path: "/administracion/plantilla", component: AdminTemplatePage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/plantilla" } },
    { path: "/administracion/auditoria", component: AdminAuditPage, meta: { requiresAuth: true, roles: ["administrador"], aliasTarget: "/admin/auditoria" } },
    { path: "/mis-silabos", component: TeacherSyllabiPage, meta: { requiresAuth: true, roles: ["docente"], aliasTarget: "/docente/mis-silabos" } },
    { path: "/mis-silabos/:syllabus", component: TeacherSyllabusDetailPage, meta: { requiresAuth: true, roles: ["docente"], aliasTarget: "/docente/mis-silabos/:syllabus" } },

    { path: "/:pathMatch(.*)*", component: NotFoundPage, meta: { title: "Página no encontrada" } },
  ],
});

router.beforeEach(async (to) => {
  const needsSession = to.meta.requiresAuth === true || to.meta.guest === true;
  const session = needsSession ? await sessionState.load() : null;

  if (to.meta.guest === true) {
    if (!session) return true;
    if (!session.user.email_verified) return "/verificar-correo";
    if (session.user.must_change_password || !session.active_role) return "/";
    return roleHome(session.active_role.code);
  }

  if (to.meta.requiresAuth !== true) return true;
  if (!session) return { path: "/ingresar", query: { redirect: to.fullPath } };
  if (!session.user.email_verified && to.path !== "/verificar-correo") return "/verificar-correo";
  if (session.user.email_verified && to.path === "/verificar-correo") return "/";
  if (session.user.must_change_password && to.path !== "/") return "/";
  if (to.path === "/") return true;
  if (!session.active_role) return "/";

  const code = session.active_role.code;
  if (typeof to.meta.shortcut === "string") {
    const prefix = code === "administrador" ? "admin" : code;
    const destination = {
      panel: roleHome(code),
      notifications: `/${prefix}/notificaciones`,
      profile: `/${prefix}/configuracion/perfil`,
      security: `/${prefix}/configuracion/seguridad`,
      appearance: `/${prefix}/configuracion/apariencia`,
      documents: code === "administrador" ? "/admin/panel" : `/${prefix}/revisiones/${String(to.params.revision)}/documentos`,
    }[to.meta.shortcut];
    if (destination) return { path: destination, query: to.query };
  }

  const allowedRoles = to.meta.roles as RoleCode[] | undefined;
  if (allowedRoles && !allowedRoles.includes(code)) return roleHome(code);

  if (typeof to.meta.aliasTarget === "string") return canonicalFromAlias(to, to.meta.aliasTarget);
  return true;
});
