import { expect, test, type Page } from '@playwright/test';

const loginAsAdministrator = async (page: Page): Promise<void> => {
  await page.goto('/ingresar');
  await page.getByLabel('Correo institucional').fill('admin@silabos.test');
  await page.locator('input[type="password"]').fill('Demo-2026!');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/panel$/);
};

test.describe('accesibilidad transversal de la SPA', () => {
  test('mantiene el foco dentro de una hoja y lo devuelve al disparador', async ({ page }) => {
    await loginAsAdministrator(page);
    await page.goto('/administracion/usuarios');

    const trigger = page.getByRole('button', { name: 'Crear cuenta', exact: true });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const sheet = page.getByRole('dialog', { name: 'Crear cuenta' });
    await expect(sheet).toBeVisible();
    await expect.poll(() => sheet.evaluate((element) => element.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('no introduce desbordamiento horizontal en superficies administrativas móviles', async ({ page }) => {
    await loginAsAdministrator(page);
    await page.setViewportSize({ width: 360, height: 740 });

    for (const path of ['/panel', '/administracion/usuarios', '/administracion/auditoria', '/administracion/plantilla']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('main').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      if (path === '/administracion/plantilla') {
        await expect(page.getByLabel(/Plantilla del sílabo/)).toBeVisible();
        await expect(page.locator('.paged-document-paper').first()).toBeVisible();
      }
    }
  });
});
