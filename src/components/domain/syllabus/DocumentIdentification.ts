import { defineComponent, h, type PropType } from 'vue';
import { renderFreeText } from '@/components/domain/syllabus/freeTextRender';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { identificationTable } from '@/lib/blockLayouts';
import { identificationSlotText, type Disability } from '@/lib/templateDocument';

export default defineComponent({
    name: 'DocumentIdentification',
    props: { disability: { type: Object as PropType<Disability>, required: true }, interactive: { type: Boolean, default: false } },
    emits: ['update'],
    setup(props, { emit }) {
        const change = (changes: Partial<Disability>): void => emit('update', { ...props.disability, ...changes } satisfies Disability);
        const answer = (value: 'si' | 'no', checked: boolean | 'indeterminate'): void => {
            if (checked === true) change({ answer: value, ...(value === 'no' ? { type: '', description: '' } : {}) });
            else if (props.disability.answer === value) change({ answer: null, type: '', description: '' });
        };
        const slot = (id: string) => {
            if (!props.interactive) return identificationSlotText(id, props.disability);
            if (id === 'discapacidad_si' || id === 'discapacidad_no') {
                const value = id === 'discapacidad_si' ? 'si' : 'no';

                return h(Checkbox, {
                    modelValue: props.disability.answer === value,
                    'aria-label': value === 'si' ? 'Hay estudiantes con discapacidad' : 'No hay estudiantes con discapacidad',
                    'onUpdate:modelValue': (checked: boolean | 'indeterminate') => answer(value, checked),
                });
            }
            const field = id === 'discapacidad_tipo' ? 'type' : 'description';

            return h(Input, {
                modelValue: props.disability[field],
                maxlength: 500,
                disabled: props.disability.answer !== 'si',
                class: 'h-7 min-w-24 px-2 py-0',
                'aria-label': field === 'type' ? 'Tipo de discapacidad' : 'Breve descripción de la discapacidad',
                'onUpdate:modelValue': (text: string | number) => change({ [field]: String(text) }),
            });
        };

        return () => {
            const table = identificationTable();

            return table === null ? h('p', {}, 'Identificación institucional') : renderFreeText(table, { variable: slot });
        };
    },
});
