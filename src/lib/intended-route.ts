const STORAGE_KEY = 'silabos.intended-route';

const publicPaths = new Set([
  '/ingresar',
  '/login',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
  '/verificar-dos-factores',
]);

const isInternalPath = (value: string): boolean =>
  value.startsWith('/') && !value.startsWith('//') && !value.includes('://');

export const isValidIntendedRoute = (value: unknown): value is string =>
  typeof value === 'string'
  && isInternalPath(value)
  && !publicPaths.has(value.split('?')[0]?.split('#')[0] ?? '');

export const rememberIntendedRoute = (value: unknown, recognized = true): void => {
  if (!recognized || !isValidIntendedRoute(value)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be disabled by browser policy; navigation remains safe.
  }
};

export const consumeIntendedRoute = (): string | null => {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    return isValidIntendedRoute(value) ? value : null;
  } catch {
    return null;
  }
};

export const clearIntendedRoute = (): void => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable storage during logout/bootstrap.
  }
};
