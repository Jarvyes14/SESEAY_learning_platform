import { HttpError } from "./http-error.js";

export function recordPlayback(previous = {}, { position, playing }, duration, now = Date.now()) {
  const elapsed = previous.seenAt ? Math.max(0, (now - Date.parse(previous.seenAt)) / 1000) : 0;
  const delta = position - (previous.position ?? position);
  const credit = previous.playing && delta > 0 && delta <= elapsed * 1.5 + 2
    ? Math.min(delta, elapsed, 10) : 0;
  return { position: Math.min(duration, position), playing, seenAt: new Date(now).toISOString(), watchedSeconds: Math.min(duration, (previous.watchedSeconds ?? 0) + credit) };
}

export function assertModuleRequirements(modules, states, now = Date.now()) {
  for (const module of modules) {
    const state = states?.[module.id];
    if (module.type === "READING" && (module.minimumReadSeconds ?? 0) > 0) {
      if (!state?.startedAt || (now - Date.parse(state.startedAt)) / 1000 < module.minimumReadSeconds) {
        throw new HttpError(409, `Completa el tiempo mínimo de lectura de «${module.title || "Lectura"}»`);
      }
    }
    if (module.type === "YOUTUBE_VIDEO" && (state?.watchedSeconds ?? 0) < module.content.durationSeconds * (module.minimumWatchPercent ?? 80) / 100) {
      throw new HttpError(409, `Completa la reproducción requerida de «${module.title || "Video"}»`);
    }
  }
}
