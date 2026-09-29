import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';

/**
 * Preguntas de seguimiento (I-159): la regla se define en la pregunta que se responde
 * («Si responde Sí, pedir también: …»), como en los formularios conocidos. Por dentro,
 * cada pregunta que depende guarda `showWhen` {key, value} en su ficha.
 */
export type ShowWhen = { key: string; value: string };
export type FollowUp = { key: string; label: string; showWhen: ShowWhen | null };

type FieldAttrs = Record<string, unknown>;

const fields = (doc: ProseMirrorNode): FieldAttrs[] => {
    const found: FieldAttrs[] = [];
    doc.descendants((node) => {
        if (node.type.name === 'field') found.push(node.attrs);
    });

    return found;
};

/**
 * Una pregunta con opciones fijas (por ejemplo Sí o No) puede tener preguntas de
 * seguimiento, también cuando la hoja la muestra como casillas «X» (formato UEB).
 */
export const isTrigger = (attrs: FieldAttrs): boolean =>
    attrs.kind === 'seleccion_unica' && ((Array.isArray(attrs.options) && attrs.options.length > 0) || Boolean(attrs.choice));

/** Respuestas posibles: sus opciones o, en casillas «X», las marcadas en la hoja. */
export const answersOf = (doc: ProseMirrorNode, attrs: FieldAttrs): string[] => {
    if (Array.isArray(attrs.options) && attrs.options.length) return attrs.options.map(String);
    const choices = fields(doc).filter((item) => item.key === attrs.key && item.choice).map((item) => String(item.choice));

    return [...new Set(choices)];
};

/**
 * Bloques de filas de una tabla: filas unidas por celdas combinadas hacia abajo
 * (por ejemplo «ESTUDIANTES CON DISCAPACIDAD», que ocupa tres filas).
 */
const rowBlocks = (table: ProseMirrorNode): ProseMirrorNode[][] => {
    const blocks: ProseMirrorNode[][] = [];
    let end = -1;
    table.forEach((row, _offset, index) => {
        if (index > end) blocks.push([]);
        blocks[blocks.length - 1]!.push(row);
        row.forEach((cell) => {
            end = Math.max(end, index + Math.max(1, Number(cell.attrs.rowspan ?? 1)) - 1);
        });
    });

    return blocks;
};

const hasTrigger = (node: ProseMirrorNode, triggerKey: string): boolean => {
    let found = false;
    node.descendants((child) => {
        if (child.type.name === 'field' && child.attrs.key === triggerKey) found = true;

        return !found;
    });

    return found;
};

/**
 * Dónde se buscan preguntas de seguimiento: si la pregunta que se responde está en
 * una tabla, solo en su bloque de filas; si no, en toda la parte.
 */
const followUpArea = (doc: ProseMirrorNode, triggerKey: string): ProseMirrorNode[] => {
    const area: ProseMirrorNode[] = [];
    doc.descendants((node) => {
        if (node.type.name !== 'table') return true;
        for (const block of rowBlocks(node)) {
            if (block.some((row) => hasTrigger(row, triggerKey))) area.push(...block);
        }

        return false;
    });

    return area.length ? area : [doc];
};

/**
 * Preguntas del docente que pueden depender de la respuesta: las que están junto a
 * ella (mismo bloque de filas o, fuera de tablas, la misma parte) y las que ya
 * dependen de ella, para poder quitarlas.
 */
export const followUpCandidates = (doc: ProseMirrorNode, triggerKey: string): FollowUp[] => {
    const near = new Set<string>();
    for (const node of followUpArea(doc, triggerKey)) {
        for (const attrs of fields(node)) near.add(String(attrs.key ?? ''));
    }
    const byKey = new Map<string, FollowUp>();
    for (const attrs of fields(doc)) {
        const key = String(attrs.key ?? '');
        const showWhen = (attrs.showWhen as ShowWhen | null) ?? null;
        if (!key || key === triggerKey || attrs.choice || byKey.has(key)) continue;
        if (!near.has(key) && showWhen?.key !== triggerKey) continue;
        byKey.set(key, { key, label: String(attrs.label || key), showWhen });
    }

    return [...byKey.values()];
};

/**
 * Número que une en la hoja cada pregunta con sus preguntas de seguimiento (①, ②, …),
 * en el orden en que aparecen. Solo cuentan las que ya tienen alguna.
 */
export const conditionNumbers = (doc: ProseMirrorNode): Map<string, number> => {
    const all = fields(doc);
    const withFollowUps = new Set(all.map((attrs) => (attrs.showWhen as ShowWhen | null)?.key).filter(Boolean));
    const numbers = new Map<string, number>();
    for (const attrs of all) {
        const key = String(attrs.key ?? '');
        if (isTrigger(attrs) && withFollowUps.has(key) && !numbers.has(key)) numbers.set(key, numbers.size + 1);
    }

    return numbers;
};

export const circled = (number: number): string =>
    number >= 1 && number <= 20 ? String.fromCodePoint(0x2460 + number - 1) : `(${number})`;

/** Marca o desmarca una pregunta de seguimiento en todas sus fichas de la hoja. */
export const setShowWhen = (editor: Editor, key: string, showWhen: ShowWhen | null): void => {
    const { tr, doc } = editor.state;
    doc.descendants((node, position) => {
        if (node.type.name === 'field' && node.attrs.key === key && !node.attrs.choice) {
            tr.setNodeAttribute(position, 'showWhen', showWhen);
        }
    });
    if (tr.docChanged) editor.view.dispatch(tr);
};
