import type { InjectionKey, Ref } from 'vue';
import { inject, ref } from 'vue';

export const pageTitleKey: InjectionKey<Ref<string>> = Symbol('page-title');

const noTitle = ref('');

export const usePageTitle = (): Ref<string> => inject(pageTitleKey, noTitle);
