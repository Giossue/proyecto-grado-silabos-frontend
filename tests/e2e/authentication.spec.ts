import { expect, test, type Page } from '@playwright/test';

const password = 'Demo-2026!';

type Area = 'admin';

const login = async (page: Page, email: string): Promise<void> => {
  await page.goto('/ingresar');
  await page.getByLabel('Correo institucional').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
};

const expectPanel = async (page: Page, area: Area): Promise<void> => {
  await expect(page).toHaveURL(new RegExp(`/${area}/panel$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Panel de trabajo' })).toBeVisible();
};

const mainNavigation = (page: Page) =>
  page.locator('[data-sidebar="content"]');

const expectNavigation = async (page: Page, titles: string[]): Promise<void> => {
  await expect(mainNavigation(page).getByRole('link')).toHaveText(titles);
};

const openSection = async (page: Page, link: string, heading: string | RegExp): Promise<void> => {
  await mainNavigation(page).getByRole('link', { name: link, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
};

const captureServerErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
};

test.describe('frontera distribuida de identidad', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  test('mantiene sesión, CSRF y navegación administrativa', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'admin@silabos.test');
    await expectPanel(page, 'admin');
    await expectNavigation(page, [
      'Panel',
      'Convocatorias',
      'Usuarios y roles',
      'Facultades y carreras',
      'Plantilla',
      'Auditoría',
    ]);

    await openSection(page, 'Usuarios y roles', 'Usuarios y roles');
    const users = page.getByRole('table', { name: 'Usuarios y roles' });
    await expect(users.getByText('admin@silabos.test')).toBeVisible();

    const email = `e2e.${Date.now()}@silabos.test`;
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear cuenta institucional' });
    await dialog.getByLabel('Primer nombre').fill('CUENTA');
    await dialog.getByLabel('Segundo nombre').fill('DE');
    await dialog.getByLabel('Primer apellido').fill('PRUEBA');
    await dialog.getByLabel('Segundo apellido').fill('AUTOMATICA');
    await dialog.getByLabel('Correo institucional').fill(email);
    await dialog.getByLabel('Rol inicial').click();
    await page.getByRole('option', { name: 'Administrador', exact: true }).click();
    await dialog.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await expect(dialog).toBeHidden();
    const search = page.getByLabel('Buscar por nombre o correo');
    await search.fill(email);
    await search.press('Enter');
    await expect(users.getByText(email)).toBeVisible();

    await openSection(page, 'Facultades y carreras', 'Facultades');
    await openSection(page, 'Auditoría', 'Auditoría');

    await openSection(page, 'Convocatorias', 'Convocatorias');
    await expect(page.getByRole('columnheader', { name: 'Período' })).toBeVisible();

    await openSection(page, 'Plantilla', 'Plantilla de sílabo');
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Opciones avanzadas' })).toBeVisible();

    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await page.getByRole('menuitem', { name: 'Configuración' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Configuración' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Configuración' }).getByRole('link', { name: 'Seguridad', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/configuracion\/seguridad$/);
    await expect(page.getByRole('heading', { name: 'Actualizar contraseña' })).toBeVisible();

    await page.getByRole('button', { name: /^Notificaciones( sin leer)?$/ }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
    await page.getByRole('link', { name: 'Ver todas las notificaciones' }).click();
    await expect(page).toHaveURL(/\/admin\/notificaciones$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notificaciones' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Notificaciones' })).toBeVisible();

    await page.setViewportSize({ width: 360, height: 740 });
    await page.getByRole('button', { name: 'Abrir el menú' }).click();
    await expect(page.locator('[data-sidebar="content"]:visible')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    expect(serverErrors).toEqual([]);
  });

  test('carga los módulos de Coordinación de su carrera', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'coordinador@silabos.test');
    // Coordinación elige su carrera al entrar, aunque tenga una sola.
    await expect(page).toHaveURL(/\/rol$/);
    await page.getByRole('button', { name: 'Entrar a esta carrera' }).click();
    await expect(page).toHaveURL(/\/coordinacion\/revisiones$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Revisión' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cola de revisión' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Puesta en marcha' })).toBeVisible();
    await expectNavigation(page, [
      'Revisión',
      'Materias y asignaciones',
      'Docentes',
      'Proyecto de carrera',
      'Malla',
    ]);

    await openSection(page, 'Materias y asignaciones', 'Materias y asignaciones');
    await expect(page.getByLabel('Buscar materia programada')).toBeVisible();

    await openSection(page, 'Docentes', 'Docentes');
    await openSection(page, 'Proyecto de carrera', 'Proyecto de carrera');

    await openSection(page, 'Malla', 'Malla');
    await expect(page.getByRole('button', { name: /Editar malla|Comprobando/ })).toBeVisible();

    await page.goto('/coordinacion/puesta-en-marcha');
    await expect(page.getByRole('heading', { level: 1, name: 'Puesta en marcha' })).toBeVisible();

    await page.goto('/admin/convocatorias');
    await expect(page).toHaveURL(/\/coordinacion\/revisiones$/);
    expect(serverErrors).toEqual([]);
  });

  test('mantiene el alcance docente al listar sus sílabos', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'docente@silabos.test');
    await expect(page).toHaveURL(/\/docente\/mis-silabos$/);
    await expect(page.getByRole('heading', { level: 1, name: /^(Mis sílabos|Sílabos - Período .+)$/ })).toBeVisible();
    await expectNavigation(page, ['Mis sílabos']);
    await expect(page.getByText('Sílabos por entregar')).toHaveCount(0);
    await expect(
      page.getByRole('list', { name: 'Mis sílabos' }).or(page.getByText('No tiene sílabos asignados')),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Historial', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Historial' })).toBeVisible();

    await page.goto('/coordinacion/revisiones');
    await expect(page).toHaveURL(/\/docente\/mis-silabos$/);
    expect(serverErrors).toEqual([]);
  });

  test('limita Biblioteca a sus revisiones', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'bibliotecario@silabos.test');
    await expect(page).toHaveURL(/\/biblioteca\/revisiones$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Revisiones de biblioteca' })).toBeVisible();
    await expectNavigation(page, ['Revisiones de biblioteca']);
    await expect(page.getByText('Por revisar', { exact: true }).first()).toBeVisible();

    await page.goto('/admin/usuarios');
    await expect(page).toHaveURL(/\/biblioteca\/revisiones$/);
    expect(serverErrors).toEqual([]);
  });
});
