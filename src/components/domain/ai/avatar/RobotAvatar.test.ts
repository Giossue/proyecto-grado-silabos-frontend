import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RobotAvatar from './RobotAvatar.vue';

describe('RobotAvatar', () => {
    it('renderiza el SVG inline con los grupos animables', () => {
        const wrapper = mount(RobotAvatar);
        for (const id of ['robot_root', 'body', 'body_shell', 'eyes', 'eye_left', 'eye_right', 'mouth']) {
            expect(wrapper.find(`#${id}`).exists()).toBe(true);
        }
        expect(wrapper.find('img').exists()).toBe(false);
    });

    it('elige la boca según modo y emoción', async () => {
        const wrapper = mount(RobotAvatar, { props: { mode: 'thinking' } });
        expect(wrapper.attributes('data-mouth')).toBe('neutral');
        await wrapper.setProps({ mode: 'idle', emotion: 'neutral' });
        expect(wrapper.attributes('data-mouth')).toBe('neutral');
        await wrapper.setProps({ emotion: 'happy' });
        expect(wrapper.attributes('data-mouth')).toBe('smile');
        await wrapper.setProps({ mode: 'speaking' });
        expect(wrapper.attributes('data-mouth')).toBe('talk');
        await wrapper.setProps({ mode: 'idle', emotion: 'surprised' });
        expect(wrapper.attributes('data-mouth')).toBe('surprised');
    });
});
