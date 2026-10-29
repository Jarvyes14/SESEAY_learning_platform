import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const out = path.resolve('test-results/platform-review');
mkdirSync(out, { recursive: true });
const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const report = { screens: [], errors: [], requests: [] };
page.on('pageerror', error => report.errors.push(error.message));
page.on('response', async response => {
  if (response.url().includes('/api/')) report.requests.push({ path: new URL(response.url()).pathname, status: response.status(), bytes: (await response.body().catch(() => Buffer.alloc(0))).length });
});
async function measure(name, screenshot = false) {
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight, headerHeight: document.querySelector('header')?.getBoundingClientRect().height, firstArticleY: document.querySelector('main article')?.getBoundingClientRect().top }));
  report.screens.push({ name, ...result });
  if (screenshot) await page.screenshot({ path: path.join(out, `${result.width}-${name}.png`), fullPage: false });
}
try {
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(env.INITIAL_ADMIN_EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(env.INITIAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.waitForURL('**/admin');
  const response = await context.request.get('http://localhost:4000/api/courses?limit=1');
  const course = (await response.json()).data[0];
  const routes = ['/admin', '/admin/users', '/admin/roles', '/instructor', '/learning', '/progress', '/grades', '/certificates', '/admin/settings', '/change-password'];
  if (course) routes.push(`/courses/${course.id}/builder`);
  for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    for (const route of routes) {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState('networkidle');
      const name = route.endsWith('/builder') ? 'builder' : route.split('/').pop();
      await measure(name, [390, 1366].includes(size.width));
      if (route === '/admin/roles') {
        await page.getByRole('button', { name: 'Crear rol', exact: true }).click();
        await measure('role-modal', [390, 1366].includes(size.width));
        const scroller = page.getByRole('region', { name: 'Configuración y permisos del rol', exact: true });
        await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
        const bounds = await page.getByRole('dialog').getByRole('button', { name: 'Crear rol', exact: true }).boundingBox();
        if (bounds.y + bounds.height > size.height) report.errors.push(`Pie del rol fuera de vista a ${size.width}px`);
        await page.keyboard.press('Escape');
      }
      if (route === '/admin/settings') {
        for (const [label, key] of [['Identidad visual', 'brand'], ['Acceso y sesiones', 'access']]) {
          await page.getByRole('tab', { name: label, exact: true }).click();
          await measure(`settings-${key}`, size.width === 390);
        }
      }
      if (route === '/certificates') {
        await page.getByRole('button', { name: 'Nueva plantilla', exact: true }).click();
        await measure('template-modal', [390, 1366].includes(size.width));
        const bounds = await page.getByRole('button', { name: 'Guardar plantilla', exact: true }).boundingBox();
        if (bounds.y + bounds.height > size.height) report.errors.push(`Pie de plantilla fuera de vista a ${size.width}px`);
        await page.keyboard.press('Escape');
      }
    }
    console.log(`Revisado ${size.width}×${size.height}`);
  }
} catch (error) { report.errors.push(error.stack); }
finally {
  await context.request.post('http://localhost:4000/api/auth/logout').catch(() => {});
  writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ states: report.screens.length, overflows: report.screens.filter(row => row.pageWidth > row.width).length, errors: report.errors }));
  await browser.close();
}
