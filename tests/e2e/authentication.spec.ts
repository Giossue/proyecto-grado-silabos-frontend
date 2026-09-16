import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const login = async (page: Page, email: string, password: string): Promise<void> => {
  await page.goto('/ingresar');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
};

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

test.describe('frontera distribuida de identidad', () => {
  test.describe.configure({ mode: 'serial' });

  test('mantiene sesión, CSRF y navegación administrativa', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'admin@silabos.test', 'Demo-2026!');
    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole('heading', { name: 'Panel de trabajo' })).toBeVisible();

    await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
    await expect(page.getByText('admin@silabos.test')).toBeVisible();

    const email = `e2e.${Date.now()}@silabos.test`;
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear cuenta' });
    await dialog.getByLabel('Nombre').fill('Cuenta E2E');
    await dialog.getByLabel('Correo').fill(email);
    await dialog.getByLabel('Contraseña temporal').fill('Temporal-2026!');
    await dialog.getByLabel('Rol').selectOption('administrador');
    await dialog.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole('link', { name: 'Estructura académica', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Estructura académica' })).toBeVisible();

    await page.getByRole('link', { name: 'Auditoría', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Auditoría' })).toBeVisible();

    await page.getByRole('link', { name: 'Trabajos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Trabajos asíncronos' })).toBeVisible();

    await page.getByRole('button', { name: /ADMINISTRADOR DEMO/ }).click();
    await page.getByRole('link', { name: 'Seguridad', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cuenta y seguridad' })).toBeVisible();

    await page.getByRole('link', { name: 'Notificaciones', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible();

    await page.getByRole('link', { name: 'Plantilla', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Plantilla institucional' })).toBeVisible();
    const createTemplate = page.getByRole('button', { name: 'Crear plantilla institucional' });
    const editTemplate = page.getByRole('button', { name: 'Editar plantilla' });
    await expect(createTemplate.or(editTemplate)).toBeVisible();
    if (await createTemplate.isVisible()) await createTemplate.click();
    await expect(editTemplate).toBeVisible();

    await page.getByRole('link', { name: 'Procesos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Proceso institucional' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Historial de procesos' })).toBeVisible();
    const activeProcess = page.getByText(/Proceso vigente:/);
    if (!await activeProcess.isVisible()) {
      let openProcess = page.getByRole('button', { name: 'Abrir', exact: true });
      if (!await openProcess.isVisible()) {
        await page.getByRole('button', { name: 'Preparar proceso' }).click();
        await page.getByLabel('Período académico').selectOption({ index: 1 });
        await page.getByLabel('Inicio').fill(isoDate(1));
        await page.getByLabel('Fecha límite de entrega').fill(isoDate(5));
        await page.getByRole('button', { name: 'Guardar proceso' }).click();
        openProcess = page.getByRole('button', { name: 'Abrir', exact: true });
        await expect(openProcess).toBeVisible();
      }
      await openProcess.click();
      await expect(page.getByText(/Proceso abierto/)).toBeVisible();
    }

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Proceso institucional' })).toBeVisible();

    await page.setViewportSize({ width: 360, height: 740 });
    await page.getByRole('button', { name: 'Abrir navegación' }).click();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    expect(serverErrors).toEqual([]);
  });

  test('exige que Coordinación seleccione la carrera y carga sus módulos', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'coordinador@silabos.test', 'Demo-2026!');

    await expect(page.getByRole('heading', { name: 'Seleccione su ámbito de trabajo' })).toBeVisible();
    await page.getByRole('button', { name: /coordinador · Software/i }).click();
    await expect(page.getByRole('heading', { name: 'Panel de trabajo' })).toBeVisible();

    await page.getByRole('link', { name: 'Convocatorias', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Convocatorias' })).toBeVisible();
    await page.getByRole('link', { name: 'Fuentes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Fuentes académicas' })).toBeVisible();
    await expect(page.getByText('Cargando fuentes…')).toBeHidden();

    const existingSource = page.getByRole('row', { name: /Fuente E2E/ }).getByRole('link', { name: 'Editar' });
    if (await existingSource.isVisible()) {
      await existingSource.click();
    } else {
      await page.getByLabel('Nombre').fill('Fuente E2E');
      await page.getByLabel('Descripción').fill('Normativa sintética para verificar la integración distribuida.');
      await page.getByRole('button', { name: 'Crear fuente' }).click();
    }
    await expect(page.getByRole('heading', { name: 'Fuente E2E' })).toBeVisible();
    const sourceEditor = page.getByRole('textbox', { name: 'Contenido del documento' });
    if (await sourceEditor.isEditable()) {
      await sourceEditor.fill('# Normativa E2E\n\nLa planificación debe ser coherente y verificable.');
      await page.getByRole('button', { name: 'Guardar fuente' }).click();
      await expect(page.getByText(/Fuente actualizada/)).toBeVisible();
    } else {
      await expect(page.getByText(/está en curso/)).toBeVisible();
    }

    await page.getByRole('link', { name: 'Estructura académica', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Estructura académica' })).toBeVisible();
    await page.getByLabel('Archivo PNG').setInputFiles(resolve('../proyecto-grado-silabos-backend/public/images/silabo/logo-universidad.png'));
    await page.getByRole('button', { name: 'Actualizar logo' }).click();
    await expect(page.getByText(/Logo de la facultad actualizado/)).toBeVisible();

    await page.getByRole('link', { name: 'Convocatorias', exact: true }).click();
    const viewConvocation = page.getByRole('link', { name: 'Ver detalle' });
    await expect(page.getByRole('button', { name: 'Abrir convocatoria' }).or(viewConvocation)).toBeVisible();
    if (await viewConvocation.isVisible()) {
      await viewConvocation.click();
    } else {
      await page.getByRole('button', { name: 'Abrir convocatoria' }).click();
      const dialog = page.getByRole('dialog', { name: 'Abrir convocatoria' });
      await dialog.getByLabel('Fuente E2E').check();
      await dialog.getByRole('button', { name: 'Abrir convocatoria' }).click();
    }
    await expect(page).toHaveURL(/\/coordinacion\/convocatorias\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { level: 1, name: /Software/ })).toBeVisible();
    await expect(page.getByText('Fuente E2E')).toBeVisible();
    await expect(page.getByText('not_started', { exact: true })).toHaveCount(0);

    await page.getByRole('link', { name: 'Revisiones', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cola de revisión' })).toBeVisible();

    await page.getByRole('link', { name: 'Configuración IA', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Configuración de IA' })).toBeVisible();

    await page.getByRole('link', { name: 'Informes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Seguimiento operativo' })).toBeVisible();

    await page.getByRole('link', { name: 'Estructura académica', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Estructura académica' })).toBeVisible();
    expect(serverErrors).toEqual([]);
  });

  test('mantiene el alcance docente al listar sus sílabos', async ({ page }) => {
    const serverErrors = captureServerErrors(page);
    await login(page, 'docente@silabos.test', 'Demo-2026!');

    await expect(page.getByRole('heading', { name: 'Panel de trabajo' })).toBeVisible();
    await page.getByRole('link', { name: 'Mis sílabos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Mis sílabos' })).toBeVisible();
    await page.getByRole('link', { name: 'Arquitectura de Software' }).click();
    await expect(page.getByRole('heading', { name: 'Arquitectura de Software' })).toBeVisible();
    const startDraft = page.getByRole('button', { name: 'Iniciar borrador' });
    if (await startDraft.isVisible()) await startDraft.click();
    await expect(page.getByRole('heading', { name: 'Borrador de sílabo' })).toBeVisible();

    const description = page.getByLabel('Descripción de la asignatura');
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
