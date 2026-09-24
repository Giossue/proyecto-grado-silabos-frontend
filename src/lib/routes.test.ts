import { describe, expect, it } from 'vitest';
import { paths, roleEntry, roleHome, roleSetting, routeRegistry } from '@/lib/routes';

describe('contrato de rutas', () => {
  it('construye destinos dinámicos sin permitir segmentos ambiguos', () => {
    expect(paths.coordination.source('fuente/1')).toBe('/coordinacion/fuentes/fuente%2F1');
    expect(paths.coordination.comparison('antes', 'después')).toBe(
      '/coordinacion/revisiones/antes/comparar/despu%C3%A9s',
    );
  });

  it('resuelve el panel y configuración del rol activo', () => {
    expect(roleHome('administrador')).toBe(paths.admin.panel);
    expect(roleHome('coordinador')).toBe(paths.coordination.panel);
    expect(roleHome('docente')).toBe(paths.teacher.panel);
    expect(roleSetting('docente', 'security')).toBe(paths.teacher.security);
  });

  it('envía a Docencia directamente a sus sílabos al entrar', () => {
    expect(roleEntry('docente')).toBe(paths.teacher.syllabi);
    expect(roleEntry('coordinador')).toBe(paths.coordination.panel);
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
    expect(routeRegistry.find((route) => route.name === 'admin-template')?.states).toEqual([
      'indice',
      'lectura',
      'edicion',
    ]);
  });
});
