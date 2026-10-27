import type { DocumentNode } from '@/lib/templateDocument';

export type Condition =
    | { not: Condition }
    | ({ value?: string; prop?: string; item?: string; variable?: string } & ({ equals: string | number | null } | { empty: boolean } | { zero: boolean }));

type SchemaBase = { label?: string; error?: string; keep_if?: Condition; required?: boolean };
export type TextSchema = SchemaBase & { type: 'text'; max: number; multiline: boolean };
export type NumberSchema = SchemaBase & { type: 'number'; digits: number; decimals: number };
export type ChoiceSchema = SchemaBase & { type: 'choice'; options: Record<string, string> };
export type ObjectSchema = SchemaBase & { type: 'object'; fields: Record<string, ValueSchema> };
export type ListSchema = SchemaBase & { type: 'list'; min: number; max: number; initial: number; item: ValueSchema };
export type ValueSchema = TextSchema | NumberSchema | ChoiceSchema | ObjectSchema | ListSchema;
export type PropSchema = TextSchema;

export type RuleCheck = { label?: string; count?: string; filled?: string; sum?: string; equals?: number | { variable: string }; max?: number | { variable: string }; min?: number | { variable: string } };
export type BlockRule = { code: string; on: 'save' | 'submit'; message: string; hint?: string; checks: RuleCheck[] };

export type BlockDefinition = {
    label: string;
    props: Record<string, PropSchema>;
    value: Record<string, ValueSchema>;
    rules: BlockRule[];
    layout: DocumentNode[];
};

export type DocumentStyle = {
    paper: 'letter' | 'a4' | 'legal';
    orientation: 'portrait' | 'landscape';
    margin_cm: number;
    font_family: string;
    line_height: number;
    paragraph_spacing_pt: number;
    sizes: { title: number; section: number; body: number };
    colors: { text: string; title: string; table_header_background: string | null; table_header_text: string | null; table_border: string; empty_text: string };
    title: { text: string; bold: boolean; italic: boolean; alignment: string };
    section_title: { bold: boolean; italic: boolean; alignment: string };
    body: { alignment: string };
    header: { logos: Array<{ source: 'institution' | 'faculty'; height_pt: number }>; left_share: number };
    footer: { text: string; size: number; color: string } | null;
    metadata: { text: string; size: number; color: string } | null;
    empty_text: string;
    choices: { margin_cm: number[]; title: number[]; section: number[]; body: number[] };
};

export type TemplateDefinitionPayload = { response_policy?: 'protected'; document: DocumentStyle; blocks: Record<string, BlockDefinition> };

export type BlockAttrs = { kind: string; props: Record<string, unknown>; value: Record<string, unknown> };
