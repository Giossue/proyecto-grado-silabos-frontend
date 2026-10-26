import { expect, test } from '@playwright/test';

const proposal = {
  id: 'import-sintetica', state: 'lista', error: null, reading: null,
  documents: [{ name: 'documento-sintetico.pdf', size: 100 }],
  progress: { done: 1, total: 1 },
  fields: [{ key: 'relacion', label: 'Contribución al perfil' }, { key: 'objetivo', label: 'Objetivo general' }],
  subjects: [{
    subject_id: 'materia-sintetica', code: 'MAT-01', name: 'Álgebra Lineal', cycle: 1,
    state: 'lista', replaces: false, current: {}, coverage: { found: 1, total: 2 },
    values: { relacion: { columns: ['Resultado de aprendizaje', 'Contribución / Alta', 'Contribución / Media', 'Contribución / Baja', 'Resultado del perfil de egreso'], rows: [['Resuelve sistemas de ecuaciones lineales.', 'X', '', '', 'Aplica razonamiento matemático para resolver problemas.']] } },
    missing: [{ key: 'objetivo', label: 'Objetivo general', reason: 'no_encontrado' }],
  }],
};

for (const dark of [false, true]) {
  test(`la propuesta parcial conserva tablas, pendientes y acciones en tema ${dark ? 'oscuro' : 'claro'}`, async ({ page }) => {
    await page.route('**/api/v1/**', (route) => route.fulfill({
      status: route.request().url().endsWith('/coordination/ficha-imports') ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(route.request().url().endsWith('/coordination/ficha-imports') ? { available: true, import: proposal } : {}),
    }));
    await page.goto('/ingresar', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const root = document.getElementById('app') as (HTMLElement & { __vue_app__?: { unmount: () => void } }) | null;
      root?.__vue_app__?.unmount();
      document.body.innerHTML = '<div id="mount"></div>';
    });
    await page.addScriptTag({ type: 'module', content: `
      const { createApp, h } = await import('/@id/vue');
      const { default: Dialog } = await import('/src/components/domain/academic/FichaImportDialog.vue');
      createApp({ render: () => h(Dialog) }).mount('#mount');
    ` });
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
    await page.getByRole('button', { name: 'Importar desde Excel', exact: true }).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('1 de 2 campos con contenido')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cerrar', exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Revisar campos' }).click();
    await expect(dialog.getByText('Sin contenido en el archivo. Este campo no se cambiará.')).toBeVisible();
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      const table = dialog.getByRole('table', { name: 'Contribución al perfil' });
      await expect(table.getByText('Resuelve sistemas de ecuaciones lineales.')).toBeVisible();
      await expect(table.locator('tbody td')).toHaveCount(5);
      for (const name of ['Descartar', 'Aplicar a 1 materias']) {
        const button = dialog.getByRole('button', { name, exact: true });
        await button.scrollIntoViewIfNeeded();
        const bounds = await button.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      if (width === 360) await page.screenshot({ path: test.info().outputPath(`ficha-${dark ? 'oscuro' : 'claro'}-360.png`), fullPage: true });
    }
  });
}
