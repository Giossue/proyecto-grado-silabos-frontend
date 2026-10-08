import { expect, test, type Page } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputRoot = resolve('tests/visual/current');

const routes = {
  administrador: [
    '/admin/panel',
    '/admin/convocatorias',
    '/admin/usuarios',
    '/admin/estructura-academica',
    '/admin/plantilla',
    '/admin/auditoria',
    '/admin/configuracion/perfil',
    '/admin/configuracion/seguridad',
    '/admin/notificaciones',
  ],
  coordinador: [
    '/coordinacion/panel',
    '/coordinacion/revisiones',
    '/coordinacion/proyecto-carrera',
    '/coordinacion/materias-asignaciones',
    '/coordinacion/docentes',
    '/coordinacion/malla',
    '/coordinacion/configuracion/perfil',
    '/coordinacion/configuracion/seguridad',
    '/coordinacion/notificaciones',
  ],
  docente: [
    '/docente/panel',
    '/docente/mis-silabos',
    '/docente/configuracion/perfil',
    '/docente/configuracion/seguridad',
    '/docente/notificaciones',
  ],
  bibliotecario: [
    '/biblioteca/panel',
    '/biblioteca/revisiones',
    '/biblioteca/configuracion/perfil',
    '/biblioteca/configuracion/seguridad',
    '/biblioteca/notificaciones',
  ],
} as const;

const credentials = {
  administrador: 'admin@silabos.test',
  coordinador: 'coordinador@silabos.test',
  docente: 'docente@silabos.test',
  bibliotecario: 'bibliotecario@silabos.test',
} as const;

const slug = (path: string): string => {
  const url = new URL(path, 'http://localhost');
  const section = url.searchParams.get('seccion');
  const suffix = section ? `-${section}` : '';

  return `${url.pathname}${suffix}`
    .replace(/^\//, '')
    .replaceAll(/[^a-z0-9]+/gi, '-')
    .replace(/-$/, '') || 'inicio';
};

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

  await expect.poll(() => new URL(page.url()).pathname !== '/ingresar').toBe(true);
  if (role === 'coordinador' || role === 'docente') {
    await expect(page).toHaveURL(/\/rol$/);
    await page.getByRole('button', { name: role === 'coordinador' ? 'Entrar a esta carrera' : 'Entrar', exact: true }).first().click();
  }

  const area = role === 'administrador' ? 'admin' : role === 'coordinador' ? 'coordinacion' : role === 'bibliotecario' ? 'biblioteca' : 'docente';
  await expect(page).toHaveURL(new RegExp(`/${area}/panel$`));
};

const capture = async (page: Page, role: string, path: string): Promise<void> => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const failures: string[] = [];
  const trackFailure = (response: import('@playwright/test').Response): void => {
    if (response.status() >= 500) failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  };
  page.on('response', trackFailure);
  await page.goto(path, { waitUntil: 'networkidle' });
  page.off('response', trackFailure);
  expect(failures, `La pantalla ${path} debe cargar correctamente`).toEqual([]);
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

  for (const width of [360, 768]) {
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await page.setViewportSize({ width, height: 900 });
      await expect(surface).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `${outputRoot}/${role}/${slug(path)}-${theme}-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
};

test.beforeAll(async () => {
  await rm(outputRoot, { recursive: true, force: true });
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
