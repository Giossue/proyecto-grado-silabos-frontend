import { expect, test, type Page } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputRoot = resolve('tests/visual/baseline');

const routes = {
  administrador: [
    '/admin/panel',
    '/admin/convocatorias',
    '/admin/usuarios',
    '/admin/estructura-academica/facultades',
    '/admin/estructura-academica/campus',
    '/admin/estructura-academica/carreras',
    '/admin/plantilla',
    '/admin/auditoria',
    '/admin/procesos',
    '/admin/configuracion/perfil',
    '/admin/configuracion/seguridad',
    '/admin/configuracion/apariencia',
    '/admin/notificaciones',
  ],
  coordinador: [
    '/coordinacion/panel',
    '/coordinacion/convocatorias',
    '/coordinacion/revisiones',
    '/coordinacion/asignaciones-docentes',
    '/coordinacion/materias-asignaciones',
    '/coordinacion/malla',
    '/coordinacion/fuentes',
    '/coordinacion/configuracion/perfil',
    '/coordinacion/configuracion/seguridad',
    '/coordinacion/configuracion/apariencia',
    '/coordinacion/notificaciones',
  ],
  docente: [
    '/docente/panel',
    '/docente/mis-silabos',
    '/docente/configuracion/perfil',
    '/docente/configuracion/seguridad',
    '/docente/configuracion/apariencia',
    '/docente/notificaciones',
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

const capture = async (page: Page, role: string, path: string): Promise<void> => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();

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
  await page.screenshot({
    path: `${outputRoot}/${role}/${slug(path)}-light-360.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 900 });
};

const login = async (
  page: Page,
  email: string,
  role: keyof typeof routes,
): Promise<void> => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo-2026!');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).not.toHaveURL(/\/login$/);

  if (role === 'coordinador' && /\/rol$/.test(new URL(page.url()).pathname)) {
    const enterCareer = page.getByRole('button', { name: /Entrar a esta carrera/i })
      .or(page.getByRole('link', { name: /Entrar a esta carrera/i }))
      .first();
    await enterCareer.click();
    await expect(page).not.toHaveURL(/\/rol$/);
  }
};

test.beforeAll(async () => {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
});

test('captura el acceso público canónico', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await capture(page, 'publico', '/login');
});

for (const role of Object.keys(routes) as Array<keyof typeof routes>) {
  test(`captura las superficies canónicas de ${role}`, async ({ page }) => {
    await login(page, credentials[role], role);
    for (const path of routes[role]) await capture(page, role, path);
  });
}
