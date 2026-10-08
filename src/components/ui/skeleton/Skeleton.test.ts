import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Skeleton from '@/components/ui/skeleton/Skeleton.vue';

describe('Skeleton', () => {
    it('usa un color semántico neutral que se adapta a ambos temas', () => {
        const wrapper = mount(Skeleton);

        expect(wrapper.get('[data-slot="skeleton"]').classes()).toContain('bg-muted-foreground/25');
    });
});
