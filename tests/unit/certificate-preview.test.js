import { describe, expect, it } from "vitest";
import { certificateNameStyle } from "../../frontend/src/lib/certificate-preview.js";

describe("Escala visual del certificado", () => {
  it("convierte el tamaño configurado a una proporción del ancho del certificado", () => {
    const style = certificateNameStyle({
      nameX: 50,
      nameY: 52,
      nameWidth: 60,
      fontSize: 42,
      textColor: "#112233",
      fontFamily: "serif"
    });
    expect(parseFloat(style.fontSize)).toBeCloseTo(42 / 9);
    expect(style.fontSize).toMatch(/cqw$/);
  });
});
