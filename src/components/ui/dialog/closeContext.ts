import type { InjectionKey, Ref } from "vue"

// El título del modal avisa que lleva la X en su misma línea; así el contenido no pone la suya en la esquina.
export type DialogCloseContext = { enabled: Ref<boolean>; titles: Ref<number> }
export const dialogCloseKey: InjectionKey<DialogCloseContext> = Symbol("dialog-close")
