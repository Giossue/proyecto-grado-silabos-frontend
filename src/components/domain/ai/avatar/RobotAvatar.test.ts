import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RobotAvatar from './RobotAvatar.vue';

describe('RobotAvatar', () => {
    it('renderiza el blob con cuerpo y ojos proyectados', () => {
        const wrapper = mount(RobotAvatar);
        for (const id of ['robot_root', 'body', 'body_shell', 'eyes', 'eye_left', 'eye_right']) {
            expect(wrapper.find(`#${id}`).exists()).toBe(true);
        }
        expect(wrapper.find('#eye_left_dot').attributes('d')).toMatch(/^M-?\d/);
        expect(wrapper.find('img').exists()).toBe(false);
    });

    it('elige la animación según modo y emoción', async () => {
        const wrapper = mount(RobotAvatar, { props: { mode: 'thinking' } });
        expect(wrapper.attributes('data-animation')).toBe('thinking');
        await wrapper.setProps({ mode: 'speaking' });
        expect(wrapper.attributes('data-animation')).toBe('speaking');
        await wrapper.setProps({ mode: 'idle', emotion: 'surprised' });
        expect(wrapper.attributes('data-animation')).toBe('surprised');
    });
});
