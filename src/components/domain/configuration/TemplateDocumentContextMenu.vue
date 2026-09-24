<script setup lang="ts">
import {
    Braces,
    ClipboardPaste,
    Copy,
    Plus,
    Redo2,
    Scissors,
    Settings2,
    TableProperties,
    Trash2,
    Undo2,
    UserRoundPlus,
} from '@lucide/vue';
import type { Editor } from '@tiptap/vue-3';
import { computed } from 'vue';
import {
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import type { TemplateVariable } from '@/lib/templateDocument';
import TemplateDocumentTableMenu from './TemplateDocumentTableMenu.vue';
import TemplateDocumentTextMenu from './TemplateDocumentTextMenu.vue';

const props = defineProps<{
    editor: Editor;
    version: number;
    context: 'text' | 'table' | 'field';
    repeatTable?: string | null;
    fieldTypes: { value: string; label: string }[];
    variables: TemplateVariable[];
}>();
const emit = defineEmits<{
    clipboard: [action: 'cut' | 'copy' | 'paste'];
    fieldPresentation: [value: string];
    properties: [];
    insertTeacherField: [];
    insertTable: [rows: number, columns: number];
    insertVariable: [variable: TemplateVariable];
}>();
const state = computed(() => {
    void props.version;

    return props.editor;
});
</script>

<template>
    <ContextMenuContent class="w-64" aria-label="Herramientas del documento">
        <ContextMenuGroup>
            <ContextMenuItem
                :disabled="state.state.selection.empty"
                @select="emit('clipboard', 'cut')"
            >
                <Scissors />
                Cortar
            </ContextMenuItem>
            <ContextMenuItem
                :disabled="state.state.selection.empty"
                @select="emit('clipboard', 'copy')"
            >
                <Copy />
                Copiar
            </ContextMenuItem>
            <ContextMenuItem @select="emit('clipboard', 'paste')">
                <ClipboardPaste />
                Pegar
            </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <TemplateDocumentTextMenu v-if="context === 'text'" :state="state" />

        <TemplateDocumentTableMenu
            v-else-if="context === 'table'"
            :editor="state"
            :version="version"
            :repeat-table="repeatTable"
        />

        <ContextMenuGroup v-else>
            <ContextMenuSub>
                <ContextMenuSubTrigger>
                    Tipo de contenido
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                    <ContextMenuGroup>
                        <ContextMenuItem
                            v-for="kind in fieldTypes"
                            :key="kind.value"
                            @select="emit('fieldPresentation', kind.value)"
                        >
                            {{ kind.label }}
                        </ContextMenuItem>
                    </ContextMenuGroup>
                </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem @select="emit('properties')">
                <Settings2 />
                Propiedades del campo
            </ContextMenuItem>
            <ContextMenuItem
                variant="destructive"
                @select="state.chain().focus().deleteSelection().run()"
            >
                <Trash2 />
                Eliminar del diseño
            </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuGroup>
            <ContextMenuSub>
                <ContextMenuSubTrigger>
                    <Plus />
                    Insertar
                </ContextMenuSubTrigger>
                <ContextMenuSubContent class="max-h-80">
                    <ContextMenuGroup>
                        <ContextMenuItem @select="emit('insertTeacherField')">
                            <UserRoundPlus />
                            Respuesta del docente
                        </ContextMenuItem>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <TableProperties />
                                Tabla
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                <ContextMenuGroup>
                                    <ContextMenuItem
                                        @select="emit('insertTable', 2, 2)"
                                    >
                                        Tabla 2 × 2
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        @select="emit('insertTable', 3, 3)"
                                    >
                                        Tabla 3 × 3
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        @select="emit('insertTable', 4, 4)"
                                    >
                                        Tabla 4 × 4
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        @select="emit('insertTable', 5, 5)"
                                    >
                                        Tabla 5 × 5
                                    </ContextMenuItem>
                                </ContextMenuGroup>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <Braces />
                                Dato automático
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent class="max-h-72">
                                <ContextMenuGroup>
                                    <ContextMenuItem
                                        v-for="variable in variables"
                                        :key="variable.key"
                                        @select="
                                            emit('insertVariable', variable)
                                        "
                                    >
                                        <span>
                                            <span class="block font-medium">
                                                @{{ variable.key }}
                                            </span>
                                            <span
                                                class="block text-xs text-muted-foreground"
                                            >
                                                {{ variable.label }}
                                            </span>
                                        </span>
                                    </ContextMenuItem>
                                </ContextMenuGroup>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                    </ContextMenuGroup>
                </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem
                :disabled="!state.can().undo()"
                @select="state.chain().focus().undo().run()"
            >
                <Undo2 />
                Deshacer
            </ContextMenuItem>
            <ContextMenuItem
                :disabled="!state.can().redo()"
                @select="state.chain().focus().redo().run()"
            >
                <Redo2 />
                Rehacer
            </ContextMenuItem>
        </ContextMenuGroup>
    </ContextMenuContent>
</template>
