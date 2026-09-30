import { describe, expect, it } from 'vitest';
import { areaForPath, paths, roleDocuments, roleEntry, roleHome, roleNotifications, roleSetting, routeRegistry, type RoleCode } from '@/lib/routes';

describe('contrato de rutas', () => {
  it('construye destinos dinámicos sin permitir segmentos ambiguos', () => {
    expect(paths.teacher.syllabus('silabo/1')).toBe('/docente/mis-silabos/silabo%2F1');
    expect(paths.coordination.comparison('antes', 'después')).toBe(
      '/coordinacion/revisiones/antes/comparar/despu%C3%A9s',
    );
  });

  it('resuelve el panel y configuración del rol activo', () => {
    expect(roleHome('administrador')).toBe(paths.admin.panel);
    expect(roleHome('coordinador')).toBe(paths.coordination.panel);
    expect(roleHome('docente')).toBe(paths.teacher.panel);
    expect(roleSetting('docente', 'security')).toBe(paths.teacher.security);
    expect(roleHome('bibliotecario')).toBe('/biblioteca/panel');
    expect(roleSetting('bibliotecario', 'profile')).toBe('/biblioteca/configuracion/perfil');
    expect(roleNotifications('bibliotecario')).toBe('/biblioteca/notificaciones');
    expect(roleDocuments('bibliotecario', 'revision-1')).toBe('/biblioteca/revisiones/revision-1');
    expect(roleDocuments('coordinador', 'revision-1')).toBe('/coordinacion/revisiones/revision-1/documentos');
    expect(areaForPath('/biblioteca/configuracion/perfil')).toBe('library');
    expect(areaForPath('/configuracion/perfil')).toBeNull();
  });

  it('no trata un rol desconocido como docente', () => {
    const unknown = 'rol_futuro' as RoleCode;
    expect(roleHome(unknown)).toBe(paths.roleSelection);
    expect(roleEntry(unknown)).toBe(paths.roleSelection);
    expect(roleSetting(unknown, 'profile')).toBe(paths.roleSelection);
    expect(roleNotifications(unknown)).toBe(paths.roleSelection);
    expect(roleDocuments(unknown, 'revision-1')).toBe(paths.roleSelection);
  });

  it('envía a Docencia directamente a sus sílabos al entrar', () => {
    expect(roleEntry('docente')).toBe(paths.teacher.syllabi);
    expect(roleEntry('coordinador')).toBe(paths.coordination.panel);
    expect(roleEntry('bibliotecario')).toBe(paths.library.panel);
    expect(roleEntry(undefined)).toBe(paths.roleSelection);
  });

  it('identifica rutas canónicas y alias en el registro', () => {
    expect(routeRegistry.find((route) => route.name === 'login')?.path).toBe(paths.login);
    expect(routeRegistry.find((route) => route.name === 'legacy-login')?.aliasOf).toBe(paths.login);
  });

  it('mantiene destinos únicos y metadatos de autorización', () => {
    const canonical = routeRegistry.filter((route) => !route.aliasOf);
    expect(new Set(canonical.map((route) => route.path)).size).toBe(canonical.length);
    expect(routeRegistry.find((route) => route.name === 'admin-users')).toMatchObject({
      component: 'AdminUsersPage',
      roles: ['administrador'],
      requiresAuth: true,
    });
    expect(routeRegistry.find((route) => route.name === 'teacher-syllabus')).toMatchObject({
      component: 'TeacherSyllabusDetailPage',
      states: ['resumen', 'edicion', 'ia', 'envio'],
      layout: 'syllabus-editor',
      roles: ['docente'],
      requiresAuth: true,
    });
    expect(routeRegistry.find((route) => route.name === 'library-review')).toMatchObject({
      path: '/biblioteca/revisiones/:revision',
      component: 'LibraryReviewDetailPage',
      roles: ['bibliotecario'],
      requiresAuth: true,
    });
    expect(routeRegistry.find((route) => route.name === 'admin-template')?.states).toEqual([
      'indice',
      'lectura',
      'edicion',
    ]);
  });
});
