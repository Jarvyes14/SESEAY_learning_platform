import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.gov";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "12345678";

test.describe("Acceso y configuración visual", () => {
  test("muestra el acceso completamente en español", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByText("ACCESO SEGURO A LA PLATAFORMA")).toBeVisible();
  });

  test("una persona sin sesión no puede abrir la configuración administrativa", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("el administrador puede entrar y consultar controles de marca", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Contraseña").fill(adminPassword);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByRole("heading", { name: "Diseño y marca" })).toBeVisible();
    await expect(page.getByLabel(/Color primario/)).toHaveCount(1);
    await expect(page.getByText("Logo de la plataforma")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar configuración" })).toBeVisible();
  });
});
