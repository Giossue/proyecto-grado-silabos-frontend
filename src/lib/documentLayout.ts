export type DocumentLayout = { margin_cm: number; title_font_size: number; section_font_size: number; body_font_size: number };
export type DocumentLayoutOptions = Record<'margins' | 'title_sizes' | 'section_sizes' | 'body_sizes', Array<{ value: number; label: string }>>;

export const DEFAULT_LAYOUT: DocumentLayout = { margin_cm: 1.5, title_font_size: 14, section_font_size: 11, body_font_size: 11 };

export const layoutOf = (source: Partial<DocumentLayout> | null | undefined): DocumentLayout => ({ ...DEFAULT_LAYOUT, ...(source ?? {}) });

export const layoutStyle = (source: Partial<DocumentLayout> | null | undefined): Record<string, string> => {
    const layout = layoutOf(source);

    return {
        '--document-margin': `${layout.margin_cm}cm`,
        '--document-body-size': `${layout.body_font_size}pt`,
        '--document-title-size': `${layout.title_font_size}pt`,
        '--document-section-size': `${layout.section_font_size}pt`,
    };
};
