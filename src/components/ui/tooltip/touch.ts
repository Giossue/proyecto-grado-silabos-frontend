import type { InjectionKey, Ref } from "vue"

export type TooltipTouchState = { touch: Ref<boolean>; held: Ref<boolean> }

export const tooltipTouchKey: InjectionKey<TooltipTouchState> = Symbol("tooltip-touch")
