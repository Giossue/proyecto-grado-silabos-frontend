import type { InjectionKey, Ref } from 'vue';
import { inject, ref } from 'vue';

export const pageTitleKey: InjectionKey<Ref<string>> = Symbol('page-title');

const noTitle = ref('');

export const usePageTitle = (): Ref<string> => inject(pageTitleKey, noTitle);

export const saysTheSame = (one: string, other: string): boolean => {
  const clean = (value: string): string => value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const first = clean(one);
  const second = clean(other);

  return first !== '' && second !== '' && (first.includes(second) || second.includes(first));
};
