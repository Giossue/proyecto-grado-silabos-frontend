import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto('http://127.0.0.1:4173/login');
await p.locator('#email').fill('docente@silabos.test');
await p.locator('input[type=password]').fill('Demo-2026!');
await p.getByRole('button', { name: /ingresar|iniciar|entrar/i }).click();
await p.waitForTimeout(3000); if (p.url().includes('/rol')) { await p.getByRole('button', { name: /Ver mis sílabos/ }).first().click(); await p.waitForTimeout(2500); }
await p.goto('http://127.0.0.1:4173/docente/mis-silabos/01a0ad34-186e-70ac-b5a6-3da114e7b444'); await p.waitForTimeout(4000); const hh = p.getByText(/Distribución y planificación/); console.log(await hh.count()); await hh.first().click(); await p.waitForTimeout(1500); console.log(await p.locator('.template-document-view').count(), await p.locator('.document-repeat-unit').count());
console.log(p.url()); 
await p.screenshot({path:'/tmp/docente-unidades/dbg.png'});
await b.close();
