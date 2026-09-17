import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { router } from '@/router';
import { sessionState } from '@/state/session';

const session = (code: 'administrador' | 'coordinador' | 'docente') => ({
  user: {
    id: 'user-1',
    name: 'Persona de prueba',
    email: 'persona@example.test',
    email_verified: true,
    must_change_password: false,
    can_edit_identity: code === 'administrador',
  },
  active_role: { id: `role-${code}`, code, career_id: code === 'administrador' ? null : 'career-1', career_name: code === 'administrador' ? null : 'Software' },
  available_roles: [],
});

describe('navegación por ámbito activo', () => {
  beforeEach(() => sessionState.replace(session('administrador')));
  afterEach(async () => {
    sessionState.clear();
    await router.replace('/ingresar');
  });

  it('reconoce la URL canónica de Administración', async () => {
    await router.push('/admin/usuarios');

    expect(router.currentRoute.value.fullPath).toBe('/admin/usuarios');
  });

  it('resuelve la dirección corta del panel al área activa', async () => {
    sessionState.replace(session('coordinador'));
    await router.push('/dashboard');

    expect(router.currentRoute.value.fullPath).toBe('/coordinacion/panel');
  });

  it('recupera una URL administrativa del historial según el rol real', async () => {
    sessionState.replace(session('docente'));
    await router.push('/admin/usuarios');

    expect(router.currentRoute.value.fullPath).toBe('/docente/panel');
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

    expect(router.currentRoute.value.path).toBe('/ingresar');
    expect(router.currentRoute.value.query.redirect).toBe('/admin/usuarios');
  });
});
