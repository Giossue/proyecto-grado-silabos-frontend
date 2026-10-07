import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { router } from '@/router';
import { sessionState } from '@/state/session';
import { clearIntendedRoute, consumeIntendedRoute } from '@/lib/intended-route';
import type { RoleCode } from '@/lib/routes';

const session = (code: RoleCode) => {
  const global = code === 'administrador' || code === 'bibliotecario';
  return {
    user: {
      id: 'user-1',
      name: 'Persona de prueba',
      email: 'persona@example.test',
      email_verified: true,
      can_edit_identity: code === 'administrador',
    },
    active_role: { id: `role-${code}`, code, career_id: global ? null : 'career-1', career_name: global ? null : 'Software' },
    available_roles: [],
  };
};

describe('navegación por ámbito activo', () => {
  beforeEach(() => sessionState.replace(session('administrador')));
  afterEach(async () => {
    sessionState.clear();
    clearIntendedRoute();
    await router.replace('/login');
  });

  it('reconoce la URL canónica de Administración', async () => {
    await router.push('/admin/usuarios');

    expect(router.currentRoute.value.fullPath).toBe('/admin/usuarios');
  });

  it('normaliza el acceso histórico de la SPA al login canónico', async () => {
    sessionState.clear();
    await router.push('/ingresar?redirect=/admin/usuarios');

    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBeUndefined();
    expect(consumeIntendedRoute()).toBe('/admin/usuarios');
  });

  it('no conserva redirecciones externas ni rutas desconocidas', async () => {
    sessionState.clear();
    await router.push('/ingresar?redirect=https://example.com');
    expect(consumeIntendedRoute()).toBeNull();

    await router.push('/ingresar?redirect=/ruta-desconocida');
    expect(consumeIntendedRoute()).toBeNull();
  });

  it('envía la raíz pública al login canónico', async () => {
    sessionState.clear();
    await router.push('/');

    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('resuelve la dirección corta del panel al área activa', async () => {
    sessionState.replace(session('coordinador'));
    await router.push('/dashboard');

    expect(router.currentRoute.value.fullPath).toBe('/coordinacion/panel');
  });

  it.each(['/fuentes', '/fuentes/documento-1', '/coordinacion/fuentes', '/coordinacion/fuentes/documento-1'])('redirige la ruta retirada %s al panel activo', async (target) => {
    sessionState.replace(session('coordinador'));
    await router.push(target);

    expect(router.currentRoute.value.fullPath).toBe('/coordinacion/panel');
  });

  it('resuelve la configuración genérica del monolito al área activa', async () => {
    sessionState.replace(session('docente'));
    await router.push('/settings/profile');

    expect(router.currentRoute.value.fullPath).toBe('/docente/configuracion/perfil');
  });

  it('conserva el destino hasta que se elige un ámbito', async () => {
    sessionState.replace({ ...session('docente'), active_role: null });
    await router.push('/coordinacion/revisiones/revision-1');

    expect(router.currentRoute.value.fullPath).toBe('/rol');
    expect(consumeIntendedRoute()).toBe('/coordinacion/revisiones/revision-1');
  });

  it('recupera una URL administrativa del historial según el rol real', async () => {
    sessionState.replace(session('docente'));
    await router.push('/admin/usuarios');

    expect(router.currentRoute.value.fullPath).toBe('/docente/mis-silabos');
  });

  it('normaliza la URL antigua de la SPA para el rol autorizado', async () => {
    await router.push('/administracion/usuarios');

    expect(router.currentRoute.value.fullPath).toBe('/admin/usuarios');
  });

  it('no deja una ruta desconocida en blanco', async () => {
    await router.push('/esta-ruta-no-existe');

    expect(router.currentRoute.value.matched.at(-1)?.meta.title).toBe('Página no encontrada');
  });

  it('envía un acceso profundo sin sesión al login con destino interno', async () => {
    sessionState.clear();
    await router.push('/admin/usuarios');

    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBeUndefined();
    expect(consumeIntendedRoute()).toBe('/admin/usuarios');
  });

  it.each([
    ['administrador', '/admin/usuarios', '/admin/usuarios'],
    ['coordinador', '/coordinacion/malla', '/coordinacion/malla'],
    ['coordinador', '/coordinacion/proyecto-carrera', '/coordinacion/proyecto-carrera'],
    ['docente', '/docente/mis-silabos', '/docente/mis-silabos'],
    ['bibliotecario', '/biblioteca/revisiones', '/biblioteca/revisiones'],
    ['bibliotecario', '/biblioteca/revisiones/revision-1', '/biblioteca/revisiones/revision-1'],
  ] as const)('permite la ruta propia de %s y conserva sus parámetros', async (code, target, expected) => {
    sessionState.replace(session(code));
    await router.push(`${target}?pagina=2&orden=asc`);

    expect(router.currentRoute.value.fullPath).toBe(`${expected}?pagina=2&orden=asc`);
  });

  it.each([
    ['administrador', '/coordinacion/malla', '/admin/panel'],
    ['coordinador', '/admin/usuarios', '/coordinacion/panel'],
    ['docente', '/admin/plantilla', '/docente/mis-silabos'],
    ['docente', '/biblioteca/revisiones', '/docente/mis-silabos'],
    ['bibliotecario', '/coordinacion/revisiones', '/biblioteca/panel'],
    ['coordinador', '/decanato/revisiones', '/coordinacion/panel'],
  ] as const)('redirige una ruta de otro rol al panel de %s', async (code, target, expected) => {
    sessionState.replace(session(code));
    await router.push(target);

    expect(router.currentRoute.value.fullPath).toBe(expected);
  });

  it.each([
    ['/dashboard', '/biblioteca/panel'],
    ['/notificaciones', '/biblioteca/notificaciones'],
    ['/configuracion/seguridad', '/biblioteca/configuracion/seguridad'],
    ['/revisiones/revision-1/documentos', '/biblioteca/revisiones/revision-1'],
  ])('resuelve el atajo %s al área de Biblioteca', async (target, expected) => {
    sessionState.replace(session('bibliotecario'));
    await router.push(target);

    expect(router.currentRoute.value.fullPath).toBe(expected);
  });

  it('lleva a Biblioteca directo a su panel al entrar', async () => {
    sessionState.replace(session('bibliotecario'));
    await router.push('/ingresar');

    expect(router.currentRoute.value.fullPath).toBe('/biblioteca/panel');
  });

  it('no entra en bucle con un rol que la SPA aún no conoce', async () => {
    sessionState.replace(session('rol_futuro' as RoleCode));
    await router.push('/admin/usuarios');

    expect(router.currentRoute.value.fullPath).toBe('/rol');
  });
});
