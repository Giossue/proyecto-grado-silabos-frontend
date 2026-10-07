import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const styles = readFileSync('src/styles.css', 'utf8');

describe('Estilos de la hoja del sílabo', () => {
    it('la hoja es siempre papel claro: usa los tokens claros del repo también en modo oscuro', () => {
        expect(styles).toMatch(/:root,\s*\.theme-light,\s*\.template-sheet\s*\{\s*--background:/);
        expect(styles).toMatch(/\.dark\s*\{\s*--background:/);
    });

    it('no envuelve la hoja en un contenedor gris redondeado', () => {
        expect(styles).not.toContain('.template-stage');
    });

    it('la hoja no usa colores sueltos: solo variables del repo', () => {
        const rule = /^\s+\.template-sheet \{[^}]*\}/m.exec(styles)?.[0] ?? '';
        expect(rule).toContain('background-color: var(--document-paper)');
        expect(rule).toContain('color: var(--document-text)');
        expect(rule).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    });
});
