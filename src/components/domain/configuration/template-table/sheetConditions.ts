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

/** Preguntas del docente de esta misma parte que pueden depender de la respuesta. */
export const followUpCandidates = (doc: ProseMirrorNode, triggerKey: string): FollowUp[] => {
    const byKey = new Map<string, FollowUp>();
    for (const attrs of fields(doc)) {
        const key = String(attrs.key ?? '');
        if (!key || key === triggerKey || attrs.choice || byKey.has(key)) continue;
        byKey.set(key, { key, label: String(attrs.label || key), showWhen: (attrs.showWhen as ShowWhen | null) ?? null });
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
