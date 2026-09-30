import { expect, test, type Page } from '@playwright/test';

const mountFixture = async (page: Page, source: string): Promise<void> => {
    await page.route('**/api/v1/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.goto('/ingresar', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
        const root = document.getElementById('app') as (HTMLElement & { __vue_app__?: { unmount: () => void } }) | null;
        root?.__vue_app__?.unmount();
        document.body.innerHTML = '<div id="mount"></div>';
    });
    await page.addScriptTag({ type: 'module', content: source });
};

test('Sí/No, adjuntos y evidencia conservan su interacción por teclado', async ({ page }) => {
    await mountFixture(page, `
        const { createApp, h, ref } = await import('/@id/vue');
        const { default: BooleanChoice } = await import('/src/components/domain/BooleanChoice.vue');
        const { default: FileDropzone } = await import('/src/components/domain/FileDropzone.vue');
        const { default: EvidenceDisclosure } = await import('/src/components/domain/EvidenceDisclosure.vue');
        createApp({ setup() {
            const answer = ref(null);
            const file = ref(null);
            return () => h('main', { class: 'flex flex-col gap-6 p-6' }, [
                h(BooleanChoice, { label: 'Requiere adaptación', modelValue: answer.value, 'onUpdate:modelValue': value => answer.value = value }),
                h(FileDropzone, { inputId: 'logo', kind: 'png', modelValue: file.value, 'onUpdate:modelValue': value => file.value = value }),
                h(EvidenceDisclosure, { label: 'Documento de referencia · Página 22', excerpt: 'Evidencia sintética de la prueba.' }),
            ]);
        }}).mount('#mount');
    `);
    const yes = page.getByRole('radio', { name: 'Sí', exact: true });
    const no = page.getByRole('radio', { name: 'No', exact: true });
    await yes.click();
    await expect(yes).toBeChecked();
    await page.keyboard.press('ArrowRight', { delay: 50 });
    await expect(no).toBeFocused();
    await expect(no).toBeChecked();

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Cargar archivo PNG' }).focus();
    await page.keyboard.press('Enter');
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'logo-prueba.png', mimeType: 'image/png', buffer: Buffer.from('imagen sintética') });
    await expect(page.getByText('logo-prueba.png')).toBeVisible();
    await page.getByRole('button', { name: 'Quitar PNG' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByText('logo-prueba.png')).toBeHidden();

    const evidence = page.getByRole('button', { name: 'Documento de referencia · Página 22' });
    await evidence.focus();
    await page.keyboard.press('Enter');
    await expect(evidence).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('blockquote')).toHaveText('Evidencia sintética de la prueba.');
});

test('la confirmación compartida queda sobre la hoja abierta y restaura el foco al cancelar', async ({ page }) => {
    await mountFixture(page, `
        const { createApp, h } = await import('/@id/vue');
        const { Sheet, SheetContent, SheetTitle, SheetDescription } = await import('/src/components/ui/sheet/index.ts');
        const { Button } = await import('/src/components/ui/button/index.ts');
        const { default: PurgeConfirmationDialog } = await import('/src/components/domain/PurgeConfirmationDialog.vue');
        const { requestPurgeConfirmation } = await import('/src/composables/usePurgeConfirmation.ts');
        createApp({ setup: () => () => h('main', [
            h(Sheet, { open: true }, () => h(SheetContent, { class: 'p-6' }, () => [
                h(SheetTitle, () => 'Editar configuración'),
                h(SheetDescription, () => 'Formulario sintético de la prueba.'),
                h(Button, { onClick: () => requestPurgeConfirmation('Hay un sílabo afectado.', 1, () => undefined) }, () => 'Guardar configuración'),
            ])),
            h(PurgeConfirmationDialog),
        ]) }).mount('#mount');
    `);
    const trigger = page.getByRole('button', { name: 'Guardar configuración' });
    await trigger.click();
    const confirmation = page.getByRole('dialog', { name: 'Este cambio reemplaza los sílabos afectados' });
    await expect(confirmation).toBeVisible();
    const sheet = page.locator('[data-slot="sheet-content"]');
    const sheetLevel = await sheet.evaluate((element) => Number(getComputedStyle(element).zIndex));
    const confirmationLevel = await confirmation.evaluate((element) => Number(getComputedStyle(element).zIndex));
    expect(confirmationLevel).toBeGreaterThan(sheetLevel);
    expect(await confirmation.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
    })).toBe(true);
    await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(confirmation).toBeHidden();
    await expect(trigger).toBeFocused();
});

test('sílabo y skeleton comparten dimensiones sin desbordar en ambos temas', async ({ page }) => {
    await mountFixture(page, `
        const { createApp, h, ref } = await import('/@id/vue');
        const { default: WorkspaceLayout } = await import('/src/components/domain/WorkspaceLayout.vue');
        const { default: LoadingSkeleton } = await import('/src/components/domain/LoadingSkeleton.vue');
        const { Button } = await import('/src/components/ui/button/index.ts');
        createApp({ setup() {
            const loading = ref(true);
            return () => h('div', { class: 'p-4' }, [
                h(Button, { onClick: () => loading.value = !loading.value }, () => 'Alternar carga'),
                loading.value ? h(LoadingSkeleton, { variant: 'syllabus' }) : h(WorkspaceLayout, { variant: 'syllabus' }, () => [
                    h('main', { class: 'min-w-0' }, 'Contenido de prueba.'),
                    h('aside', { class: 'bg-card text-card-foreground assistant-panel' }, 'Asistente de prueba.'),
                ]),
            ]);
        }}).mount('#mount');
    `);
    for (const dark of [false, true]) {
        await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
        for (const width of [360, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            const aside = page.locator('.workspace-layout[data-layout="syllabus"] > aside');
            const skeleton = await aside.boundingBox();
            await page.getByRole('button', { name: 'Alternar carga' }).click();
            const loaded = await aside.boundingBox();
            expect(loaded?.width).toBe(skeleton?.width);
            if (width >= 1280) expect(loaded).toEqual(skeleton);
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
            await page.getByRole('button', { name: 'Alternar carga' }).click();
        }
    }
});
