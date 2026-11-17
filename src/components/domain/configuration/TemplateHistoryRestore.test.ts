import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { typeConfirmation } from '@/test/confirmPhrase';
import AdminTemplatePage from '@/pages/AdminTemplatePage.vue';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSession } from '@/api/session';
import { getTemplate, getTemplateVersion, getTemplateVersions, importTemplateJson, type TemplatePayload } from '@/api/template';
import { getTemplateAssistant } from '@/api/templateAssistant';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ replace: vi.fn() }),
  useRoute: () => ({ fullPath: '/administracion/plantilla' }),
  onBeforeRouteLeave: vi.fn(),
}));
vi.mock('@/api/session', () => ({ getSession: vi.fn() }));
vi.mock('@/api/templateAssistant', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/templateAssistant')>()),
  getTemplateAssistant: vi.fn(),
}));
vi.mock('@/components/domain/ai/avatar/useAvatarController', async () => {
  const { ref } = await import('vue');
  return { useAvatarController: () => ({ state: ref({}) }) };
});
vi.mock('@/api/template', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/template')>()),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(),
  importTemplateJson: vi.fn(),
  getTemplateVersions: vi.fn(),
  getTemplateVersion: vi.fn(),
  getTemplateVersionComparison: vi.fn(),
}));

const doc = { type: 'doc' as const, content: [{ type: 'paragraph' }] };
const payload: TemplatePayload = {
  processLock: null,
  template: {
    id: 'template-1', name: 'Plantilla institucional', description: null, titleBlock: { text: 'SÍLABO' },
    sections: [{ id: 'section-1', key: 'descripcion', title: 'Descripción de la asignatura', orientation: 'portrait', fields: [
      { id: 'field-1', key: 'descripcion', label: 'Descripción', quien_llena: 'carrera', content: doc },
    ] }],
  },
};
const versions = [
  { id: 'v2', number: 2, saved_at: '2026-11-16T15:30:00Z', saved_by: 'Ana Pérez', sections: 1, fields: 1, current: true },
  { id: 'v1', number: 1, saved_at: '2026-11-10T13:00:00Z', saved_by: 'Sistema', sections: 1, fields: 2, current: false },
];
const draft = { title: 'SÍLABO ANTIGUO', layout: { margin_cm: 1.5, title_font_size: 14, section_font_size: 11, body_font_size: 11 }, sections: [
  { key: 'descripcion', title: 'Descripción antigua', orientation: 'portrait' as const, fields: [
    { key: 'descripcion', label: 'Descripción', quien_llena: 'carrera' as const, content: doc },
    { key: 'objetivos', label: 'Objetivos', quien_llena: 'carrera' as const, content: doc },
  ] },
] };

const mountPage = () => mount({
  components: { AdminTemplatePage, TooltipProvider },
  template: '<TooltipProvider><AdminTemplatePage /></TooltipProvider>',
}, { attachTo: document.body });
const click = async (label: string, root: ParentNode = document.body): Promise<void> => {
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === label || button.getAttribute('aria-label') === label)!.click();
  await flushPromises();
};

describe('Restaurar una versión de la plantilla', () => {
  enableAutoUnmount(afterEach);
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '';
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'admin-1', name: 'Administración', email: 'admin@ueb.edu.ec', email_verified: true, can_edit_identity: true },
      active_role: { id: 'role-1', code: 'administrador', career_id: null, career_name: null },
      available_roles: [],
    });
    vi.mocked(getTemplate).mockResolvedValue(payload);
    vi.mocked(getTemplateAssistant).mockResolvedValue({ available: true, locked: false, suggestions: [], messages: [] });
    vi.mocked(getTemplateVersions).mockResolvedValue({ versions });
    vi.mocked(getTemplateVersion).mockResolvedValue({ ...versions[1]!, json: {}, draft });
  });

  it('carga la versión en el borrador del editor, sin guardar, tras la confirmación de editar', async () => {
    const wrapper = mountPage();
    await flushPromises();

    await click('Historial');
    await click('Restaurar', document.body.querySelector('[data-version="1"]')!);
    await click('Cargar en el editor');
    typeConfirmation('template-edit-confirm', 'editar plantilla');
    await flushPromises();
    await click('Continuar');

    expect(getTemplateVersion).toHaveBeenCalledWith('template-1', 'v1');
    expect(importTemplateJson).not.toHaveBeenCalled();
    expect(wrapper.get<HTMLTextAreaElement>('[aria-label="Sección Descripción antigua"]').element.value).toBe('Descripción antigua');
    expect(wrapper.findAll('[data-field-editor]')).toHaveLength(2);
    expect(wrapper.get<HTMLTextAreaElement>('[aria-label="Título del documento"]').element.value).toBe('SÍLABO ANTIGUO');
    expect(wrapper.find('[aria-label="Cinta de edición de la plantilla"] [data-unsaved]').exists()).toBe(true);
  });

  it('«Editar» sin restaurar abre la plantilla guardada, no una versión pedida antes', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await click('Historial');
    await click('Restaurar', document.body.querySelector('[data-version="1"]')!);
    await click('Cargar en el editor');
    await click('Cancelar');

    await click('Editar');
    typeConfirmation('template-edit-confirm', 'editar plantilla');
    await flushPromises();
    await click('Continuar');

    expect(wrapper.find('[aria-label="Sección Descripción antigua"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-field-editor]')).toHaveLength(1);
  });

  it('con la plantilla bloqueada no deja restaurar', async () => {
    vi.mocked(getTemplate).mockResolvedValue({ ...payload, processLock: 'Hay un proceso abierto' });
    mountPage();
    await flushPromises();

    await click('Historial');

    const restore = [...document.body.querySelector('[data-version="1"]')!.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Restaurar')!;
    expect(restore.disabled).toBe(true);
    expect(document.body.textContent).toContain('Hay un proceso abierto');
  });
});
