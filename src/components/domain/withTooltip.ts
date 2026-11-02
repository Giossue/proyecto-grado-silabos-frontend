import { h, type VNode, type VNodeChild } from 'vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';

/** Envuelve un botón de solo ícono (hecho con `h`) en la ayuda emergente; el span recibe el hover aunque el botón esté desactivado. */
export const withTooltip = (label: string, button: VNodeChild): VNode => h(IconTooltip, { label }, () => h('span', { class: 'inline-flex' }, [button]));
