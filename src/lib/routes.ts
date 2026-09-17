/**
 * Contrato de navegación de la SPA.
 *
 * Los clientes de API mantienen sus propias rutas HTTP. Este módulo solo describe
 * destinos visibles del navegador y centraliza la construcción de parámetros para
 * evitar enlaces divergentes entre páginas y componentes.
 */
export type RoleCode = 'administrador' | 'coordinador' | 'docente';

const segment = (value: string): string => encodeURIComponent(value);

export const paths = {
  root: '/',
  login: '/login',
  loginLegacy: '/ingresar',
  passwordRecovery: '/recuperar-contrasena',
  passwordReset: '/restablecer-contrasena',
  emailVerification: (user: string, hash: string): string =>
    `/api/v1/authentication/email-verification/${segment(user)}/${segment(hash)}`,
  emailVerificationRequired: '/verificar-correo',
  twoFactorChallenge: '/verificar-dos-factores',
  roleSelection: '/rol',
  panel: '/panel',
  dashboard: '/dashboard',
  notifications: '/notificaciones',
  sources: '/fuentes',
  source: (source: string): string => `/fuentes/${segment(source)}`,
  settings: {
    root: '/settings',
    profile: '/settings/profile',
    security: '/settings/security',
    appearance: '/settings/appearance',
  },
  configuration: {
    profile: '/configuracion/perfil',
    security: '/configuracion/seguridad',
    appearance: '/configuracion/apariencia',
  },
  security: '/seguridad',
  documents: (revision: string): string =>
    `/revisiones/${segment(revision)}/documentos`,
  admin: {
    root: '/admin',
    panel: '/admin/panel',
    users: '/admin/usuarios',
    user: (user: string): string => `/admin/usuarios/${segment(user)}`,
    academic: '/admin/estructura-academica',
    academicWithSection: (section: string): string =>
      `/admin/estructura-academica?seccion=${encodeURIComponent(section)}`,
    academicSection: (section: string): string =>
      `/admin/estructura-academica/${segment(section)}`,
    convocations: '/admin/convocatorias',
    template: '/admin/plantilla',
    audit: '/admin/auditoria',
    processes: '/admin/procesos',
    profile: '/admin/configuracion/perfil',
    security: '/admin/configuracion/seguridad',
    appearance: '/admin/configuracion/apariencia',
    notifications: '/admin/notificaciones',
  },
  coordination: {
    root: '/coordinacion',
    panel: '/coordinacion/panel',
    notifications: '/coordinacion/notificaciones',
    profile: '/coordinacion/configuracion/perfil',
    security: '/coordinacion/configuracion/seguridad',
    appearance: '/coordinacion/configuracion/apariencia',
    convocations: '/coordinacion/convocatorias',
    convocation: (convocation: string): string =>
      `/coordinacion/convocatorias/${segment(convocation)}`,
    reviews: '/coordinacion/revisiones',
    review: (revision: string): string => `/coordinacion/revisiones/${segment(revision)}`,
    comparison: (before: string, after: string): string =>
      `/coordinacion/revisiones/${segment(before)}/comparar/${segment(after)}`,
    sources: '/coordinacion/fuentes',
    source: (source: string): string => `/coordinacion/fuentes/${segment(source)}`,
    academic: '/coordinacion/estructura-academica',
    curriculum: '/coordinacion/malla',
    scheduledSubjects: '/coordinacion/materias-paralelos',
    teacherAssignments: '/coordinacion/asignaciones-docentes',
    reports: '/coordinacion/informes',
    documents: (revision: string): string =>
      `/coordinacion/revisiones/${segment(revision)}/documentos`,
  },
  teacher: {
    root: '/docente',
    panel: '/docente/panel',
    notifications: '/docente/notificaciones',
    profile: '/docente/configuracion/perfil',
    security: '/docente/configuracion/seguridad',
    appearance: '/docente/configuracion/apariencia',
    syllabi: '/docente/mis-silabos',
    syllabus: (syllabus: string): string => `/docente/mis-silabos/${segment(syllabus)}`,
    documents: (revision: string): string =>
      `/docente/revisiones/${segment(revision)}/documentos`,
  },
  legacy: {
    adminUsers: '/administracion/usuarios',
    adminUser: (user: string): string => `/administracion/usuarios/${segment(user)}`,
    adminAcademic: '/administracion/estructura-academica',
    adminProcesses: '/administracion/procesos',
    adminJobs: '/administracion/trabajos',
    adminTemplate: '/administracion/plantilla',
    adminAudit: '/administracion/auditoria',
    teacherSyllabi: '/mis-silabos',
    teacherSyllabus: (syllabus: string): string => `/mis-silabos/${segment(syllabus)}`,
  },
} as const;

type RoleArea = 'admin' | 'coordination' | 'teacher';

export const rolePrefix = (role: RoleCode): RoleArea =>
  role === 'administrador' ? 'admin' : role === 'coordinador' ? 'coordination' : 'teacher';

export const roleHome = (role: RoleCode | undefined): string => {
  if (!role) return paths.root;
  const area = rolePrefix(role);
  return area === 'admin'
    ? paths.admin.panel
    : area === 'coordination'
      ? paths.coordination.panel
      : paths.teacher.panel;
};

export type RoleScopedSetting = 'profile' | 'security' | 'appearance';

export const roleSetting = (role: RoleCode, setting: RoleScopedSetting): string => {
  if (role === 'administrador') {
    return setting === 'profile' ? paths.admin.profile : setting === 'security' ? paths.admin.security : paths.admin.appearance;
  }
  const area = rolePrefix(role);
  const prefix = area === 'admin'
    ? paths.admin.root
    : area === 'coordination'
      ? paths.coordination.root
      : paths.teacher.root;
  return `${prefix}/configuracion/${setting === 'profile' ? 'perfil' : setting === 'security' ? 'seguridad' : 'apariencia'}`;
};

/** Metadatos mínimos compartidos por auditorías y guards. */
export type RouteDefinition = {
  name: string;
  path: string;
  component?: string;
  /** Estados lógicos que comparte una ruta física consolidada. */
  states?: readonly string[];
  breadcrumb?: string;
  shortcut?: 'panel' | 'notifications' | 'sources' | 'source' | 'profile' | 'security' | 'appearance' | 'documents';
  roles?: readonly RoleCode[];
  guest?: boolean;
  requiresAuth?: boolean;
  aliasOf?: string;
};

const authenticated = { requiresAuth: true } as const;
const admin = { ...authenticated, roles: ['administrador'] as const };
const coordinator = { ...authenticated, roles: ['coordinador'] as const };
const teacher = { ...authenticated, roles: ['docente'] as const };

/** Registro único de destinos visibles. Los patrones dinámicos usan la sintaxis de Vue Router. */
export const routeRegistry: readonly RouteDefinition[] = [
  { name: 'login', path: paths.login, component: 'LoginPage', guest: true },
  { name: 'password-recovery', path: paths.passwordRecovery, component: 'PasswordRecoveryPage', guest: true },
  { name: 'password-reset', path: paths.passwordReset, component: 'ResetPasswordPage', guest: true },
  { name: 'email-verification-callback', path: '/api/v1/authentication/email-verification/:user/:hash', component: 'VerifyEmailPage', guest: true },
  { name: 'email-verification-required', path: paths.emailVerificationRequired, component: 'VerifyEmailPage', ...authenticated },
  { name: 'two-factor-challenge', path: paths.twoFactorChallenge, component: 'TwoFactorChallengePage', guest: true },
  { name: 'legacy-root', path: paths.root, guest: true, aliasOf: paths.login },
  { name: 'role-selection', path: paths.roleSelection, component: 'WorkspacePage', ...authenticated },
  { name: 'legacy-panel', path: paths.panel, component: 'DashboardPage', aliasOf: paths.dashboard, ...authenticated },
  { name: 'dashboard', path: paths.dashboard, component: 'DashboardPage', shortcut: 'panel', ...authenticated },
  { name: 'notifications', path: paths.notifications, component: 'NotificationsPage', shortcut: 'notifications', ...authenticated },
  { name: 'sources', path: paths.sources, component: 'CoordinationSourcesPage', shortcut: 'sources', ...authenticated },
  { name: 'source', path: '/fuentes/:source', component: 'CoordinationSourceDetailPage', shortcut: 'source', ...authenticated },
  { name: 'settings-profile', path: paths.settings.profile, component: 'ProfilePage', shortcut: 'profile', ...authenticated },
  { name: 'settings-security', path: paths.settings.security, component: 'SecurityPage', shortcut: 'security', ...authenticated },
  { name: 'settings-appearance', path: paths.settings.appearance, component: 'AppearancePage', shortcut: 'appearance', ...authenticated },
  { name: 'settings-root', path: paths.settings.root, aliasOf: paths.settings.profile, ...authenticated },
  { name: 'profile', path: paths.configuration.profile, component: 'ProfilePage', shortcut: 'profile', ...authenticated },
  { name: 'security', path: paths.configuration.security, component: 'SecurityPage', shortcut: 'security', ...authenticated },
  { name: 'appearance', path: paths.configuration.appearance, component: 'AppearancePage', shortcut: 'appearance', ...authenticated },
  { name: 'documents', path: '/revisiones/:revision/documentos', component: 'DocumentsPage', shortcut: 'documents', ...authenticated },

  { name: 'admin-panel', path: paths.admin.panel, component: 'DashboardPage', breadcrumb: 'Panel', ...admin },
  { name: 'admin-users', path: paths.admin.users, component: 'AdminUsersPage', breadcrumb: 'Usuarios y roles', ...admin },
  { name: 'admin-user', path: '/admin/usuarios/:user', component: 'AdminUserDetailPage', breadcrumb: 'Usuarios', ...admin },
  { name: 'admin-academic', path: paths.admin.academic, component: 'AcademicGovernancePage', breadcrumb: 'Estructura académica', ...admin },
  { name: 'admin-academic-section', path: '/admin/estructura-academica/:section', component: 'AcademicGovernancePage', breadcrumb: 'Estructura académica', ...admin },
  { name: 'admin-convocations', path: paths.admin.convocations, component: 'AdminProcessesPage', breadcrumb: 'Convocatorias', ...admin },
  { name: 'admin-template', path: paths.admin.template, component: 'AdminTemplatePage', states: ['indice', 'lectura', 'edicion'], breadcrumb: 'Plantilla', ...admin },
  { name: 'admin-audit', path: paths.admin.audit, component: 'AdminAuditPage', breadcrumb: 'Auditoría', ...admin },
  { name: 'admin-processes', path: paths.admin.processes, component: 'AdminJobsPage', breadcrumb: 'Procesos', ...admin },
  { name: 'admin-profile', path: paths.admin.profile, component: 'ProfilePage', shortcut: 'profile', ...admin },
  { name: 'admin-security', path: paths.admin.security, component: 'SecurityPage', shortcut: 'security', ...admin },
  { name: 'admin-appearance', path: paths.admin.appearance, component: 'AppearancePage', shortcut: 'appearance', ...admin },
  { name: 'admin-notifications', path: paths.admin.notifications, component: 'NotificationsPage', shortcut: 'notifications', ...admin },

  { name: 'coordination-panel', path: paths.coordination.panel, component: 'DashboardPage', breadcrumb: 'Panel', ...coordinator },
  { name: 'coordination-notifications', path: paths.coordination.notifications, component: 'NotificationsPage', shortcut: 'notifications', ...coordinator },
  { name: 'coordination-profile', path: paths.coordination.profile, component: 'ProfilePage', shortcut: 'profile', ...coordinator },
  { name: 'coordination-security', path: paths.coordination.security, component: 'SecurityPage', shortcut: 'security', ...coordinator },
  { name: 'coordination-appearance', path: paths.coordination.appearance, component: 'AppearancePage', shortcut: 'appearance', ...coordinator },
  { name: 'coordination-convocations', path: paths.coordination.convocations, component: 'CoordinationConvocationsPage', breadcrumb: 'Convocatorias', ...coordinator },
  { name: 'coordination-convocation', path: '/coordinacion/convocatorias/:convocation', component: 'CoordinationConvocationDetailPage', breadcrumb: 'Convocatorias', ...coordinator },
  { name: 'coordination-reviews', path: paths.coordination.reviews, component: 'CoordinationReviewsPage', breadcrumb: 'Revisión', ...coordinator },
  { name: 'coordination-review', path: '/coordinacion/revisiones/:revision', component: 'CoordinationReviewDetailPage', breadcrumb: 'Revisión', ...coordinator },
  { name: 'coordination-comparison', path: '/coordinacion/revisiones/:before/comparar/:after', component: 'CoordinationReviewComparisonPage', breadcrumb: 'Revisión', ...coordinator },
  { name: 'coordination-sources', path: paths.coordination.sources, component: 'CoordinationSourcesPage', breadcrumb: 'Fuentes académicas', ...coordinator },
  { name: 'coordination-source', path: '/coordinacion/fuentes/:source', component: 'CoordinationSourceDetailPage', breadcrumb: 'Fuentes académicas', ...coordinator },
  { name: 'coordination-curriculum', path: paths.coordination.curriculum, component: 'CoordinationAcademicStructurePage', states: ['curriculum'], breadcrumb: 'Malla', ...coordinator },
  { name: 'coordination-scheduled-subjects', path: paths.coordination.scheduledSubjects, component: 'CoordinationAcademicStructurePage', states: ['schedule'], breadcrumb: 'Materias y paralelos', ...coordinator },
  { name: 'coordination-teacher-assignments', path: paths.coordination.teacherAssignments, component: 'CoordinationAcademicStructurePage', states: ['teachers'], breadcrumb: 'Asignación docente', ...coordinator },
  { name: 'coordination-reports', path: paths.coordination.reports, component: 'CoordinationReportsPage', breadcrumb: 'Informes', ...coordinator },
  { name: 'coordination-documents', path: '/coordinacion/revisiones/:revision/documentos', component: 'DocumentsPage', shortcut: 'documents', ...coordinator },

  { name: 'teacher-panel', path: paths.teacher.panel, component: 'DashboardPage', breadcrumb: 'Panel', ...teacher },
  { name: 'teacher-notifications', path: paths.teacher.notifications, component: 'NotificationsPage', shortcut: 'notifications', ...teacher },
  { name: 'teacher-profile', path: paths.teacher.profile, component: 'ProfilePage', shortcut: 'profile', ...teacher },
  { name: 'teacher-security', path: paths.teacher.security, component: 'SecurityPage', shortcut: 'security', ...teacher },
  { name: 'teacher-appearance', path: paths.teacher.appearance, component: 'AppearancePage', shortcut: 'appearance', ...teacher },
  { name: 'teacher-syllabi', path: paths.teacher.syllabi, component: 'TeacherSyllabiPage', breadcrumb: 'Mis sílabos', ...teacher },
  { name: 'teacher-syllabus', path: '/docente/mis-silabos/:syllabus', component: 'TeacherSyllabusDetailPage', states: ['resumen', 'edicion', 'ia', 'envio'], breadcrumb: 'Mis sílabos', ...teacher },
  { name: 'teacher-documents', path: '/docente/revisiones/:revision/documentos', component: 'DocumentsPage', shortcut: 'documents', ...teacher },

  { name: 'legacy-login', path: paths.loginLegacy, guest: true, aliasOf: paths.login },
  { name: 'legacy-admin-users', path: paths.legacy.adminUsers, ...admin, aliasOf: paths.admin.users },
  { name: 'legacy-admin-user', path: '/administracion/usuarios/:user', ...admin, aliasOf: '/admin/usuarios/:user' },
  { name: 'legacy-admin-academic', path: paths.legacy.adminAcademic, ...admin, aliasOf: paths.admin.academic },
  { name: 'legacy-admin-processes', path: paths.legacy.adminProcesses, ...admin, aliasOf: paths.admin.convocations },
  { name: 'legacy-admin-jobs', path: paths.legacy.adminJobs, ...admin, aliasOf: paths.admin.processes },
  { name: 'legacy-admin-template', path: paths.legacy.adminTemplate, ...admin, aliasOf: paths.admin.template },
  { name: 'legacy-admin-audit', path: paths.legacy.adminAudit, ...admin, aliasOf: paths.admin.audit },
  { name: 'legacy-teacher-syllabi', path: paths.legacy.teacherSyllabi, ...teacher, aliasOf: paths.teacher.syllabi },
  { name: 'legacy-teacher-syllabus', path: '/mis-silabos/:syllabus', ...teacher, aliasOf: '/docente/mis-silabos/:syllabus' },
  { name: 'legacy-security', path: paths.security, ...authenticated, aliasOf: paths.configuration.security },
  { name: 'legacy-coordination-academic', path: paths.coordination.academic, ...coordinator, aliasOf: paths.coordination.curriculum },
];
