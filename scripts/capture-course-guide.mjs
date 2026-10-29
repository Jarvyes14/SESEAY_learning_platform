import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

function envValue(name) {
  const line = readFileSync(path.resolve(".env"), "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "");
}

const output = path.resolve("frontend/public/course-assets");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });

await page.goto("http://localhost:3000/login");
await page.getByLabel("Correo electrónico").fill(envValue("INITIAL_ADMIN_EMAIL"));
await page.getByLabel("Contraseña").fill(envValue("INITIAL_ADMIN_PASSWORD"));
await page.getByRole("button", { name: "Iniciar sesión" }).click();
await page.waitForURL(/\/admin$/);
await page.getByRole("link", { name: "Cursos", exact: true }).click();
await page.getByText("Cómo crear cursos en la plataforma", { exact: true }).first().waitFor();
await page.screenshot({ path: path.join(output, "01-panel-cursos.png"), fullPage: false });

await page.getByRole("link", { name: "Abrir constructor" }).first().click();
await page.waitForURL(/\/builder$/);
await page.getByText("Crea y publica un curso completo", { exact: true }).waitFor();
await page.screenshot({ path: path.join(output, "02-constructor-estructura.png"), fullPage: false });

await page.getByRole("button", { name: /Configuración del curso/ }).click();
await page.locator("#course-settings").screenshot({ path: path.join(output, "03-configuracion-curso.png") });

await page.getByRole("button", { name: /^1\. Bienvenida y estructura general/ }).click();
await page.getByLabel("Título de la actividad").waitFor();
await page.screenshot({ path: path.join(output, "04-editor-actividad.png"), fullPage: false });

await browser.close();
