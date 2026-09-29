import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import TemplatePartKindPicker from '@/components/domain/configuration/TemplatePartKindPicker.vue';
import { emptyPartChoice, NEW_CONCEPT, partChoiceErrors, partChoicePayload } from '@/lib/templateParts';
import type { TemplateVariable } from '@/lib/templateDocument';

const lists: TemplateVariable[] = [
    { key: 'curricular_habilidades_blandas', label: 'Habilidades blandas', sample: '', type: 'lista', scope: 'asignatura' },
    { key: 'nombre_carrera', label: 'Nombre de la carrera', sample: 'Software' },
];

const mountPicker = (contentType: string, variables: TemplateVariable[] = lists, allowAutomatic = true) => {
    const choice = ref(emptyPartChoice(contentType));
    const wrapper = mount({
        components: { TemplatePartKindPicker },
        setup: () => ({ choice, variables, allowAutomatic }),
        template: '<TemplatePartKindPicker id-prefix="p" v-model="choice.content_type" v-model:options-sources="choice.options_sources" v-model:concept-key="choice.concept_key" v-model:concept="choice.concept" :variables="variables" :allow-automatic="allowAutomatic" />',
    }, { attachTo: document.body });

    return { wrapper, choice };
};

describe('TemplatePartKindPicker', () => {
    afterEach(() => { document.body.innerHTML = ''; });

    it('pregunta quién llena la parte sin términos técnicos', () => {
        const { wrapper } = mountPicker('text');
        expect(wrapper.text()).toContain('¿Quién llena esta parte?');
        expect(wrapper.text()).toContain('El docente la escribe');
        expect(wrapper.text()).toContain('Sale sola de los documentos de la carrera');
        expect(wrapper.text()).not.toMatch(/repetible|variable/i);
        expect(wrapper.get('#p-writes').attributes('data-state')).toBe('checked');
        expect(wrapper.text()).toContain('¿Cómo la escribe?');
    });

    it('elegir «Sale sola» propone el primer dato declarado y permite declarar uno nuevo', async () => {
        const { wrapper, choice } = mountPicker('text');
        await wrapper.get('#p-automatic').trigger('click');
        await flushPromises();
        expect(choice.value.content_type).toBe('automatic');
        expect(choice.value.concept_key).toBe('habilidades_blandas');
        expect(wrapper.text()).toContain('Dato de los documentos');
        choice.value.concept_key = NEW_CONCEPT;
        await flushPromises();
        expect(wrapper.find('#p-concept-label').exists()).toBe(true);
        expect(wrapper.text()).toContain('¿De quién es?');
    });

    it('el texto fijo es una respuesta más a quién llena la parte', async () => {
        const { wrapper, choice } = mountPicker('text');
        expect(wrapper.text()).toContain('Nadie, es un texto fijo');
        await wrapper.get('#p-fixed').trigger('click');
        await flushPromises();
        expect(choice.value.content_type).toBe('fixed');
        expect(wrapper.text()).toContain('escriba el texto directamente en la hoja');
        expect(partChoicePayload(choice.value)).toEqual({ content_type: 'fixed', options_sources: [] });
        expect(partChoiceErrors(choice.value)).toEqual({});
    });

    it('sin listas declaradas, «elige de una lista» está deshabilitado y lo explica', () => {
        const { wrapper } = mountPicker('text', [lists[1]!]);
        expect(wrapper.get('#p-chooses').attributes('disabled')).toBeDefined();
        expect(wrapper.text()).toContain('Primero agregue una parte que salga de los documentos como lista');
    });

    it('al editar no ofrece el dato automático y conserva una parte Sí/No anterior', async () => {
        const { wrapper } = mountPicker('boolean', lists, false);
        await flushPromises();
        expect(wrapper.find('#p-automatic').exists()).toBe(false);
        expect(wrapper.find('#p-fixed').exists()).toBe(false);
        expect(wrapper.get('#p-form').text()).toContain('Una respuesta Sí / No');
    });
});

describe('partChoicePayload y partChoiceErrors', () => {
    it('envía el dato declarado, uno nuevo o las listas según quién llena la parte', () => {
        const choice = emptyPartChoice('automatic');
        expect(partChoiceErrors(choice)).toHaveProperty('concept');
        choice.concept_key = 'bibliografia_basica';
        expect(partChoicePayload(choice)).toEqual({ content_type: 'automatic', options_sources: [], concept_key: 'bibliografia_basica' });
        choice.concept_key = NEW_CONCEPT;
        choice.concept = { label: '  Bibliografía básica ', type: 'lista', scope: 'asignatura' };
        expect(partChoiceErrors(choice)).toEqual({});
        expect(partChoicePayload(choice)).toEqual({ content_type: 'automatic', options_sources: [], concept: { label: 'Bibliografía básica', type: 'lista', scope: 'asignatura' } });
        const chooses = { ...emptyPartChoice('multiple_choice') };
        expect(partChoiceErrors(chooses)).toHaveProperty('options_sources');
        expect(partChoicePayload({ ...emptyPartChoice('text'), options_sources: ['x'] })).toEqual({ content_type: 'text', options_sources: [] });
    });
});
