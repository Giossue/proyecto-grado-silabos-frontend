import { shallowRef, watch, type Ref } from 'vue';

/**
 * Duración de la animación de salida de Dialog y Sheet (`duration-200` en src/components/ui).
 * Todo modal entra y sale igual: el contenido no debe cambiar ni desmontarse mientras se desvanece.
 */
export const DIALOG_EXIT_MS = 200;

/** Espera a que el modal termine de cerrarse antes de refrescar la lista, navegar o abrir otro paso. */
export const afterDialogExit = (): Promise<void> => new Promise((resolve) => { window.setTimeout(resolve, DIALOG_EXIT_MS); });

/**
 * Lo que muestra un modal que se abre con `:open="x !== null"`: al cerrar, `x` vuelve a null pero el
 * modal sigue mostrando el último valor mientras se desvanece. Abrir con otro valor lo reemplaza.
 */
export const useShownWhileClosing = <T>(source: () => T | null | undefined): Readonly<Ref<T | null>> => {
    const shown = shallowRef<T | null>(source() ?? null);
    watch(source, (value) => { if (value !== null && value !== undefined) shown.value = value; }, { flush: 'sync' });

    return shown;
};
