import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputRoot = resolve('tests/visual/current');

const routes = {
  administrador: [
    '/panel',
    '/administracion/procesos',
    '/administracion/usuarios',
    '/administracion/estructura-academica',
    '/administracion/plantilla',
    '/administracion/auditoria',
    '/administracion/trabajos',
    '/configuracion/perfil',
    '/configuracion/seguridad',
    '/configuracion/apariencia',
    '/notificaciones',
  ],
  coordinador: [
    '/panel',
    '/coordinacion/convocatorias',
    '/coordinacion/revisiones',
    '/coordinacion/asignaciones-docentes',
    '/coordinacion/materias-paralelos',
    '/coordinacion/malla',
    '/coordinacion/fuentes',
    '/coordinacion/configuracion-ia',
    '/coordinacion/informes',
    '/configuracion/perfil',
    '/configuracion/seguridad',
    '/configuracion/apariencia',
    '/notificaciones',
  ],
  docente: [
    '/panel',
    '/mis-silabos',
    '/configuracion/perfil',
    '/configuracion/seguridad',
    '/configuracion/apariencia',
    '/notificaciones',
  ],
} as const;

const credentials = {
  administrador: 'admin@silabos.test',
  coordinador: 'coordinador@silabos.test',
  docente: 'docente@silabos.test',
} as const;

const slug = (path: string): string => path
  .replace(/^\//, '')
  .replaceAll(/[^a-z0-9]+/gi, '-')
  .replace(/-$/, '') || 'inicio';

const setTheme = async (page: Page, theme: 'light' | 'dark'): Promise<void> => {
  await page.evaluate((value) => {
    localStorage.setItem('appearance', value);
    document.documentElement.classList.toggle('dark', value === 'dark');
  }, theme);
};

const login = async (page: Page, role: keyof typeof routes): Promise<void> => {
  await page.goto('/ingresar');
  await page.getByLabel('Correo institucional').fill(credentials[role]);
  await page.locator('input[type="password"]').fill('Demo-2026!');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  if (role === 'coordinador') {
    await expect(page.getByRole('heading', { name: /Bienvenida, COORDINADORA DEMO/i })).toBeVisible();
    await page.getByRole('button', { name: 'Entrar a esta carrera' }).click();
  }

  await expect(page).toHaveURL(/\/panel$/);
};

const capture = async (page: Page, role: string, path: string): Promise<void> => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path, { waitUntil: 'networkidle' });
  const applicationMain = page.locator('main').first();
  const surface = await applicationMain.count() > 0 ? applicationMain : page.locator('body');
  await expect(surface).toBeVisible();
  if (path === '/ingresar') await expect(page.locator('input[type="password"]')).toBeVisible();

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    await page.screenshot({
      path: `${outputRoot}/${role}/${slug(path)}-${theme}-1440.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }

  await setTheme(page, 'light');
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(surface).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({
    path: `${outputRoot}/${role}/${slug(path)}-light-360.png`,
    fullPage: true,
    animations: 'disabled',
  });
};

test.beforeAll(async () => {
  await mkdir(outputRoot, { recursive: true });
});

test('captura el acceso distribuido', async ({ page }) => {
  await page.goto('/ingresar');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await capture(page, 'publico', '/ingresar');
});

for (const role of Object.keys(routes) as Array<keyof typeof routes>) {
  test(`captura las superficies distribuidas de ${role}`, async ({ page }) => {
    await login(page, role);
    for (const path of routes[role]) await capture(page, role, path);
  });
}
