import { expect, test } from '@playwright/test';

const mountCanvas = async (page: import('@playwright/test').Page): Promise<void> => {
    await page.goto('/ingresar', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { document.body.innerHTML = '<div id="mount"></div>'; });
    await page.addScriptTag({
        type: 'module',
        content: `
            const { createApp } = await import('/@id/vue');
            const { default: CurriculumCanvas } = await import('/src/components/domain/academic/curriculum/CurriculumCanvas.vue');
            const subject = (id, position) => ({
                id: String(id), code: 'SW-' + id, name: 'Materia ' + id,
                cycle: 1, position, organization_unit: null,
                modality: null, modality_label: null, credits: null,
                total_hours: 144, active: true, system_values: {},
                display_fields: [{ id: 'hours', label: 'ACD', value: 48 }],
            });
            createApp(CurriculumCanvas, {
                career: { id: 'career', name: 'Software', modality: null },
                curriculum: { id: 'career', cycle_count: 2, editable: true, lock_reason: null },
                editing: true,
                fixedFields: [], fixedFieldTotals: [],
                subjects: [1, 2, 3, 4, 5].map(subject),
                requirements: [], organizationUnits: [], modalityOptions: [],
            }).mount('#mount');
        `,
    });
    await page.locator('.vue-flow__node-subject[data-id="1"]').waitFor();
    await page.waitForTimeout(250);
};

test('el desplazamiento de dos dedos mueve la malla sin cambiar el zoom', async ({ page }) => {
    await mountCanvas(page);
    const pane = page.locator('.vue-flow__transformationpane');
    const transform = () => pane.evaluate((element) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
        return { x: matrix.m41, y: matrix.m42, zoom: matrix.a };
    });

    for (let index = 0; index < 5; index += 1) {
        await page.locator('.vue-flow__controls-zoomin').click();
    }
    const before = await transform();
    expect(before.zoom).toBeGreaterThan(1);
    const canvas = await page.locator('.vue-flow').boundingBox();
    expect(canvas).not.toBeNull();
    if (!canvas) return;

    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.wheel(-100, -60);
    await expect.poll(async () => (await transform()).x - before.x).toBeGreaterThan(40);
    await expect.poll(async () => (await transform()).y - before.y).toBeGreaterThan(20);
    expect((await transform()).zoom).toBeCloseTo(before.zoom, 3);
});

for (const responseStatus of [200, 500]) {
    test(`al arrastrar conserva el ciclo y ${responseStatus === 200 ? 'ajusta' : 'restaura'} la posición`, async ({ page, context }) => {
        await context.addCookies([{ name: 'XSRF-TOKEN', value: 'test', domain: '127.0.0.1', path: '/' }]);
        let submitted: { cycle: number; position: number } | null = null;
        await page.route('**/api/v1/**', async (route) => {
            if (route.request().method() !== 'PATCH') {
                await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
                return;
            }
            submitted = route.request().postDataJSON() as { cycle: number; position: number };
            await route.fulfill({ status: responseStatus, contentType: 'application/json', body: JSON.stringify({ message: 'Respuesta de prueba.' }) });
        });
        await mountCanvas(page);

        const card = (id: number) => page.locator(`.vue-flow__node-subject[data-id="${id}"]`);
        const first = await card(1).boundingBox();
        const second = await card(2).boundingBox();
        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        if (!first || !second) return;
        const step = second.x - first.x;

        await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
        await page.mouse.down();
        await page.mouse.move(first.x + first.width / 2 + step * 2, first.y + first.height / 2 - 100, { steps: 12 });
        const dragging = await card(1).boundingBox();
        expect(dragging).not.toBeNull();
        expect(Math.abs((dragging?.y ?? 0) - first.y)).toBeLessThan(2);
        await page.mouse.up();
        await expect.poll(() => submitted).toMatchObject({ cycle: 1, position: 2 });

        const expected = responseStatus === 200
            ? [first.x + step * 2, first.x, first.x + step]
            : [first.x, first.x + step, first.x + step * 2];
        await expect.poll(async () => {
            const boxes = await Promise.all([1, 2, 3].map((id) => card(id).boundingBox()));
            return boxes.every((box, index) => box && Math.abs(box.x - expected[index]!) < 2 && Math.abs(box.y - first.y) < 2);
        }).toBe(true);
    });
}
