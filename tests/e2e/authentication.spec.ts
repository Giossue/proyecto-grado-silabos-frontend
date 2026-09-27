import { expect, test, type Page } from '@playwright/test';

const login = async (page: Page, email: string, password: string): Promise<void> => {
  await page.goto('/ingresar');
  await page.getByLabel('Correo institucional').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
};

const expectPanel = async (page: Page, area: 'admin' | 'coordinacion' | 'docente'): Promise<void> => {
  await expect(page).toHaveURL(new RegExp(`/${area}/panel$`));
};

const mainNavigation = (page: Page) =>
  page.locator('[data-sidebar="content"]');


const captureServerErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
};

const isoDate = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const pickDate = async (page: Page, label: string, value: string): Promise<void> => {
  const trigger = page.getByLabel(label);
  await trigger.click();
  const popoverId = await trigger.getAttribute('aria-controls');
  expect(popoverId).not.toBeNull();
  await page
    .locator(`[id="${popoverId}"]`)
    .locator(`[data-slot="calendar-cell-trigger"][data-value="${value}"]`)
    .click();
};

test.describe('frontera distribuida de identidad', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  test('mantiene sesión, CSRF y navegación administrativa', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'admin@silabos.test', 'Demo-2026!');
    await expectPanel(page, 'admin');
    await expect(page.getByText('Gestión institucional de Sílabos UEB')).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Usuarios y roles', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Usuarios y roles' })).toBeVisible();
    await expect(page.getByText('admin@silabos.test')).toBeVisible();

    const email = `e2e.${Date.now()}@silabos.test`;
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear cuenta institucional' });
    await dialog.getByLabel('Nombre completo').fill('Cuenta E2E');
    await dialog.getByLabel('Correo institucional').fill(email);
    await dialog.getByLabel('Contraseña temporal').fill('Temporal-2026!');
    await dialog.getByLabel('Rol inicial').click();
    await page.getByRole('option', { name: 'Administrador' }).click();
    await dialog.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await expect(page.getByText(email)).toBeVisible();

    await mainNavigation(page).getByRole('button', { name: 'Estructura académica', exact: true }).click();
    await mainNavigation(page).getByRole('link', { name: 'Facultades', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Facultades' })).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Auditoría', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Auditoría' })).toBeVisible();

    await page.goto('/admin/procesos');
    await expect(page.getByRole('heading', { name: 'Procesos', exact: true })).toBeVisible();
    await expect(page.getByRole('tablist')).toHaveCount(0);

    await page.getByRole('button', { name: /ADMINISTRADOR DEMO/ }).click();
    await page.getByRole('menuitem', { name: 'Configuración', exact: true }).click();
    await page.getByRole('link', { name: 'Seguridad', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Seguridad' })).toBeVisible();

    await page.getByRole('button', { name: 'Notificaciones', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
    await page.getByRole('link', { name: 'Ver todas las notificaciones' }).click();
    await expect(page).toHaveURL(/\/admin\/notificaciones$/);

    await mainNavigation(page).getByRole('link', { name: 'Plantilla', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Plantilla' })).toBeVisible();
    const createTemplate = page.getByRole('button', { name: 'Nueva plantilla' });
    const editTemplate = page.getByRole('button', { name: 'Editar', exact: true });
    const protectedTemplate = page.getByText('Plantilla protegida durante el proceso');
    await expect(createTemplate.or(editTemplate).or(protectedTemplate)).toBeVisible();
    if (await createTemplate.isVisible()) await createTemplate.click();
    if (!await protectedTemplate.isVisible()) await expect(editTemplate).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Convocatorias', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Convocatorias de sílabos' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Proceso' })).toBeVisible();
    const activeProcess = page.getByText('No se puede preparar otro proceso');
    if (!await activeProcess.isVisible()) {
      let processActions = page.getByRole('button', { name: /Acciones para/ }).first();
      if (!await processActions.isVisible()) {
        await page.getByRole('button', { name: 'Nuevo proceso' }).click();
        await page.getByLabel('Periodo académico').click();
        await page.getByRole('option').first().click();
        await pickDate(page, 'Inicio', isoDate(1));
        await pickDate(page, 'Fecha límite de entrega', isoDate(5));
        await page.getByRole('button', { name: 'Abrir convocatoria' }).click();
        processActions = page.getByRole('button', { name: /Acciones para/ }).first();
        await expect(processActions).toBeVisible();
      }
    }

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Convocatorias de sílabos' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Proceso' })).toBeVisible();

    await page.setViewportSize({ width: 360, height: 740 });
    await page.getByRole('button', { name: 'Mostrar menú' }).click();
    await expect(page.locator('[data-sidebar="content"]:visible')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    expect(serverErrors).toEqual([]);
  });

  test('exige que Coordinación seleccione la carrera y carga sus módulos', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'coordinador@silabos.test', 'Demo-2026!');

    await expect(page.getByRole('heading', { name: /Bienvenida, COORDINADORA DEMO/i })).toBeVisible();
    await expect(page.getByText('Seleccione la carrera y el ámbito con el que trabajará en esta sesión.')).toBeVisible();
    await page.getByRole('button', { name: 'Entrar a esta carrera' }).click();
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
    await expect(page.getByText('Cargar el logo de la facultad')).toHaveCount(0);

    await mainNavigation(page).getByRole('link', { name: 'Convocatorias', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Convocatorias de sílabos' })).toBeVisible();
    await expect(mainNavigation(page).getByRole('link', { name: 'Fuentes académicas', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Asistente curricular', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Asistente curricular' })).toBeVisible();
    await page.keyboard.press('Escape');

    await mainNavigation(page).getByRole('link', { name: 'Materias y paralelos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Materias y paralelos' })).toBeVisible();
    await expect(page.getByLabel('Buscar materia programada')).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Convocatorias', exact: true }).click();
    const convocationActions = page.getByRole('button', { name: /Acciones para/ }).first();
    await convocationActions.click();
    const viewConvocation = page.getByRole('menuitem', { name: 'Ver seguimiento' });
    if (await viewConvocation.count()) {
      await viewConvocation.click();
    } else {
      await page.getByRole('menuitem', { name: 'Abrir convocatoria' }).click();
      const dialog = page.getByRole('dialog', { name: 'Abrir convocatoria de la carrera' });
      await dialog.getByRole('button', { name: 'Abrir convocatoria' }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole('button', { name: /Acciones para/ }).first().click();
      await page.getByRole('menuitem', { name: 'Ver seguimiento' }).click();
    }
    await expect(page.getByRole('heading', { name: 'Seguimiento por expediente' })).toBeVisible();
    await expect(page.getByText('not_started', { exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await mainNavigation(page).getByRole('link', { name: 'Revisión', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Revisión' })).toBeVisible();

    await mainNavigation(page).getByRole('link', { name: 'Malla', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Malla' })).toBeVisible();
    expect(serverErrors).toEqual([]);
  });

  test('mantiene el alcance docente al listar sus sílabos', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'docente@silabos.test', 'Demo-2026!');

    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
    await mainNavigation(page).getByRole('link', { name: 'Mis sílabos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Mis sílabos' })).toBeVisible();
    const syllabusRow = page.getByRole('row', { name: /Arquitectura de Software/ });
    await syllabusRow.getByRole('button', { name: /Acciones para Arquitectura de Software/ }).click();
    await page.getByRole('menuitem', { name: 'Abrir sílabo' }).click();
    await expect(page).toHaveURL(/\/docente\/mis-silabos\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: 'Mis sílabos' })).toBeVisible();
    const startDraft = page.getByRole('button', { name: 'Iniciar borrador' }).first();
    if (await startDraft.isVisible()) await startDraft.click();

    const description = page.getByLabel('Descripción de la asignatura');
    await expect(description).toBeVisible();
    const autosavedValue = `Descripción distribuida ${Date.now()}`;
    const autosave = page.waitForResponse((response) =>
      response.request().method() === 'PATCH'
      && /\/api\/v1\/teacher\/syllabi\/[0-9a-f-]+\/fields\/[0-9a-f-]+$/.test(response.url()),
    );
    await description.fill(autosavedValue);
    expect((await autosave).status()).toBe(200);
    await page.reload();
    await expect(page.getByLabel('Descripción de la asignatura')).toHaveValue(autosavedValue);
    await expect.poll(() => page.locator('img').evaluateAll((images) =>
      images
        .filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0)
        .map((image) => (image as HTMLImageElement).src),
    )).toEqual([]);
    expect(serverErrors).toEqual([]);
  });
});
