import { expect, test } from "@playwright/test";
const email = process.env.E2E_ADMIN_EMAIL ?? "admin@example.gov";
const password = process.env.E2E_ADMIN_PASSWORD ?? "12345678";
const api = "http://localhost:4000/api";
async function login(page) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
test.afterEach(async ({ page }) => { await page.context().request.post(`${api}/auth/logout`); });
test("acceso publico en espanol y proteccion de rutas", async ({ page }) => {
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
});
test("configuración organizada por secciones", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Configuración", exact: true }).click();
  await page.getByRole("tab", { name: "Identidad visual", exact: true }).click();
  await page.getByRole("heading", { name: "Manual de marca y diseño de la plataforma" }).waitFor();
  await page.getByRole("tab", { name: "Colores", exact: true }).click();
  await expect(page.locator('input[type="color"]').first()).toBeVisible();
  await page.getByRole("tab", { name: "Acceso y sesiones", exact: true }).click();
  await expect(page.getByText("Políticas de acceso", { exact: true })).toBeVisible();
});
test("roles conservan scroll interno, foco y cierre con Escape", async ({ page }) => {
  await login(page);
  await page.goto("/admin/roles");
  await page.getByRole("button", { name: "Crear rol", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Cerrar editor de rol", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  const region = page.getByRole("region", { name: "Configuración y permisos del rol", exact: true });
  await region.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(dialog.getByRole("button", { name: "Crear rol", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
test("calificaciones permiten consultar por curso o participante", async ({ page }) => {
  await login(page);
  await page.goto("/grades");
  await expect(page.getByRole("heading", { name: "Calificaciones", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Por participante", exact: true }).click();
  await expect(page.getByRole("option", { name: "Todos los participantes" })).toBeAttached();
  await page.getByRole("button", { name: "Por curso", exact: true }).click();
});
test("editor de certificados mantiene las acciones accesibles en movil", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/certificates");
  await page.getByRole("button", { name: "Nueva plantilla", exact: true }).click();
  const button = page.getByRole("button", { name: "Guardar plantilla", exact: true });
  await expect(button).toBeVisible();
  const bounds = await button.boundingBox();
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("crear curso con plantilla y cargar configuración al abrirla", async ({ page }) => {
  await login(page);
  const request = page.context().request;
  const templates = await (await request.get(`${api}/certificates/templates`)).json();
  const template = templates.data[0];
  test.skip(!template, "No hay una plantilla configurada en este entorno");
  let course;
  try {
    const created = await request.post(`${api}/courses`, { data: { title: `Prueba E2E ${Date.now()}`, description: "Curso temporal para comprobar las mejoras de configuración.", category: "Auditoria", difficulty: "BEGINNER", durationMinutes: 10, passingGrade: 70, status: "DRAFT", certificateTemplateId: template.id } });
    expect(created.status()).toBe(201);
    course = (await created.json()).data;
    await page.goto(`/courses/${course.id}/builder`);
    await page.getByRole("button", { name: "Configuración del curso", exact: true }).click();
    await expect(page.getByLabel("Plantilla de certificado", { exact: true })).toHaveValue(template.id);
  } finally { if (course) expect((await request.delete(`${api}/courses/${course.id}`)).status()).toBe(204); }
});
