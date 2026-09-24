<script setup lang="ts">
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Italic,
    Underline,
} from '@lucide/vue';
import type { Editor } from '@tiptap/vue-3';
import {
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { DOCUMENT_TEXT_COLORS } from '@/lib/documentPalette';
import { DOCUMENT_FONTS } from '@/lib/templateDocument';

defineProps<{
    state: Editor;
}>();
const textColors = DOCUMENT_TEXT_COLORS;
</script>

<template>
    <ContextMenuGroup>
        <ContextMenuItem @select="state.chain().focus().toggleBold().run()">
            <Bold />
            Negrita
        </ContextMenuItem>
        <ContextMenuItem @select="state.chain().focus().toggleItalic().run()">
            <Italic />
            Cursiva
        </ContextMenuItem>
        <ContextMenuItem
            @select="state.chain().focus().toggleUnderline().run()"
        >
            <Underline />
            Subrayado
        </ContextMenuItem>
        <ContextMenuSub>
            <ContextMenuSubTrigger> Tipo de fuente </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuGroup>
                    <ContextMenuItem
                        v-for="font in DOCUMENT_FONTS"
                        :key="font"
                        @select="
                            state.chain().focus().setFontFamily(font).run()
                        "
                    >
                        {{ font }}
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
            <ContextMenuSubTrigger> Color de fuente </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuGroup>
                    <ContextMenuItem
                        v-for="color in textColors"
                        :key="color.value"
                        @select="
                            state.chain().focus().setColor(color.value).run()
                        "
                    >
                        <span
                            class="size-3 rounded-full border"
                            :style="{
                                backgroundColor: color.value,
                            }"
                        />
                        {{ color.label }}
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
            <ContextMenuSubTrigger>
                Alineación del texto
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuGroup>
                    <ContextMenuItem
                        @select="
                            state.chain().focus().setTextAlign('left').run()
                        "
                    >
                        <AlignLeft />
                        Izquierda
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="
                            state.chain().focus().setTextAlign('center').run()
                        "
                    >
                        <AlignCenter />
                        Centro
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="
                            state.chain().focus().setTextAlign('right').run()
                        "
                    >
                        <AlignRight />
                        Derecha
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="
                            state.chain().focus().setTextAlign('justify').run()
                        "
                    >
                        <AlignJustify />
                        Justificar
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
            <ContextMenuSubTrigger> Lista </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuGroup>
                    <ContextMenuItem
                        @select="state.chain().focus().toggleBulletList().run()"
                    >
                        Lista con viñetas
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="
                            state.chain().focus().toggleOrderedList().run()
                        "
                    >
                        Lista numerada
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem @select="state.chain().focus().unsetAllMarks().run()">
            Quitar formato
        </ContextMenuItem>
    </ContextMenuGroup>
</template>
