import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1400,height:900}});
await p.goto('http://127.0.0.1:4173/login');
await p.getByLabel(/correo/i).fill('docente@silabos.test');
await p.locator('#password').fill('Demo-2026!');
await p.getByRole('button',{name:/ingresar|iniciar/i}).click();
await p.waitForTimeout(2500);
if (p.url().includes('/rol')) { await p.getByText(/docente/i).first().click(); await p.waitForTimeout(2000); }
if (!(await p.locator('a[href*="mis-silabos/"]').count())) { await p.goto('http://127.0.0.1:4173/mis-silabos'); await p.waitForTimeout(2500); }
const links = await p.locator('a[href*="mis-silabos/"]').evaluateAll(a=>a.map(x=>x.href));
console.log(p.url(), links.slice(0,5));
for (const l of links) { await p.goto(l); await p.waitForTimeout(2000);
  const send=p.getByRole('button',{name:'Enviar sílabo'});
  if (await send.count() && await send.isEnabled()) { await send.click(); await p.getByRole('button',{name:'Enviar a Coordinación'}).click(); await p.waitForTimeout(3000);
    const fb=p.locator('.submit-feedback'); console.log(l, await fb.count() ? await fb.innerText() : 'no feedback', await p.locator('.validation-errors').count());
    await p.screenshot({path:'/tmp/docente-envio/aviso.png'});
    if (await fb.count()) { await p.getByRole('button',{name:'Ir a la primera'}).click().catch(()=>{}); await p.waitForTimeout(1200); await p.screenshot({path:'/tmp/docente-envio/primera.png'}); break; }
  }}
await b.close();
