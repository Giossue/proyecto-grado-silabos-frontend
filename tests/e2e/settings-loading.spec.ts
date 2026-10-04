import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type TwoFactorResponse = {
    status: number;
    body: Record<string, string | boolean>;
};

const disabledTwoFactor: TwoFactorResponse = {
    status: 200,
    body: { enabled: false, confirmation_required: false },
};

const mountFixture = async (page: Page) => {
    let requests = 0;
    let respond!: (response: TwoFactorResponse) => void;
    const response = new Promise<TwoFactorResponse>((resolve) => { respond = resolve; });

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
    await page.route('**/api/v1/authentication/two-factor', async (route) => {
        requests += 1;
        const result = await response;
        await route.fulfill({
            status: result.status,
            contentType: 'application/json',
            body: JSON.stringify(result.body),
        });
    });
    await page.addScriptTag({
        type: 'module',
        content: `
            const { createApp, h } = await import('/@id/vue');
            const routerUrl = performance.getEntriesByType('resource')
                .find(entry => new URL(entry.name).pathname.endsWith('/vue-router.js'))?.name;
            if (!routerUrl) throw new Error('Vue Router no se cargó en el fixture.');
            const { createMemoryHistory, createRouter, RouterView } = await import(routerUrl);
            const { default: SecurityPage } = await import('/src/pages/SecurityPage.vue');
            const { sessionState } = await import('/src/state/session.ts');
            const { paths } = await import('/src/lib/routes.ts');
            sessionState.replace({
                user: {
                    id: '00000000-0000-4000-8000-000000000001',
                    name: 'Cuenta de prueba',
                    email: 'cuenta@silabos.test',
                    email_verified: true,
                    can_edit_identity: true,
                },
                active_role: null,
                available_roles: [],
            });
            const router = createRouter({
                history: createMemoryHistory(),
                routes: [
                    { path: paths.configuration.security, component: SecurityPage },
                    { path: paths.configuration.profile, component: { render: () => h('p', 'Perfil') } },
                ],
            });
            await router.push(paths.configuration.security);
            await router.isReady();
            createApp({ setup: () => () => h('main', {
                'data-settings-fixture': 'ready',
            }, h(RouterView)) }).use(router).mount('#mount');
        `,
    });
    await expect(page.locator('[data-settings-fixture="ready"]')).toBeVisible();
    await expect.poll(() => requests).toBe(1);

    return { respond, requestCount: () => requests };
};

const expectLoading = async (page: Page): Promise<void> => {
    await expect(page.getByRole('heading', { name: 'Configuración', exact: true })).toBeVisible();
    const navigation = page.getByRole('navigation', { name: 'Configuración' });
    await expect(navigation.getByRole('link', { name: 'Perfil', exact: true })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Seguridad', exact: true })).toBeVisible();
    const status = page.getByRole('status', { name: 'Cargando contenido' });
    await expect(status).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(1);
    await expect(status).toHaveAttribute('aria-busy', 'true');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    expect(await status.locator('[data-slot="skeleton"]').count()).toBeGreaterThan(0);
    await expect(status.locator('button, input, select, textarea, a[href]')).toHaveCount(0);
    await expect(page.locator('input:visible')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Activar 2FA', exact: true })).toHaveCount(0);
};

const expectPasswordForm = async (page: Page): Promise<void> => {
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByLabel('Contraseña actual', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Contraseña nueva', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirmar contraseña', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled();
};

const expectNoOverflow = async (page: Page): Promise<void> => {
    const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
};

for (const width of [360, 768, 1440]) {
    for (const dark of [false, true]) {
        const theme = dark ? 'oscuro' : 'claro';
        test(`Seguridad conserva su estructura mientras carga a ${width} px en tema ${theme}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            const fixture = await mountFixture(page);
            await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);

            try {
                await expectLoading(page);
                await expectNoOverflow(page);

                const screenshots = process.env.LOADING_SKELETON_SCREENSHOTS;
                if (screenshots) {
                    await mkdir(screenshots, { recursive: true });
                    await page.screenshot({
                        path: join(screenshots, `settings-security-loading-${width}-${theme}.png`),
                        fullPage: true,
                        animations: 'disabled',
                    });
                }

                fixture.respond(disabledTwoFactor);
                await expectPasswordForm(page);
                await expect(page.getByRole('button', { name: 'Activar 2FA', exact: true })).toBeEnabled();
                await expectNoOverflow(page);
                expect(fixture.requestCount()).toBe(1);

                if (screenshots) {
                    await page.screenshot({
                        path: join(screenshots, `settings-security-loaded-${width}-${theme}.png`),
                        fullPage: true,
                        animations: 'disabled',
                    });
                }
            } finally {
                fixture.respond(disabledTwoFactor);
            }
        });
    }
}

test('Seguridad permite cambiar contraseña y avisa si no consigue consultar el segundo factor', async ({ page }) => {
    const fixture = await mountFixture(page);
    try {
        await expectLoading(page);
        fixture.respond({ status: 503, body: { message: 'No se pudo consultar el segundo factor.' } });
        await expectPasswordForm(page);
        await expect(page.getByRole('alert')).toHaveText('No se pudo consultar el segundo factor.');
        await expect(page.getByRole('button', { name: 'Activar 2FA', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Desactivar 2FA', exact: true })).toHaveCount(0);
        expect(fixture.requestCount()).toBe(1);
    } finally {
        fixture.respond(disabledTwoFactor);
    }
});

test('el skeleton de Seguridad respeta la preferencia de movimiento reducido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const fixture = await mountFixture(page);
    try {
        await expectLoading(page);
        const animations = await page.getByRole('status').locator('[data-slot="skeleton"]').evaluateAll((elements) =>
            elements.map((element) => getComputedStyle(element).animationName),
        );
        expect(animations.length).toBeGreaterThan(0);
        expect(animations.every((animation) => animation === 'none')).toBe(true);
    } finally {
        fixture.respond(disabledTwoFactor);
    }
});
