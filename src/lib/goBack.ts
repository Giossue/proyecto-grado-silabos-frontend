import type { Router } from 'vue-router';

export const goBack = (router: Router, listPath: string): void => {
  const previous: unknown = window.history.state?.back;
  if (typeof previous === 'string' && previous.split('?')[0] === listPath) router.back();
  else void router.push(listPath);
};
