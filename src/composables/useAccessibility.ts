import { ref, watch } from 'vue';

export type TextSize = '100' | '115' | '130' | '150';
export type AccessibilitySettings = {
    highContrast: boolean;
    textSize: TextSize;
    noMotion: boolean;
    underlineLinks: boolean;
    wideSpacing: boolean;
};

const STORAGE_KEY = 'silabos:accesibilidad';
export const TEXT_SIZES: readonly TextSize[] = ['100', '115', '130', '150'];

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export const defaultSettings = (): AccessibilitySettings => ({
    highContrast: false,
    textSize: '100',
    noMotion: prefersReducedMotion(),
    underlineLinks: false,
    wideSpacing: false,
});

const read = (): AccessibilitySettings => {
    const defaults = defaultSettings();
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<AccessibilitySettings> | null;
        if (!saved || typeof saved !== 'object') return defaults;
        return {
            highContrast: typeof saved.highContrast === 'boolean' ? saved.highContrast : defaults.highContrast,
            textSize: TEXT_SIZES.includes(saved.textSize as TextSize) ? (saved.textSize as TextSize) : defaults.textSize,
            noMotion: typeof saved.noMotion === 'boolean' ? saved.noMotion : defaults.noMotion,
            underlineLinks: typeof saved.underlineLinks === 'boolean' ? saved.underlineLinks : defaults.underlineLinks,
            wideSpacing: typeof saved.wideSpacing === 'boolean' ? saved.wideSpacing : defaults.wideSpacing,
        };
    } catch {
        return defaults;
    }
};

export const applyAccessibility = (settings: AccessibilitySettings): void => {
    const root = document.documentElement;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.textSize = settings.textSize;
    root.dataset.motion = settings.noMotion ? 'none' : 'normal';
    root.dataset.links = settings.underlineLinks ? 'underline' : 'normal';
    root.dataset.spacing = settings.wideSpacing ? 'wide' : 'normal';
};

const settings = ref<AccessibilitySettings>(defaultSettings());

watch(settings, (value) => {
    applyAccessibility(value);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { return; }
}, { deep: true });

export function initializeAccessibility(): void {
    if (typeof window === 'undefined') return;
    settings.value = read();
    applyAccessibility(settings.value);
}

export function useAccessibility() {
    const reset = (): void => { settings.value = defaultSettings(); };
    return { settings, reset };
}
