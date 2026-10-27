import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type FixtureProps = Record<string, string | number | boolean>;
type FixtureWindow = Window & {
    updateLoadingSkeleton: (props: FixtureProps) => Promise<void>;
};

const scenarios: { name: string; props: FixtureProps }[] = [
    { name: 'table', props: { variant: 'table', columns: 9, filters: 4, cellLines: 2 } },
    { name: 'table-body', props: { variant: 'table-body', columns: 6, cellLines: 2 } },
    { name: 'catalog', props: { variant: 'catalog' } },
    { name: 'notifications', props: { variant: 'notifications' } },
    { name: 'workspace', props: { variant: 'workspace' } },
    ...['administrador', 'coordinador'].map((dashboardRole) => ({
        name: `dashboard-${dashboardRole}`,
        props: { variant: 'dashboard', dashboardRole },
    })),
    ...['curriculum', 'schedule', 'teachers'].map((mode) => ({
        name: `academic-${mode}`,
        props: { variant: 'academic-structure', mode },
    })),
    { name: 'syllabus-editable', props: { variant: 'syllabus', readonly: false } },
    { name: 'syllabus-readonly', props: { variant: 'syllabus', readonly: true } },
    ...['coordination', 'library'].map((reviewStage) => ({
        name: `review-${reviewStage}`,
        props: { variant: 'review', reviewStage },
    })),
    { name: 'documents', props: { variant: 'documents' } },
    { name: 'template', props: { variant: 'template' } },
    { name: 'comparison', props: { variant: 'comparison' } },
];

const screenshotScenarios = new Set([
    'table',
    'catalog',
    'notifications',
    'workspace',
    'dashboard-coordinador',
    'academic-curriculum',
    'academic-schedule',
    'academic-teachers',
    'syllabus-editable',
    'syllabus-readonly',
    'review-coordination',
    'documents',
    'template',
]);

const mountFixture = async (page: Page): Promise<void> => {
    await page.route('**/api/v1/**', (route) => route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{}',
    }));
    await page.goto('/ingresar', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
        const root = document.getElementById('app') as (HTMLElement & {
            __vue_app__?: { unmount: () => void };
        }) | null;
        root?.__vue_app__?.unmount();
        document.body.innerHTML = '<div id="mount"></div>';
    });
    await page.addScriptTag({
        type: 'module',
        content: `
            const { createApp, h, nextTick, shallowRef } = await import('/@id/vue');
            const { default: LoadingSkeleton } = await import('/src/components/domain/LoadingSkeleton.vue');
            const props = shallowRef({ variant: 'table', rows: 3 });
            createApp({ setup: () => () => h('main', {
                class: 'min-w-0 p-4 sm:p-6',
                'data-loading-fixture': 'ready',
            }, h(LoadingSkeleton, props.value)) }).mount('#mount');
            window.updateLoadingSkeleton = async (value) => {
                props.value = { rows: 3, ...value };
                await nextTick();
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            };
        `,
    });
    await expect(page.locator('[data-loading-fixture="ready"]')).toBeVisible();
    await page.waitForFunction(() => 'updateLoadingSkeleton' in window);
};

const renderScenario = async (page: Page, props: FixtureProps): Promise<void> => {
    await page.evaluate(async (value) => {
        await (window as FixtureWindow).updateLoadingSkeleton(value);
    }, props);
};

for (const width of [360, 768, 1440]) {
    for (const dark of [false, true]) {
        const theme = dark ? 'oscuro' : 'claro';
        test(`los skeletons conservan ancho y accesibilidad a ${width} px en tema ${theme}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await mountFixture(page);
            await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);

            const screenshots = process.env.LOADING_SKELETON_SCREENSHOTS;
            if (screenshots) await mkdir(screenshots, { recursive: true });

            for (const scenario of scenarios) {
                await test.step(scenario.name, async () => {
                    await renderScenario(page, scenario.props);
                    const status = page.getByRole('status');
                    await expect(status).toHaveCount(1);
                    await expect(status).toHaveAttribute('aria-live', 'polite');
                    await expect(status).toHaveAttribute('aria-busy', 'true');
                    await expect(status).toHaveAccessibleName('Cargando contenido');
                    expect(await status.locator('[data-slot="skeleton"]').count()).toBeGreaterThan(0);
                    await expect(status.locator('button, input:not([type="hidden"]), select, textarea, a[href], [contenteditable="true"], [tabindex]:not([tabindex="-1"])')).toHaveCount(0);

                    const dimensions = await page.evaluate(() => ({
                        viewport: document.documentElement.clientWidth,
                        document: document.documentElement.scrollWidth,
                        body: document.body.scrollWidth,
                    }));
                    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
                    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);

                    const bounds = await status.boundingBox();
                    expect(bounds).not.toBeNull();
                    expect(bounds!.width).toBeGreaterThan(width - (width < 640 ? 34 : 50));

                    if (screenshots && screenshotScenarios.has(scenario.name)) {
                        await page.screenshot({
                            path: join(screenshots, `${scenario.name}-${width}-${theme}.png`),
                            fullPage: true,
                            animations: 'disabled',
                        });
                    }
                });
            }
        });
    }
}

test('todos los skeletons respetan la preferencia de movimiento reducido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountFixture(page);
    for (const scenario of scenarios) {
        await test.step(scenario.name, async () => {
            await renderScenario(page, scenario.props);
            const animations = await page.locator('[data-slot="skeleton"]').evaluateAll((elements) =>
                elements.map((element) => getComputedStyle(element).animationName),
            );
            expect(animations.length).toBeGreaterThan(0);
            expect(animations.every((animation) => animation === 'none')).toBe(true);
        });
    }
});
