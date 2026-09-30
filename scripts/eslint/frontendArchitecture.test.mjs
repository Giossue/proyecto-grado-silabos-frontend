import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint();
const lint = async (source, filePath = 'src/components/ArchitectureFixture.vue') => {
    const [result] = await eslint.lintText(source, { filePath });
    return result.messages.filter((message) => message.ruleId?.startsWith('frontend/')).map((message) => message.messageId);
};

test('requiere primitivas compartidas para controles y ayuda visibles', async () => {
    assert.deepEqual(await lint('<template><button title="Ayuda">Enviar</button><input /><div role="button">Abrir</div></template>'), ['native', 'title', 'native', 'native']);
    assert.deepEqual(await lint('<script setup>import { h } from "vue"; const control = h("button"); window.confirm("Salir");</script><template><div /></template>'), ['native', 'confirm']);
});

test('admite composición shadcn, campos ocultos y geometría dinámica', async () => {
    assert.deepEqual(await lint('<template><Button>Enviar</Button><Input /><input type="hidden" /><input type="file" class="sr-only" /><input type="file" class="hidden" /><div :style="{width: `${width}px`}" class="bg-primary text-primary-foreground" /></template>'), []);
});

test('rechaza paletas locales, medidas fijas y niveles de diálogo locales', async () => {
    assert.deepEqual(await lint('<template><div class="bg-red-500 w-[28rem] z-[60]" /></template><style scoped>.local { color: #fff; }</style>'), ['color', 'dimension', 'stacking', 'color']);
    assert.deepEqual(await lint('<script setup>const classes = `text-blue-500 ${state}`;</script><template><div /></template>'), ['color']);
});

test('admite estilos semánticos locales y los colores serializados centrales', async () => {
    assert.deepEqual(await lint('<template><div class="bg-document-paper" /></template><style scoped>.paper { color: var(--document-text); }</style>'), []);
    assert.deepEqual(await lint('export const palette = { text: "#000000" };', 'src/lib/documentPalette.ts'), []);
});
