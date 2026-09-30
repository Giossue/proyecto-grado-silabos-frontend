import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TemplateTableInsertMenu from '@/components/domain/configuration/template-table/TemplateTableInsertMenu.vue';

const passthrough = { template: '<div><slot /></div>' };

const mountMenu = (keys: string[]) => mount(TemplateTableInsertMenu, {
  props: {
    disabled: false,
    variables: keys.map((key) => ({ key, label: `Etiqueta ${key}`, sample: '' })),
  },
  global: {
    stubs: {
      DropdownMenu: passthrough,
      DropdownMenuTrigger: passthrough,
      DropdownMenuContent: passthrough,
      DropdownMenuGroup: { template: '<section class="group"><slot /></section>' },
      DropdownMenuSeparator: { template: '<hr />' },
      DropdownMenuSub: { template: '<div class="sub"><slot /></div>' },
      DropdownMenuSubTrigger: { template: '<p class="sub-trigger"><slot /></p>' },
      DropdownMenuSubContent: passthrough,
      DropdownMenuItem: { emits: ['select'], template: '<button type="button" class="item" @click="$emit(\'select\')"><slot /></button>' },
    },
  },
});

describe('TemplateTableInsertMenu', () => {
  it('separa las firmas de los datos automáticos en su propio grupo y en orden de firma', async () => {
    const wrapper = mountMenu(['firma_bibliotecario', 'nombre_carrera', 'firma_docente', 'curricular_resultados', 'firma_coordinador']);

    const subs = wrapper.findAll('.sub');
    const automatic = subs.find((sub) => sub.get('.sub-trigger').text() === 'Dato automático')!;
    const signatures = subs.find((sub) => sub.get('.sub-trigger').text() === 'Firma')!;
    expect(automatic.findAll('.item').map((item) => item.text())).toEqual(['Etiqueta nombre_carrera']);
    expect(signatures.findAll('.item').map((item) => item.text())).toEqual([
      'Etiqueta firma_docente',
      'Etiqueta firma_coordinador',
      'Etiqueta firma_bibliotecario',
    ]);

    await signatures.findAll('.item')[2]!.trigger('click');
    expect(wrapper.emitted('insertVariable')?.[0]?.[0]).toMatchObject({ key: 'firma_bibliotecario' });
  });

  it('no muestra el grupo Firma si el catálogo no trae firmas', () => {
    const wrapper = mountMenu(['nombre_carrera']);

    expect(wrapper.findAll('.sub-trigger').map((item) => item.text())).toEqual(['Dato automático']);
  });
});
