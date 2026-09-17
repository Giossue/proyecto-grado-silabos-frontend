export const reference = {
  repository: '../proyecto-grado-silabos',
  commit: '4e33b6d',
  frontendRoot: 'resources/js',
};

export const pages = [
  { id: 'ADM-04', source: 'pages/Admin/Academic/Index.vue', target: 'pages/AcademicGovernancePage.vue', routes: ['/admin/estructura-academica'] },
  { id: 'ADM-10', source: 'pages/Admin/Operations/Audit.vue', target: 'pages/AdminAuditPage.vue', routes: ['/admin/auditoria'] },
  { id: 'ADM-09', source: 'pages/Admin/Operations/Jobs.vue', target: 'pages/AdminJobsPage.vue', routes: ['/admin/procesos'] },
  { id: 'ADM-12', source: 'pages/Admin/Processes/Index.vue', target: 'pages/AdminProcessesPage.vue', routes: ['/admin/convocatorias'] },
  { id: 'ADM-07', source: 'pages/Admin/Templates/Edit.vue', target: 'pages/AdminTemplatePage.vue', routes: ['/admin/plantilla'], state: 'edicion' },
  { id: 'ADM-05', source: 'pages/Admin/Templates/Index.vue', target: 'pages/AdminTemplatePage.vue', routes: ['/admin/plantilla'], state: 'indice' },
  { id: 'ADM-06', source: 'pages/Admin/Templates/Show.vue', target: 'pages/AdminTemplatePage.vue', routes: ['/admin/plantilla'], state: 'lectura' },
  { id: 'ADM-02', source: 'pages/Admin/Users/Index.vue', target: 'pages/AdminUsersPage.vue', routes: ['/admin/usuarios'] },
  { id: 'ADM-03', source: 'pages/Admin/Users/Show.vue', target: 'pages/AdminUserDetailPage.vue', routes: ['/admin/usuarios/:user'] },
  { id: 'COR-13', source: 'pages/Coordination/Academic/CurriculumBuilder.vue', target: 'pages/CoordinationAcademicStructurePage.vue', routes: ['/coordinacion/malla'], state: 'curriculum' },
  { id: 'COR-14', source: 'pages/Coordination/Academic/ScheduledSubjects.vue', target: 'pages/CoordinationAcademicStructurePage.vue', routes: ['/coordinacion/materias-paralelos'], state: 'schedule' },
  { id: 'COR-15', source: 'pages/Coordination/Academic/TeacherAssignments.vue', target: 'pages/CoordinationAcademicStructurePage.vue', routes: ['/coordinacion/asignaciones-docentes'], state: 'teachers' },
  { id: 'COR-02', source: 'pages/Coordination/Convocations/Index.vue', target: 'pages/CoordinationConvocationsPage.vue', routes: ['/coordinacion/convocatorias'] },
  { id: 'COR-03', source: 'pages/Coordination/Convocations/Show.vue', target: 'pages/CoordinationConvocationDetailPage.vue', routes: ['/coordinacion/convocatorias/:convocation'] },
  { id: 'COR-12', source: 'pages/Coordination/Reports/Index.vue', target: 'pages/CoordinationReportsPage.vue', routes: ['/coordinacion/informes'] },
  { id: 'COR-05', source: 'pages/Coordination/Reviews/Index.vue', target: 'pages/CoordinationReviewsPage.vue', routes: ['/coordinacion/revisiones'] },
  { id: 'COR-06', source: 'pages/Coordination/Reviews/Show.vue', target: 'pages/CoordinationReviewDetailPage.vue', routes: ['/coordinacion/revisiones/:revision'] },
  { id: 'ADM-01/COR-01/DOC-01', source: 'pages/Dashboard.vue', target: 'pages/DashboardPage.vue', routes: ['/admin/panel'] },
  { id: 'UI-03', source: 'pages/Notifications/Index.vue', target: 'pages/NotificationsPage.vue', routes: ['/notificaciones'] },
  { id: 'UI-02', source: 'pages/Role/Select.vue', target: 'pages/WorkspacePage.vue', routes: ['/'] },
  { id: 'COR-11', source: 'pages/Sources/Index.vue', target: 'pages/CoordinationSourcesPage.vue', routes: ['/coordinacion/fuentes'] },
  { id: 'COR-11', source: 'pages/Sources/Show.vue', target: 'pages/CoordinationSourceDetailPage.vue', routes: ['/coordinacion/fuentes/:source'] },
  { id: 'COR-09/DOC-09', source: 'pages/Syllabi/Compare.vue', target: 'pages/CoordinationReviewComparisonPage.vue', routes: ['/coordinacion/revisiones/:before/comparar/:after'] },
  { id: 'DOC-10', source: 'pages/Syllabi/Documents.vue', target: 'pages/DocumentsPage.vue', routes: ['/revisiones/:revision/documentos'] },
  { id: 'DOC-06', source: 'pages/Teacher/Syllabi/Ai.vue', target: 'pages/TeacherSyllabusDetailPage.vue', routes: ['/docente/mis-silabos/:syllabus'], state: 'ia' },
  { id: 'DOC-04', source: 'pages/Teacher/Syllabi/Edit.vue', target: 'pages/TeacherSyllabusDetailPage.vue', routes: ['/docente/mis-silabos/:syllabus'], state: 'edicion' },
  { id: 'DOC-02', source: 'pages/Teacher/Syllabi/Index.vue', target: 'pages/TeacherSyllabiPage.vue', routes: ['/docente/mis-silabos'] },
  { id: 'DOC-03', source: 'pages/Teacher/Syllabi/Show.vue', target: 'pages/TeacherSyllabusDetailPage.vue', routes: ['/docente/mis-silabos/:syllabus'], state: 'resumen' },
  { id: 'DOC-08', source: 'pages/Teacher/Syllabi/Submit.vue', target: 'pages/TeacherSyllabusDetailPage.vue', routes: ['/docente/mis-silabos/:syllabus'], state: 'envio' },
  { id: 'UI-04', source: 'pages/auth/ConfirmPassword.vue', target: 'pages/SecurityPage.vue', routes: ['/configuracion/seguridad'], state: 'confirmacion' },
  { id: 'UI-01', source: 'pages/auth/ForgotPassword.vue', target: 'pages/PasswordRecoveryPage.vue', routes: ['/recuperar-contrasena'] },
  { id: 'UI-01', source: 'pages/auth/Login.vue', target: 'pages/LoginPage.vue', routes: ['/ingresar'] },
  { id: 'UI-01', source: 'pages/auth/ResetPassword.vue', target: 'pages/ResetPasswordPage.vue', routes: ['/restablecer-contrasena'] },
  { id: 'UI-01', source: 'pages/auth/TwoFactorChallenge.vue', target: 'pages/TwoFactorChallengePage.vue', routes: ['/verificar-dos-factores'] },
  { id: 'UI-01', source: 'pages/auth/VerifyEmail.vue', target: 'pages/VerifyEmailPage.vue', routes: ['/verificar-correo'] },
  { id: 'UI-04', source: 'pages/settings/Appearance.vue', target: 'pages/AppearancePage.vue', routes: ['/configuracion/apariencia'] },
  { id: 'UI-04', source: 'pages/settings/Profile.vue', target: 'pages/ProfilePage.vue', routes: ['/configuracion/perfil'] },
  { id: 'UI-04', source: 'pages/settings/Security.vue', target: 'pages/SecurityPage.vue', routes: ['/configuracion/seguridad'] },
].map((page) => ({
  ...page,
  status: 'adaptado_api',
  justification: {
    'AcademicGovernancePage.vue': 'Conserva las cuatro vistas canónicas y sustituye props/Inertia por carga y mutaciones de /api/v1/admin/academic.',
    'AdminAuditPage.vue': 'Conserva pestañas, filtros y tabla; obtiene la paginación desde la API JSON.',
    'AdminJobsPage.vue': 'Conserva estados, acciones y diálogos; reintentos y filtros se ejecutan por API JSON.',
    'AdminProcessesPage.vue': 'Conserva la superficie de procesos y sus hojas; reemplaza Form/router de Inertia por clientes tipados.',
    'AdminTemplatePage.vue': 'Reúne los estados índice, lectura y edición del monolito en una ruta SPA sin cambiar el constructor documental.',
    'AdminUsersPage.vue': 'Conserva listado, filtros y hojas de usuarios; carga y muta mediante la API.',
    'AdminUserDetailPage.vue': 'Conserva expediente y acciones de cuenta; obtiene el usuario por ruta Vue y API.',
    'CoordinationAcademicStructurePage.vue': 'Reúne las tres páginas académicas canónicas según la ruta activa y conserva sus componentes originales.',
    'CoordinationConvocationsPage.vue': 'Conserva listado, filtros y creación de convocatorias con frontera API.',
    'CoordinationConvocationDetailPage.vue': 'Conserva detalle, acciones y estados de convocatoria con carga API.',
    'CoordinationReportsPage.vue': 'Conserva filtros, métricas y exportaciones; las descargas usan endpoints autorizados.',
    'CoordinationReviewsPage.vue': 'Conserva la cola de revisión y sus filtros, cargada desde la API.',
    'CoordinationReviewDetailPage.vue': 'Conserva documento, observaciones y decisiones; las mutaciones usan casos de uso API.',
    'DashboardPage.vue': 'Conserva los tres estados por rol; el contexto procede de la sesión y del endpoint de panel.',
    'NotificationsPage.vue': 'Conserva listado y acciones; reemplaza la paginación Inertia por datos JSON.',
    'WorkspacePage.vue': 'Conserva la selección de ámbito; activa rol y carrera mediante Sanctum/API.',
    'CoordinationSourcesPage.vue': 'Conserva listado y hojas de fuentes; carga y muta mediante API.',
    'CoordinationSourceDetailPage.vue': 'Conserva el editor Markdown canónico con persistencia API.',
    'CoordinationReviewComparisonPage.vue': 'Conserva el comparador canónico y obtiene ambas revisiones por parámetros de Vue Router.',
    'DocumentsPage.vue': 'Conserva estados y descargas de documentos; usa URLs temporales entregadas por la API.',
    'TeacherSyllabusDetailPage.vue': 'Integra resumen, edición, envío e IA canónicos según estado del expediente; autoguarda y transiciona por API.',
    'TeacherSyllabiPage.vue': 'Conserva el listado docente y sus estados; obtiene expedientes desde la API.',
    'SecurityPage.vue': 'Integra confirmación, contraseña y 2FA canónicos con endpoints JSON; no muestra sesiones inventadas.',
    'PasswordRecoveryPage.vue': 'Conserva el formulario canónico y sustituye Form/TextLink por form nativo y RouterLink equivalentes.',
    'LoginPage.vue': 'Conserva la pantalla canónica y autentica mediante Sanctum/API.',
    'ResetPasswordPage.vue': 'Conserva la pantalla canónica y envía el token mediante API.',
    'TwoFactorChallengePage.vue': 'Conserva el reto TOTP/recuperación y verifica mediante API.',
    'VerifyEmailPage.vue': 'Conserva el estado de verificación y reenvío mediante API.',
    'AppearancePage.vue': 'Conserva los controles locales de apariencia; no requiere adaptación de dominio.',
    'ProfilePage.vue': 'Conserva las variantes canónicas editable y de solo lectura según la política expuesta por la sesión API.',
  }[page.target.split('/').at(-1)] ?? 'Sustituye únicamente navegación y transporte Inertia por Vue Router y la API JSON.',
  componentReplacements: page.source === 'pages/auth/ForgotPassword.vue'
    ? ['components/TextLink.vue']
    : page.source === 'pages/settings/Profile.vue'
      ? ['components/InputError.vue', 'components/ui/button.vue']
      : [],
}));

export const allowedExtraComponents = [
  {
    path: 'components/ApiForm.vue',
    justification: 'Adaptador interno de la frontera API que conserva el contrato de slots de los formularios canónicos sin introducir una superficie visible.',
  },
];

export const allowedExtraPages = [
  {
    path: 'pages/NotFoundPage.vue',
    justification: 'Superficie técnica de recuperación para URLs desconocidas; evita una vista blanca sin inventar una pantalla de producto del monolito.',
  },
];

export const componentAdaptationRules = [
  {
    prefix: 'components/domain/',
    justification: 'El template canónico se conserva; carga, navegación y mutaciones se conectan a clientes API tipados.',
  },
  {
    prefix: 'components/ai-elements/',
    justification: 'Ajuste de tipos TypeScript sin cambio de estructura, estilo ni comportamiento visible.',
  },
  {
    files: [
      'components/AppHeader.vue',
      'components/AppLogo.vue',
      'components/AppLogoIcon.vue',
      'components/AppShell.vue',
      'components/AppSidebar.vue',
      'components/AppSidebarHeader.vue',
      'components/AppearanceToggle.vue',
      'components/Breadcrumbs.vue',
      'components/DatePicker.vue',
      'components/ManageTwoFactor.vue',
      'components/NavMain.vue',
      'components/NavUser.vue',
      'components/PasswordInput.vue',
      'components/SetupProgress.vue',
      'components/TemporaryPasswordDialog.vue',
      'components/TextLink.vue',
      'components/TwoFactorRecoveryCodes.vue',
      'components/TwoFactorSetupModal.vue',
      'components/UserMenuContent.vue',
    ],
    justification: 'Sustituye Inertia/usePage/Wayfinder por Vue Router y el estado explícito de sesión, manteniendo la composición canónica.',
  },
];

export const allowedAliasRoutes = [
  '/seguridad',
  '/coordinacion/estructura-academica',
  '/administracion/usuarios',
  '/administracion/usuarios/:user',
  '/administracion/estructura-academica',
  '/administracion/procesos',
  '/administracion/trabajos',
  '/administracion/plantilla',
  '/administracion/auditoria',
  '/mis-silabos',
  '/mis-silabos/:syllabus',
  // Callback técnico firmado: no representa una pantalla de producto adicional.
  '/api/v1/authentication/email-verification/:user/:hash',
];

// Rutas de área generadas por la SPA. Se declaran aquí para que la auditoría no las
// confunda con páginas adicionales: cada una reutiliza una pantalla canónica.
export const allowedCanonicalRoutes = [
  '/panel',
  '/dashboard',
  '/admin/estructura-academica/:section',
  '/admin/configuracion/perfil',
  '/admin/configuracion/seguridad',
  '/admin/configuracion/apariencia',
  '/admin/notificaciones',
  '/coordinacion/panel',
  '/coordinacion/notificaciones',
  '/coordinacion/configuracion/perfil',
  '/coordinacion/configuracion/seguridad',
  '/coordinacion/configuracion/apariencia',
  '/coordinacion/revisiones/:revision/documentos',
  '/docente/panel',
  '/docente/notificaciones',
  '/docente/configuracion/perfil',
  '/docente/configuracion/seguridad',
  '/docente/configuracion/apariencia',
  '/docente/revisiones/:revision/documentos',
  '/:pathMatch(.*)*',
];

export const allowedSpaOnlyRoots = [
  'api',
  'state',
  'test',
];
