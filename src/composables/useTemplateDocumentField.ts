import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { computed, ref, watch } from 'vue';
import type { Ref } from 'vue';

const presentationOf = (node: ProseMirrorNode) =>
    node.attrs.listStyle === 'bullet'
        ? 'bulleted_list'
        : node.attrs.listStyle === 'number'
          ? 'numbered_list'
          : ['repetible', 'texto_corto'].includes(node.attrs.kind)
            ? 'texto_largo'
            : node.attrs.kind;

export function useTemplateDocumentField(
    selectedField: Ref<ProseMirrorNode | null>,
    persistedKeys: Set<string>,
) {
    const fieldLabel = ref('');
    const fieldType = ref('texto_largo');
    const selectedPersistedField = computed(() =>
        selectedField.value
            ? persistedKeys.has(String(selectedField.value.attrs.key))
            : false,
    );

    watch(selectedField, (node) => {
        if (node) {
            fieldLabel.value = String(node.attrs.label);
            fieldType.value = String(presentationOf(node));
        } else {
            fieldLabel.value = '';
            fieldType.value = 'texto_largo';
        }
    });

    const fieldDraftDirty = computed(
        () =>
            selectedField.value !== null &&
            ((!selectedPersistedField.value &&
                fieldLabel.value !== selectedField.value.attrs.label) ||
                fieldType.value !== presentationOf(selectedField.value)),
    );
    const fieldTypes = computed(() => {
        const all = [
            { value: 'texto_largo', label: 'Texto' },
            { value: 'bulleted_list', label: 'Lista con viñetas' },
            { value: 'numbered_list', label: 'Lista numerada' },
            { value: 'numero', label: 'Número' },
            { value: 'fecha', label: 'Fecha' },
        ];
        const node = selectedField.value;

        if (!node || !persistedKeys.has(String(node.attrs.key))) {
            return selectedField.value?.type.name === 'column'
                ? all.filter((item) => item.value !== 'fecha')
                : all;
        }

        if (
            ['texto_corto', 'texto_largo', 'repetible'].includes(
                node.attrs.kind,
            )
        ) {
            return all.slice(0, 3);
        }

        return [
            {
                value: String(node.attrs.kind),
                label:
                    node.attrs.kind === 'numero'
                        ? 'Número'
                        : node.attrs.kind === 'fecha'
                          ? 'Fecha'
                          : 'Dato del sistema',
            },
        ];
    });

    return { fieldLabel, fieldType, fieldDraftDirty, fieldTypes };
}
