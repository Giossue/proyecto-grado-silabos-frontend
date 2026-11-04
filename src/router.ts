import { createRouter, createWebHistory, type RouteLocationNormalized } from "vue-router";
import { sessionState } from "@/state/session";
import { trackSettingsReturn } from "@/state/settingsReturn";
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

const AdminSystemSettingsPage = () => import("@/pages/AdminSystemSettingsPage.vue");
const EmailPreferencesPage = () => import("@/pages/EmailPreferencesPage.vue");
const LoginPage = () => import("@/pages/LoginPage.vue");
const WorkspacePage = () => import("@/pages/WorkspacePage.vue");
const CoordinationCareerProjectPage = () => import("@/pages/CoordinationCareerProjectPage.vue");
const SupportDocumentsPage = () => import("@/pages/SupportDocumentsPage.vue");
const TeacherSyllabiPage = () => import("@/pages/TeacherSyllabiPage.vue");
const TeacherHistoryPage = () => import("@/pages/TeacherHistoryPage.vue");
const TeacherHistoryCareerPage = () => import("@/pages/TeacherHistoryCareerPage.vue");
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

const CoordinationReviewsPage = () => import("@/pages/CoordinationReviewsPage.vue");
const CoordinationReviewHistoryPage = () => import("@/pages/CoordinationReviewHistoryPage.vue");
const CoordinationHistoryPage = () => import("@/pages/CoordinationHistoryPage.vue");
const CoordinationReviewDetailPage = () => import("@/pages/CoordinationReviewDetailPage.vue");
const CoordinationAcademicStructurePage = () => import("@/pages/CoordinationAcademicStructurePage.vue");
const DocumentsPage = () => import("@/pages/DocumentsPage.vue");
const LibraryReviewsPage = () => import("@/pages/LibraryReviewsPage.vue");
const LibraryHistoryPage = () => import("@/pages/LibraryHistoryPage.vue");
const LibraryReviewDetailPage = () => import("@/pages/LibraryReviewDetailPage.vue");
const NotFoundPage = () => import("@/pages/NotFoundPage.vue");

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
    { path: "/ingresar", component: LoginPage, meta: { guest: true } },
    { path: "/recuperar-contrasena", component: PasswordRecoveryPage, meta: { guest: true } },
    // Se puede abrir con la sesión iniciada: al terminar, el servidor la cierra en todos los dispositivos.
    { path: "/restablecer-contrasena", component: ResetPasswordPage },
    { path: "/activar-cuenta", component: ActivateAccountPage, meta: { shell: false } },
    { path: "/verificar-correo", component: VerifyEmailPage, meta: { requiresAuth: true, shell: false } },
    { path: "/verificar-dos-factores", component: TwoFactorChallengePage, meta: { guest: true } },
    { path: "/", redirect: "/ingresar" },
    { path: "/rol", component: WorkspacePage, meta: { requiresAuth: true, layout: "workspace", title: "Seleccionar ámbito de trabajo" } },

    { path: "/panel", component: WorkspacePage, meta: { requiresAuth: true, shortcut: "panel", title: "Panel" } },
    { path: "/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, shortcut: "notifications", title: "Notificaciones" } },
    { path: "/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, shortcut: "profile", title: "Perfil" } },
    { path: "/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, shortcut: "security", title: "Seguridad" } },
    { path: "/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, shortcut: "documents", title: "Documentos" } },

    { path: "/admin/panel", redirect: "/admin/convocatorias" },
    { path: "/admin/puesta-en-marcha", redirect: "/admin/convocatorias" },
    { path: "/admin/usuarios", component: AdminUsersPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Usuarios y roles" } },
    { path: "/admin/estructura-academica", component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Facultades y carreras" } },
    { path: "/admin/estructura-academica/:section", component: AcademicGovernancePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Facultades y carreras" } },
    { path: "/admin/convocatorias", component: AdminProcessesPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Convocatorias" } },
    { path: "/admin/plantilla", component: AdminTemplatePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Plantilla" } },
    { path: "/admin/auditoria", component: AdminAuditPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Auditoría" } },
    { path: "/admin/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["administrador"], title: "Perfil" } },
    { path: "/admin/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Seguridad" } },
    { path: "/admin/configuracion/sistema", component: AdminSystemSettingsPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Sistema" } },
    { path: "/admin/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["administrador"], title: "Notificaciones" } },

    { path: "/coordinacion/puesta-en-marcha", redirect: "/coordinacion/revisiones" },
    { path: "/coordinacion/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Notificaciones" } },
    { path: "/coordinacion/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Perfil" } },
    { path: "/coordinacion/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Seguridad" } },
    { path: "/coordinacion/configuracion/notificaciones", component: EmailPreferencesPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Notificaciones" } },

    { path: "/coordinacion/revisiones", component: CoordinationReviewsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Revisión" } },
    { path: "/coordinacion/historial", component: CoordinationHistoryPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Historial" } },
    { path: "/coordinacion/revisiones/:revision", component: CoordinationReviewDetailPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Detalle de revisión", layout: "syllabus-editor" } },
    { path: "/coordinacion/revisiones/:revision/historial", component: CoordinationReviewHistoryPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Historial de versiones", layout: "syllabus-editor" } },
    { path: "/coordinacion/proyecto-carrera", component: CoordinationCareerProjectPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Proyecto de carrera" } },
    { path: "/coordinacion/documentos-apoyo", redirect: { path: "/coordinacion/proyecto-carrera", query: { tab: "documentos" } } },
    { path: "/coordinacion/malla", component: CoordinationAcademicStructurePage, props: { mode: "curriculum" }, meta: { requiresAuth: true, roles: ["coordinador"], title: "Malla" } },
    { path: "/coordinacion/materias-asignaciones", component: CoordinationAcademicStructurePage, props: { mode: "schedule" }, meta: { requiresAuth: true, roles: ["coordinador"], title: "Materias y asignaciones" } },
    { path: "/coordinacion/docentes", component: CoordinationAcademicStructurePage, props: { mode: "teachers" }, meta: { requiresAuth: true, roles: ["coordinador"], title: "Docentes" } },
    { path: "/coordinacion/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, roles: ["coordinador"], title: "Documentos" } },

    { path: "/docente/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["docente"], title: "Notificaciones" } },
    { path: "/docente/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["docente"], title: "Perfil" } },
    { path: "/docente/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["docente"], title: "Seguridad" } },
    { path: "/docente/configuracion/notificaciones", component: EmailPreferencesPage, meta: { requiresAuth: true, roles: ["docente"], title: "Notificaciones" } },
    { path: "/docente/mis-silabos", component: TeacherSyllabiPage, meta: { requiresAuth: true, roles: ["docente"], title: "Mis sílabos" } },
    { path: "/docente/historial", component: TeacherHistoryPage, meta: { requiresAuth: true, roles: ["docente"], title: "Historial" } },
    { path: "/docente/documentos-apoyo", component: SupportDocumentsPage, meta: { requiresAuth: true, roles: ["docente"], title: "Documentos de apoyo" } },
    { path: "/docente/historial/:career", component: TeacherHistoryCareerPage, meta: { requiresAuth: true, roles: ["docente"], title: "Historial" } },
    { path: "/docente/mis-silabos/:syllabus", component: TeacherSyllabusDetailPage, meta: { requiresAuth: true, roles: ["docente"], title: "Mis sílabos", layout: "syllabus-editor" } },
    { path: "/docente/revisiones/:revision/documentos", component: DocumentsPage, meta: { requiresAuth: true, roles: ["docente"], title: "Documentos" } },

    { path: "/biblioteca/notificaciones", component: NotificationsPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Notificaciones" } },
    { path: "/biblioteca/configuracion/perfil", component: ProfilePage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Perfil" } },
    { path: "/biblioteca/configuracion/seguridad", component: SecurityPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Seguridad" } },
    { path: "/biblioteca/configuracion/notificaciones", component: EmailPreferencesPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Notificaciones" } },
    { path: "/biblioteca/revisiones", component: LibraryReviewsPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Revisiones de biblioteca" } },
    { path: "/biblioteca/historial", component: LibraryHistoryPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Historial" } },
    { path: "/biblioteca/revisiones/:revision", component: LibraryReviewDetailPage, meta: { requiresAuth: true, roles: ["bibliotecario"], title: "Revisión de bibliografía" } },


    { path: "/:pathMatch(.*)*", component: NotFoundPage, meta: { title: "Página no encontrada" } },
  ],
});

router.afterEach(trackSettingsReturn);

router.beforeEach(async (to) => {
  const needsSession = to.meta.requiresAuth === true || to.meta.guest === true;
  const session = needsSession ? await sessionState.load() : null;

  if (to.meta.guest === true) {
    if (!session && typeof to.query.redirect === "string") {
      const intended = router.resolve(to.query.redirect);
      rememberIntendedRoute(to.query.redirect, intended.matched.some((record) => record.meta.requiresAuth === true));
    }
    if (!session) {
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
