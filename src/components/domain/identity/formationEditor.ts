import type { ComputedRef, InjectionKey } from 'vue';

export const FORMATION_LABEL = 'FORMACIÓN Y EXPERIENCIA ACADÉMICA – INVESTIGATIVA:';

export const formationEditorKey: InjectionKey<ComputedRef<(() => void) | null>> = Symbol('formationEditor');
