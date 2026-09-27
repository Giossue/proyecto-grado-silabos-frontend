import { chromium } from 'playwright';
// Required: SILABOS_DEBUG_BASE_URL, SILABOS_DEBUG_SYLLABUS_PATH,
// SILABOS_DEBUG_EMAIL and SILABOS_DEBUG_PASSWORD. DOC keeps its existing behavior.
const requiredEnv = (key) => {
  const value = process.env[key];
  if (!value) throw new Error('Falta la variable de entorno ' + key);
  return value;
};
const debugBaseUrl = new URL(requiredEnv('SILABOS_DEBUG_BASE_URL'));
if (!['http:', 'https:'].includes(debugBaseUrl.protocol) || debugBaseUrl.username || debugBaseUrl.password) {
  throw new Error('SILABOS_DEBUG_BASE_URL debe ser una URL HTTP sin credenciales.');
}
const debugSyllabusUrl = new URL(requiredEnv('SILABOS_DEBUG_SYLLABUS_PATH'), debugBaseUrl);
if (debugSyllabusUrl.origin !== debugBaseUrl.origin || debugSyllabusUrl.username || debugSyllabusUrl.password) {
  throw new Error('SILABOS_DEBUG_SYLLABUS_PATH debe pertenecer al mismo sitio.');
}
const debugEmail = requiredEnv('SILABOS_DEBUG_EMAIL');
const debugPassword = requiredEnv('SILABOS_DEBUG_PASSWORD');


const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
p.on('dialog', d => { console.log('dialog:', d.message()); d.accept(); });

const cell = (type, content, attrs = {}) => ({ type, attrs, content: [{ type: 'paragraph', content }] });
if (process.env.DOC) await p.route(/\/api\/v1\/teacher\/syllabi\/[^/]+$/, async (route) => {
  const res = await route.fetch(); const json = await res.json();
  for (const sec of json.syllabus.sections) for (const block of sec.blocks) {
    const t = block.table; if (!t?.repeat?.enabled) continue;
    const field = block.fields.find(f => f.type === 'repetible'); if (!field) continue;
    const cols = t.columns;
    const col = (c) => ({ type: 'column', attrs: { key: c.key, kind: c.type === 'number' ? 'numero' : 'texto_largo', label: c.label } });
    block.document = { type: 'doc', content: [{ type: 'table', attrs: { repeatKey: field.key }, content: [
      { type: 'tableRow', content: cols.map(c => cell('tableHeader', [{ type: 'text', text: c.label }])) },
      ...t.header_fields.map(hf => ({ type: 'tableRow', attrs: { rowRole: 'unit' }, content: [cell('tableCell', [{ type: 'text', text: hf.label }]), cell('tableCell', [col({ key: hf.key, type: 'text', label: hf.label })], { colspan: cols.length - 1 })] })),
      { type: 'tableRow', attrs: { rowRole: 'record' }, content: cols.map(c => cell('tableCell', [col(c)])) },
      { type: 'tableRow', attrs: { rowRole: 'total' }, content: cols.map((c, i) => cell('tableCell', i === 0 ? [{ type: 'text', text: 'Total' }] : c.type === 'number' ? [col(c)] : [])) },
    ] }] };
  }
  await route.fulfill({ response: res, json });
});

await p.goto(new URL('/login', debugBaseUrl).href);
await p.locator('#email').fill(debugEmail);
await p.locator('input[type=password]').fill(debugPassword);
await p.getByRole('button', { name: /ingresar|iniciar|entrar/i }).click();
await p.waitForTimeout(2500); if (p.url().includes('/rol')) { await p.getByRole('button', { name: /Ver mis sílabos/ }).first().click(); await p.waitForTimeout(2500); }
await p.goto(debugSyllabusUrl.href); await p.waitForTimeout(3500);
const h = p.getByText(/Distribución y planificación/).first(); await h.scrollIntoViewIfNeeded();
const sec = process.env.DOC ? p.locator('.template-document-view').filter({ hasText: /Unidad/ }).first() : p.locator('section, div').filter({ has: p.getByText(/Distribución y planificación/) }).filter({ has: p.getByRole('button', { name: /^Agregar unidad/ }) }).last();

const r = await sec.evaluate(el => { const out=[]; let n=el; while(n && n!==document.body){ const cs=getComputedStyle(n); out.push([n.tagName, (n.className||'').toString().slice(0,90), Math.round(n.getBoundingClientRect().width), cs.display, cs.minWidth, cs.overflowX]); n=n.parentElement;} return out; });
console.log(r.map(x=>x.join(' | ')).join('\n')); await b.close();
