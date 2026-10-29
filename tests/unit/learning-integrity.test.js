import { describe, expect, it } from "vitest";
import { assertModuleRequirements, recordPlayback } from "../../backend/src/lib/learning-integrity.js";
describe("Integridad del aprendizaje", () => {
  const now = Date.parse("2026-10-28T12:00:00Z");
  it("no concede avance en el primer reporte ni por saltar el video", () => {
    const first = recordPlayback({}, { position: 500, playing: true }, 600, now);
    expect(first.watchedSeconds).toBe(0);
    expect(recordPlayback(first, { position: 600, playing: true }, 600, now + 5000).watchedSeconds).toBe(0);
  });
  it("cuenta solo reproduccion activa limitada por el reloj del servidor", () => {
    const first = recordPlayback({}, { position: 0, playing: true }, 600, now);
    const next = recordPlayback(first, { position: 5, playing: false }, 600, now + 5000);
    expect(next.watchedSeconds).toBe(5);
    expect(recordPlayback(next, { position: 10, playing: false }, 600, now + 10000).watchedSeconds).toBe(5);
  });
  it("limita un intervalo largo y conserva el progreso al retroceder", () => {
    const state = { seenAt: new Date(now).toISOString(), position: 0, playing: true, watchedSeconds: 20 };
    expect(recordPlayback(state, { position: 100, playing: true }, 600, now + 100000).watchedSeconds).toBe(30);
    expect(recordPlayback(state, { position: 0, playing: true }, 600, now + 1000).watchedSeconds).toBe(20);
  });
  it("exige inicio y tiempo minimo de lectura en el servidor", () => {
    const modules = [{ id: "read", type: "READING", minimumReadSeconds: 300 }];
    expect(() => assertModuleRequirements(modules, {}, now)).toThrow();
    expect(() => assertModuleRequirements(modules, { read: { startedAt: new Date(now).toISOString() } }, now + 1000)).toThrow();
    expect(() => assertModuleRequirements(modules, { read: { startedAt: new Date(now).toISOString() } }, now + 300000)).not.toThrow();
  });
  it("exige el porcentaje configurado de video modular", () => {
    const modules = [{ id: "video", type: "YOUTUBE_VIDEO", content: { durationSeconds: 600 }, minimumWatchPercent: 80 }];
    expect(() => assertModuleRequirements(modules, { video: { watchedSeconds: 1 } })).toThrow();
    expect(() => assertModuleRequirements(modules, { video: { watchedSeconds: 480 } })).not.toThrow();
  });
});
