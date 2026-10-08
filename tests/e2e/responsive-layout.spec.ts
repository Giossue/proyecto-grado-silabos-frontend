import { expect, test, type Page } from '@playwright/test';

const mountFixture = async (page: Page, source: string, responses: Record<string, unknown> = {}): Promise<void> => {
    await page.route('**/api/v1/**', (route) => {
        const response = responses[new URL(route.request().url()).pathname.replace('/api/v1', '')];
        return route.fulfill({ status: response ? 200 : 401, contentType: 'application/json', body: JSON.stringify(response ?? {}) });
    });
    await page.goto('/ingresar', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
        const root = document.getElementById('app') as (HTMLElement & { __vue_app__?: { unmount: () => void } }) | null;
        root?.__vue_app__?.unmount();
        document.body.innerHTML = '<div id="mount"></div>';
    });
    await page.addScriptTag({ type: 'module', content: source });
    await expect(page.locator('[data-responsive-fixture]')).toBeVisible();
};

const expectNoOverflow = async (page: Page): Promise<void> => {
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    expect(widths.body).toBeLessThanOrEqual(widths.viewport);
};

const expectControlInside = async (page: Page, name: string): Promise<void> => {
    const control = page.getByRole('button', { name, exact: true });
    await expect(control).toBeVisible();
    await control.scrollIntoViewIfNeeded();
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(await control.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (['auto', 'hidden', 'clip', 'scroll'].includes(style.overflowX)) {
                const clip = parent.getBoundingClientRect();
                if (bounds.left < clip.left || bounds.right > clip.right) return false;
            }
        }
        if (element instanceof HTMLButtonElement && element.disabled) return true;
        return element.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
    })).toBe(true);
};

const tableFixture = `
    const { createApp, h, ref } = await import('/@id/vue');
    const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } = await import('/src/components/ui/table/index.ts');
    const { default: TableActionsMenu } = await import('/src/components/domain/TableActionsMenu.vue');
    const { DropdownMenuItem } = await import('/src/components/ui/dropdown-menu/index.ts');
    const { Button } = await import('/src/components/ui/button/index.ts');
    const long = 'Carrera de Software y Sistemas de Información '.repeat(3);
    createApp({ setup() {
        const empty = ref(false);
        const selected = ref(false);
        return () => h('main', { class: 'min-w-0 p-4 sm:p-6', 'data-responsive-fixture': true }, [
            h(Button, { onClick: () => empty.value = !empty.value }, () => 'Alternar registros'),
            h('p', { role: 'status' }, selected.value ? 'Registro seleccionado' : ''),
            h(Table, { label: 'Usuarios' }, () => [
                h(TableHeader, () => h(TableRow, () => ['Usuario', 'Correo', 'Carrera', 'Estado', 'Acciones'].map(label => h(TableHead, () => label)))),
                h(TableBody, () => empty.value ? h(TableEmpty, { colspan: 5 }, () => 'No hay registros') : h(TableRow, () => [
                    h(TableCell, () => 'Cuenta de prueba'),
                    h(TableCell, () => 'correo.extremadamente.largo.para.comprobar.el.ajuste@silabos.test'),
                    h(TableCell, () => long),
                    h(TableCell, () => 'Activo'),
                    h(TableCell, () => h(TableActionsMenu, { label: 'Acciones para Cuenta de prueba' }, () => h(DropdownMenuItem, { onSelect: () => selected.value = true }, () => 'Consultar'))),
                ])),
            ]),
        ]);
    }}).mount('#mount');
`;

for (const dark of [false, true]) {
    test(`las tarjetas conservan todos los datos y acciones en tema ${dark ? 'oscuro' : 'claro'}`, async ({ page }) => {
        await mountFixture(page, tableFixture);
        await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
        for (const width of [320, 360, 639, 640, 768, 1024, 1440, 720]) {
            await page.setViewportSize({ width, height: 1100 });
            const row = page.locator('tbody tr');
            await expect.poll(() => row.evaluate((element) => getComputedStyle(element).display)).toBe(width < 640 ? 'flex' : 'table-row');
            await expect(row.locator('td:visible')).toHaveCount(5);
            await expect(row.locator('td').nth(3)).toHaveText('Activo');
            if (width < 640) {
                for (const cell of await row.locator('td').all()) {
                    await expect(cell).toHaveAttribute('data-label', /.+/);
                    const bounds = await cell.boundingBox();
                    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
                    expect(await cell.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
                }
                const actions = row.locator('td').last();
                await expect(actions).toHaveAttribute('data-card-role', 'actions');
                await expect(actions).toHaveCSS('display', 'flex');
                await expectControlInside(page, 'Acciones para Cuenta de prueba');
                if (width === 360) await page.screenshot({ path: test.info().outputPath(`tarjetas-${dark ? 'oscuro' : 'claro'}-360.png`), fullPage: true });
            }
            if (width === 640) {
                await expect(row.locator('td').last()).toHaveCSS('position', 'sticky');
                await expectControlInside(page, 'Acciones para Cuenta de prueba');
            }
            await expectNoOverflow(page);
        }
        await page.setViewportSize({ width: 360, height: 1100 });
        await page.getByRole('button', { name: 'Acciones para Cuenta de prueba' }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('menuitem', { name: 'Consultar' })).toBeVisible();
        await page.getByRole('menuitem', { name: 'Consultar' }).click();
        await expect(page.getByRole('status')).toHaveText('Registro seleccionado');
        await page.getByRole('button', { name: 'Alternar registros' }).click();
        await expect(page.getByText('No hay registros')).toBeVisible();
        await expect(page.locator('tbody tr')).toHaveAttribute('data-card-empty', 'true');
        await expectNoOverflow(page);
    });
}

test('las tarjetas de tablas editables conservan una sola instancia de cada campo', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await mountFixture(page, `
        const { createApp, h, ref } = await import('/@id/vue');
        const { default: Editor } = await import('/src/components/domain/fieldTypes/TableFieldEditor.vue');
        const value = ref({ semana_1: { contenido: 'Contenido inicial' } });
        createApp({ setup: () => () => h('main', { class: 'p-4', 'data-responsive-fixture': true }, h(Editor, {
            field: { id: 'field', key: 'plan', type: 'tabla', config: { columns: [{ key: 'contenido', label: 'Contenido' }, { key: 'evaluacion', label: 'Evaluación' }], rows: [{ key: 'semana_1', label: 'Semana 1' }] } },
            modelValue: value.value, 'onUpdate:modelValue': next => value.value = next,
        })) }).mount('#mount');
    `);
    await expect(page.getByLabel('Semana 1, Contenido')).toHaveCount(1);
    await page.getByLabel('Semana 1, Contenido').fill('Contenido modificado');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByLabel('Semana 1, Contenido')).toHaveValue('Contenido modificado');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect(page.getByLabel('Semana 1, Contenido')).toHaveValue('Contenido modificado');
    await expectNoOverflow(page);
});

test('las tablas documentales conservan su cuadrícula y desplazamiento interno', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await mountFixture(page, `
        const { createApp, h } = await import('/@id/vue');
        const { Table, TableBody, TableRow, TableCell } = await import('/src/components/ui/table/index.ts');
        createApp({ setup: () => () => h('main', { class: 'p-4', 'data-responsive-fixture': true }, h(Table, { cards: false }, () => h(TableBody, () => h(TableRow, () => Array.from({ length: 9 }, (_, index) => h(TableCell, () => 'Columna documental ' + index)))))) }).mount('#mount');
    `);
    await expect.poll(() => page.locator('tbody tr').evaluate((element) => getComputedStyle(element).display)).toBe('table-row');
    expect(await page.locator('[data-slot="table-container"]').evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await expectNoOverflow(page);
});

for (const dark of [false, true]) {
    test(`la paginación extensa mantiene controles visibles y límites en tema ${dark ? 'oscuro' : 'claro'}`, async ({ page }) => {
        await mountFixture(page, `
            const { createApp, h, ref } = await import('/@id/vue');
            const { default: Pagination } = await import('/src/components/domain/TablePagination.vue');
            createApp({ setup() {
                const current = ref(1);
                return () => h('main', { class: 'overflow-x-clip p-4', 'data-responsive-fixture': true }, h('div', { class: 'rounded-xl border bg-card p-6' }, h(Pagination, {
                    meta: { current_page: current.value, last_page: 10000, per_page: 20, total: 200000, from: 1, to: 20 },
                    'onUpdate:page': value => current.value = value,
                })));
            }}).mount('#mount');
        `);
        await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
        for (const width of [320, 360, 640, 768, 1440, 720]) {
            await page.setViewportSize({ width, height: 900 });
            await expectControlInside(page, 'Página anterior');
            await expectControlInside(page, 'Página siguiente');
            await expectNoOverflow(page);
        }
        await page.setViewportSize({ width: 360, height: 900 });
        await expect(page.getByRole('button', { name: 'Página anterior', exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'Página siguiente', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByText('Página 2 de 10000', { exact: true })).toBeVisible();
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.getByRole('button', { name: 'Ir a la página 10000', exact: true }).click();
        await page.setViewportSize({ width: 360, height: 900 });
        await expect(page.getByText('Página 10000 de 10000', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Página siguiente', exact: true })).toBeDisabled();
        await expectControlInside(page, 'Página anterior');
    });
}

test('la plantilla cargada y su esqueleto conservan papel y scroll interno', async ({ page }) => {
    await mountFixture(page, `
        const { createApp, h } = await import('/@id/vue');
        const { default: Builder } = await import('/src/components/domain/configuration/TemplateVisualBuilder.vue');
        const { default: Loading } = await import('/src/components/domain/LoadingSkeleton.vue');
        const template = { id: 't1', name: 'Plantilla', titleBlock: { text: 'SÍLABO' }, sections: [
            { id: 's1', key: 'descripcion', title: 'Descripción de la asignatura', blocks: [{ id: 'b1', key: 'b1', title: '', fields: [
                { id: 'f1', key: 'descripcion', label: 'Descripción', type: 'texto', config: {} },
            ] }] },
            { id: 's2', key: 'planificacion', title: 'Planificación de 16 semanas', blocks: [{ id: 'b2', key: 'b2', title: '', page_orientation: 'landscape', fields: [
                { id: 'f2', key: 'planificacion', label: 'Planificación semanal', type: 'tabla', config: {
                    columns: Array.from({ length: 9 }, (_, index) => ({ key: 'c' + index, label: 'Actividad ' + index })),
                    rows: Array.from({ length: 16 }, (_, index) => ({ key: 's' + index, label: 'Semana ' + (index + 1) })),
                } },
            ] }] },
        ] };
        createApp({ setup: () => () => h('main', { class: 'min-w-0 p-4', 'data-responsive-fixture': true }, [
            h(Builder, { template }),
            h(Loading, { variant: 'template' }),
        ]) }).mount('#mount');
    `);
    for (const dark of [false, true]) {
        await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
        for (const width of [320, 360, 768, 1440, 720]) {
            await page.setViewportSize({ width, height: 900 });
            const sheets = page.locator('.template-sheet');
            for (let index = 0; index < await sheets.count(); index++) {
                const sheet = sheets.nth(index);
                const geometry = await sheet.evaluate((element) => ({ width: element.getBoundingClientRect().width, landscape: element.classList.contains('template-sheet--landscape'), scrollWidth: element.parentElement!.scrollWidth, viewport: element.parentElement!.clientWidth }));
                expect(geometry.width).toBeCloseTo((geometry.landscape ? 279 : 210) * 96 / 25.4, 0);
                if (width <= 768) expect(geometry.scrollWidth).toBeGreaterThan(geometry.viewport);
            }
            await expectNoOverflow(page);
        }
    }
    await page.setViewportSize({ width: 360, height: 900 });
    const region = page.getByRole('region', { name: 'Hoja 1 de la plantilla con desplazamiento horizontal' });
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

const pageRouter = `
    const routerUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith('/vue-router.js'))?.name;
    const { createMemoryHistory, createRouter, RouterView } = await import(routerUrl);
    const { createApp, h } = await import('/@id/vue');
    const { TooltipProvider } = await import('/src/components/ui/tooltip/index.ts');
`;

test('Biblioteca conserva su listado completo y abre la revisión por teclado en móvil', async ({ page }) => {
    const item = {
        revision_id: 'r1', syllabus_id: 's1', subject: 'Ingeniería de Software', code: 'SW-001',
        career: 'Carrera de Software y Sistemas de Información', period: '2026', parallels: ['A', 'B'],
        teachers: ['Docente con nombre completo extenso'], revision_number: 1,
        sent_at: '2026-10-01T12:00:00Z', sent_by: 'Docente', state: 'pendiente',
    };
    const review = {
        ...item, can_comment: true, can_verify: true, verified_at: null, verified_by: null,
        template_variables: {}, comments: [],
        comment_reasons: [{ code: 'ausente', label: 'El libro solicitado no se encuentra disponible en biblioteca.' }],
        sections: [{ key: 'bibliografia', title: 'Bibliografía', fields: [{
            key: 'libros', label: 'Bibliografía básica', type: 'ficha', config: { adjustable: false },
            value: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Libro de referencia con título y descripción amplios para comprobar el ajuste del contenido.' }] }] },
        }] }],
    };
    await mountFixture(page, `${pageRouter}
        const { default: List } = await import('/src/pages/LibraryReviewsPage.vue');
        const { default: Detail } = await import('/src/pages/LibraryReviewDetailPage.vue');
        const router = createRouter({ history: createMemoryHistory(), routes: [
            { path: '/biblioteca/revisiones', component: List },
            { path: '/biblioteca/revisiones/:revision', component: Detail },
        ] });
        await router.push('/biblioteca/revisiones');
        await router.isReady();
        createApp({ setup: () => () => h('main', { 'data-responsive-fixture': true }, h(TooltipProvider, () => h(RouterView))) }).use(router).mount('#mount');
    `, {
        '/library/reviews': { filters: { q: null, state: null }, reviews: { data: [item], current_page: 1, last_page: 1, total: 1, per_page: 20, from: 1, to: 1 } },
        '/library/reviews/r1': { review },
    });
    const row = page.getByRole('row', { name: 'Abrir revisión de Ingeniería de Software' });
    await expect(row).toBeVisible();
    for (const dark of [false, true]) {
        await page.evaluate(enabled => document.documentElement.classList.toggle('dark', enabled), dark);
        for (const width of [320, 360, 768, 1440, 720]) {
            await page.setViewportSize({ width, height: 900 });
            await expect(row.locator('td:visible')).toHaveCount(4);
            await expectNoOverflow(page);
        }
    }
    await page.setViewportSize({ width: 360, height: 900 });
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: item.subject, exact: true })).toBeVisible();
    await expect(page.getByText('Bibliografía básica', { exact: true })).toBeVisible();
    for (const dark of [false, true]) {
        await page.evaluate(enabled => document.documentElement.classList.toggle('dark', enabled), dark);
        for (const width of [320, 360, 768, 1440, 720]) {
            await page.setViewportSize({ width, height: 900 });
            await expectControlInside(page, 'Aprobar bibliografía');
            await expectControlInside(page, 'Devolver al docente');
            await expectNoOverflow(page);
            if (width === 360) await page.screenshot({ path: test.info().outputPath(`biblioteca-${dark ? 'oscuro' : 'claro'}-360.png`), fullPage: true });
        }
    }
});

test('el sílabo cargado conserva pestañas, matriz editable y asistente al cambiar de ancho', async ({ page }) => {
    const field = (id: string, label: string) => ({
        id, key: id, label, type: 'tabla', help: null, required: true, inherited: false, teacher_editable: true,
        config: { columns: [{ key: 'contenido', label: 'Contenido' }, { key: 'evaluacion', label: 'Evaluación' }], rows: [{ key: 'semana_1', label: 'Semana 1' }] },
        value: { semana_1: { contenido: 'Contenido inicial', evaluacion: 'Evaluación inicial' } },
    });
    await mountFixture(page, `${pageRouter}
        const { default: Detail } = await import('/src/pages/TeacherSyllabusDetailPage.vue');
        const router = createRouter({ history: createMemoryHistory(), routes: [
            { path: '/docente/silabos/:syllabus', component: Detail },
            { path: '/docente/mis-silabos', component: { render: () => h('p', 'Mis sílabos') } },
        ] });
        await router.push('/docente/silabos/s1');
        await router.isReady();
        createApp({ setup: () => () => h('main', { 'data-responsive-fixture': true }, h(TooltipProvider, () => h(RouterView))) }).use(router).mount('#mount');
    `, {
        '/teacher/syllabi/s1': { syllabus: {
            id: 's1', subject: 'Ingeniería de Software', code: 'SW-001', convocation: '2026', period: '2026', state: 'borrador',
            version_bloqueo: 1, iniciado_en: '2026-10-01T12:00:00Z', parallels: ['A'], teachers: ['Docente'],
            presentation: { title: 'PROGRAMA DE ASIGNATURA (SÍLABO)', appearance: {}, logos: { institution: '', faculty: '' } },
            sections: [
                { id: 'sec1', key: 'planificacion', title: 'Planificación semanal de actividades', fields: [field('f1', 'Planificación')] },
                { id: 'sec2', key: 'evaluacion', title: 'Evaluación y seguimiento de resultados', fields: [field('f2', 'Evaluación')] },
            ],
        } },
        '/teacher/syllabi/s1/ai-chat': { available: false, conversation: null, suggested_questions: [] },
    });
    await expect(page.getByLabel('Semana 1, Contenido')).toBeVisible();
    for (const dark of [false, true]) {
        await page.evaluate(enabled => document.documentElement.classList.toggle('dark', enabled), dark);
        for (const width of [320, 360, 768, 1440, 720]) {
            await page.setViewportSize({ width, height: 900 });
            await expect(page.getByRole('tab')).toHaveCount(2);
            await expect(page.getByLabel('Semana 1, Contenido')).toHaveCount(1);
            await expect(page.getByLabel('Semana 1, Contenido')).toHaveValue('Contenido inicial');
            await expectControlInside(page, 'Enviar sílabo');
            await expectNoOverflow(page);
            if (width === 360) await page.screenshot({ path: test.info().outputPath(`silabo-${dark ? 'oscuro' : 'claro'}-360.png`), fullPage: true });
        }
    }
    await page.getByRole('tab').nth(1).click();
    await expect(page.getByText('Evaluación', { exact: true }).first()).toBeVisible();
    await expectNoOverflow(page);
});

test('el sidebar comparte el límite de 768 px con CSS y abre el menú móvil', async ({ page }) => {
    await mountFixture(page, `
        const { createApp, h } = await import('/@id/vue');
        const { SidebarProvider, Sidebar, SidebarTrigger, useSidebar } = await import('/src/components/ui/sidebar/index.ts');
        const Status = { setup() { const { isMobile } = useSidebar(); return () => h('p', { 'data-layout-mode': true }, isMobile.value ? 'móvil' : 'escritorio'); } };
        createApp({ setup: () => () => h('main', { 'data-responsive-fixture': true }, h(SidebarProvider, () => [
            h(Sidebar, () => h('p', 'Navegación de prueba')),
            h('section', [h(SidebarTrigger), h(Status)]),
        ])) }).mount('#mount');
    `);
    for (const width of [767, 768, 1024, 360]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.locator('[data-layout-mode]')).toHaveText(width < 768 ? 'móvil' : 'escritorio');
        if (width >= 768) await expect(page.locator('[data-slot="sidebar"]').first()).toBeVisible();
        await expectNoOverflow(page);
    }
    await page.locator('[data-slot="sidebar-trigger"]').click();
    await expect(page.locator('[data-mobile="true"]')).toBeVisible();
    await expect(page.getByText('Navegación de prueba')).toBeVisible();
    await expectNoOverflow(page);
});
