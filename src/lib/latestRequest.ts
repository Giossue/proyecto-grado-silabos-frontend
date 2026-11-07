import { getCurrentInstance, onBeforeUnmount } from 'vue';

export const latestRequest = () => {
  let current = 0;

  // Al salir de la pantalla, una respuesta tardía ya no debe tocar nada.
  if (getCurrentInstance()) onBeforeUnmount(() => { current += 1; });

  return {
    begin: (): number => (current += 1),
    isCurrent: (ticket: number): boolean => ticket === current,
  };
};
