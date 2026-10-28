import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { installPageAnnouncements, tabTitle } from '@/lib/pageAnnouncement';

const Empty = { template: '<div />' };

describe('anuncio de página', () => {
  afterEach(() => { document.body.innerHTML = ''; document.title = ''; });

  it('actualiza el título y mueve el foco al contenido al cambiar de pantalla', async () => {
    document.body.innerHTML = '<main id="contenido" tabindex="-1"></main>';
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/auditoria', component: Empty, meta: { title: 'Auditoría' } },
        { path: '/docente/mis-silabos', component: Empty, meta: { title: 'Mis sílabos' } },
        { path: '/ingresar', component: Empty, meta: { title: 'Ingresar' } },
      ],
    });
    installPageAnnouncements(router);

    await router.push('/admin/auditoria');
    expect(document.title).toBe('Admin · Sílabos UEB');
    expect(document.activeElement).not.toBe(document.getElementById('contenido'));

    await router.push('/docente/mis-silabos');
    await nextTick();
    expect(document.title).toBe('Docente · Sílabos UEB');
    expect(document.activeElement).toBe(document.getElementById('contenido'));

    await router.push('/ingresar');
    expect(document.title).toBe('Sílabos UEB');
  });

  it('nombra el rol de cada área', () => {
    expect(tabTitle('/coordinacion/revisiones/r1')).toBe('Coordinador · Sílabos UEB');
    expect(tabTitle('/biblioteca/historial')).toBe('Biblioteca · Sílabos UEB');
    expect(tabTitle('/rol')).toBe('Sílabos UEB');
  });
});
