export const reference = {
  repository: '../proyecto-grado-silabos',
  commit: '4e33b6d',
  frontendRoot: 'resources/js',
};

export const pages = [
  { id: 'ADM-04', source: 'pages/Admin/Academic/Index.vue', target: 'pages/AcademicGovernancePage.vue', routes: ['/administracion/estructura-academica'] },
  { id: 'ADM-10', source: 'pages/Admin/Operations/Audit.vue', target: 'pages/AdminAuditPage.vue', routes: ['/administracion/auditoria'] },
  { id: 'ADM-09', source: 'pages/Admin/Operations/Jobs.vue', target: 'pages/AdminJobsPage.vue', routes: ['/administracion/trabajos'] },
  { id: 'ADM-12', source: 'pages/Admin/Processes/Index.vue', target: 'pages/AdminProcessesPage.vue', routes: ['/administracion/procesos'] },
  { id: 'ADM-07', source: 'pages/Admin/Templates/Edit.vue', target: 'pages/AdminTemplatePage.vue', routes: ['/administracion/plantilla'], state: 'edicion' },
  { id: 'ADM-05', source: 'pages/Admin/Templates/Index.vue', target: 'pages/AdminTemplatePage.vue', routes: ['/administracion/plantilla'], state: 'indice' },
  { id: 'ADM-06', source: 'pages/Admin/Templates/Show.vue', target: 'pages/AdminTemplatePage.vue', routes: ['/administracion/plantilla'], state: 'lectura' },
  { id: 'ADM-02', source: 'pages/Admin/Users/Index.vue', target: 'pages/AdminUsersPage.vue', routes: ['/administracion/usuarios'] },
  { id: 'ADM-03', source: 'pages/Admin/Users/Show.vue', target: 'pages/AdminUserDetailPage.vue', routes: ['/administracion/usuarios/:user'] },
  { id: 'COR-13', source: 'pages/Coordination/Academic/CurriculumBuilder.vue', target: 'pages/CoordinationAcademicStructurePage.vue', routes: ['/coordinacion/malla'], state: 'curriculum' },
  { id: 'COR-14', source: 'pages/Coordination/Academic/ScheduledSubjects.vue', target: 'pages/CoordinationAcademicStructurePage.vue', routes: ['/coordinacion/materias-paralelos'], state: 'schedule' },
  { id: 'COR-15', source: 'pages/Coordination/Academic/TeacherAssignments.vue', target: 'pages/CoordinationAcademicStructurePage.vue', routes: ['/coordinacion/asignaciones-docentes'], state: 'teachers' },
  { id: 'COR-02', source: 'pages/Coordination/Convocations/Index.vue', target: 'pages/CoordinationConvocationsPage.vue', routes: ['/coordinacion/convocatorias'] },
  { id: 'COR-03', source: 'pages/Coordination/Convocations/Show.vue', target: 'pages/CoordinationConvocationDetailPage.vue', routes: ['/coordinacion/convocatorias/:convocation'] },
  { id: 'COR-12', source: 'pages/Coordination/Reports/Index.vue', target: 'pages/CoordinationReportsPage.vue', routes: ['/coordinacion/informes'] },
  { id: 'COR-05', source: 'pages/Coordination/Reviews/Index.vue', target: 'pages/CoordinationReviewsPage.vue', routes: ['/coordinacion/revisiones'] },
  { id: 'COR-06', source: 'pages/Coordination/Reviews/Show.vue', target: 'pages/CoordinationReviewDetailPage.vue', routes: ['/coordinacion/revisiones/:revision'] },
  { id: 'ADM-01/COR-01/DOC-01', source: 'pages/Dashboard.vue', target: 'pages/DashboardPage.vue', routes: ['/panel'] },
  { id: 'UI-03', source: 'pages/Notifications/Index.vue', target: 'pages/NotificationsPage.vue', routes: ['/notificaciones'] },
  { id: 'UI-02', source: 'pages/Role/Select.vue', target: 'pages/WorkspacePage.vue', routes: ['/'] },
  { id: 'COR-11', source: 'pages/Sources/Index.vue', target: 'pages/CoordinationSourcesPage.vue', routes: ['/coordinacion/fuentes'] },
  { id: 'COR-11', source: 'pages/Sources/Show.vue', target: 'pages/CoordinationSourceDetailPage.vue', routes: ['/coordinacion/fuentes/:source'] },
  { id: 'COR-09/DOC-09', source: 'pages/Syllabi/Compare.vue', target: 'pages/CoordinationReviewComparisonPage.vue', routes: ['/coordinacion/revisiones/:before/comparar/:after'] },
  { id: 'DOC-10', source: 'pages/Syllabi/Documents.vue', target: 'pages/DocumentsPage.vue', routes: ['/revisiones/:revision/documentos'] },
  { id: 'DOC-06', source: 'pages/Teacher/Syllabi/Ai.vue', target: 'pages/TeacherSyllabusDetailPage.vue', routes: ['/mis-silabos/:syllabus'], state: 'ia' },
  { id: 'DOC-04', source: 'pages/Teacher/Syllabi/Edit.vue', target: 'pages/TeacherSyllabusDetailPage.vue', routes: ['/mis-silabos/:syllabus'], state: 'edicion' },
  { id: 'DOC-02', source: 'pages/Teacher/Syllabi/Index.vue', target: 'pages/TeacherSyllabiPage.vue', routes: ['/mis-silabos'] },
  { id: 'DOC-03', source: 'pages/Teacher/Syllabi/Show.vue', target: 'pages/TeacherSyllabusDetailPage.vue', routes: ['/mis-silabos/:syllabus'], state: 'resumen' },
  { id: 'DOC-08', source: 'pages/Teacher/Syllabi/Submit.vue', target: 'pages/TeacherSyllabusDetailPage.vue', routes: ['/mis-silabos/:syllabus'], state: 'envio' },
  { id: 'UI-04', source: 'pages/auth/ConfirmPassword.vue', target: 'pages/SecurityPage.vue', routes: ['/configuracion/seguridad'], state: 'confirmacion' },
  { id: 'UI-01', source: 'pages/auth/ForgotPassword.vue', target: 'pages/PasswordRecoveryPage.vue', routes: ['/recuperar-contrasena'] },
  { id: 'UI-01', source: 'pages/auth/Login.vue', target: 'pages/LoginPage.vue', routes: ['/ingresar'] },
  { id: 'UI-01', source: 'pages/auth/ResetPassword.vue', target: 'pages/ResetPasswordPage.vue', routes: ['/restablecer-contrasena'] },
  { id: 'UI-01', source: 'pages/auth/TwoFactorChallenge.vue', target: 'pages/TwoFactorChallengePage.vue', routes: ['/verificar-dos-factores'] },
  { id: 'UI-01', source: 'pages/auth/VerifyEmail.vue', target: 'pages/VerifyEmailPage.vue', routes: ['/verificar-correo'] },
  { id: 'UI-04', source: 'pages/settings/Appearance.vue', target: 'pages/AppearancePage.vue', routes: ['/configuracion/apariencia'] },
  { id: 'UI-04', source: 'pages/settings/Profile.vue', target: 'pages/ProfilePage.vue', routes: ['/configuracion/perfil'] },
  { id: 'UI-04', source: 'pages/settings/Security.vue', target: 'pages/SecurityPage.vue', routes: ['/configuracion/seguridad'] },
].map((page) => ({ ...page, status: 'pendiente' }));

export const allowedAliasRoutes = [
  '/seguridad',
  '/coordinacion/estructura-academica',
  // Callback técnico firmado: no representa una pantalla de producto adicional.
  '/api/v1/authentication/email-verification/:user/:hash',
];

export const allowedSpaOnlyRoots = [
  'api',
  'state',
  'test',
];
