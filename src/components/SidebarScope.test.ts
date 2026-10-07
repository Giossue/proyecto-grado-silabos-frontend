import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import SidebarScope from '@/components/SidebarScope.vue';
import { sessionState } from '@/state/session';

const session = (role: { code: 'administrador' | 'coordinador' | 'docente' | 'bibliotecario'; career_name: string | null } | null) => ({
    user: { id: 'u1', name: 'Ada', email: 'ada@example.test', email_verified: true, can_edit_identity: true },
    active_role: role ? { id: 'r1', code: role.code, career_id: role.career_name ? 'c1' : null, career_name: role.career_name } : null,
    available_roles: [],
});

describe('SidebarScope', () => {
    afterEach(() => { sessionState.clear(); });

    it('muestra primero el rol y luego la carrera cuando corresponde', () => {
        sessionState.replace(session({ code: 'coordinador', career_name: 'Software' }));
        const wrapper = mount(SidebarScope);

        expect(wrapper.get('[data-test="sidebar-role"]').text()).toBe('Coordinador');
        expect(wrapper.get('[data-test="sidebar-career"]').text()).toBe('Software');
        expect(wrapper.text().indexOf('Rol')).toBeLessThan(wrapper.text().indexOf('Carrera'));
    });

    it('un rol sin carrera muestra solo el rol', () => {
        sessionState.replace(session({ code: 'administrador', career_name: null }));
        const wrapper = mount(SidebarScope);

        expect(wrapper.get('[data-test="sidebar-role"]').text()).toBe('Administrador');
        expect(wrapper.find('[data-test="sidebar-career"]').exists()).toBe(false);
    });

    it('sin rol activo no dibuja nada', () => {
        sessionState.replace(session(null));

        expect(mount(SidebarScope).find('dl').exists()).toBe(false);
    });
});
