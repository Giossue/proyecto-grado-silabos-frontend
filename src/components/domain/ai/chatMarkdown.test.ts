import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { renderChatMarkdown } from '@/components/domain/ai/chatMarkdown';

const render = (text: string) => mount(defineComponent({ render: () => renderChatMarkdown(text) }));

describe('renderChatMarkdown', () => {
  it('convierte listas, numeradas y negritas sin interpretar HTML', () => {
    const wrapper = render('**Unidad 1**\n- Tema uno\n- Tema dos\n\n1. Primero\n2. Segundo\n<script>alert(1)</script>');

    expect(wrapper.find('strong').text()).toBe('Unidad 1');
    expect(wrapper.findAll('ul li').map((item) => item.text())).toEqual(['Tema uno', 'Tema dos']);
    expect(wrapper.findAll('ol li')).toHaveLength(2);
    expect(wrapper.find('script').exists()).toBe(false);
    expect(wrapper.text()).toContain('<script>alert(1)</script>');
  });

  it('la lista numerada deja margen para números de dos cifras, que si no se cortan por la izquierda', () => {
    const wrapper = render(Array.from({ length: 12 }, (_, index) => `${index + 1}. Sección ${index + 1}`).join('\n'));

    expect(wrapper.findAll('ol li')).toHaveLength(12);
    expect(wrapper.get('ol').classes()).toContain('pl-8');
  });
});
