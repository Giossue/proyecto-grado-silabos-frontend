import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { installPageAnnouncements } from '@/lib/pageAnnouncement';

const Empty = { template: '<div />' };

describe('anuncio de página', () => {
  afterEach(() => { document.body.innerHTML = ''; document.title = ''; });

  it('actualiza el título y mueve el foco al contenido al cambiar de pantalla', async () => {
    document.body.innerHTML = '<main id="contenido" tabindex="-1"></main>';
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/a', component: Empty, meta: { title: 'Panel' } },
        { path: '/b', component: Empty, meta: { title: 'Auditoría' } },
        { path: '/c', component: Empty },
      ],
    });
    installPageAnnouncements(router);

    await router.push('/a');
    expect(document.title).toBe('Panel · Sílabos UEB');
    expect(document.activeElement).not.toBe(document.getElementById('contenido'));

    await router.push('/b');
    await nextTick();
    expect(document.title).toBe('Auditoría · Sílabos UEB');
    expect(document.activeElement).toBe(document.getElementById('contenido'));

    await router.push('/c');
    expect(document.title).toBe('Sílabos UEB');
  });
});
