import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import ProgressBar from "./ProgressBar.jsx";

let youtubeReady;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeReady) youtubeReady = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => { youtubeReady = null; script.remove(); reject(new Error("No fue posible cargar el reproductor. Revisa tu conexión.")); };
    document.head.appendChild(script);
  });
  return youtubeReady;
}
export default function TrackedVideo({ activityId, moduleId, content, minimumWatchPercent = 80, initialWatched = 0, onProgress, enabled = true }) {
  const host = useRef(null);
  const callback = useRef(onProgress);
  const [watched, setWatched] = useState(initialWatched);
  const [error, setError] = useState("");
  useEffect(() => { callback.current = onProgress; }, [onProgress]);
  useEffect(() => {
    let disposed = false, player, timer, pending = false, queued = false;
    async function checkpoint() {
      if (!enabled || disposed || !player?.getCurrentTime) return;
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const result = await api(`/progress/activities/${activityId}/playback`, { method: "POST", body: JSON.stringify({ moduleId, position: player.getCurrentTime(), playing: !document.hidden && player.getPlayerState() === 1 }) });
        if (!disposed) { setWatched(result.data.watchedSeconds); callback.current?.(result.data.watchedSeconds); setError(""); }
      } catch (failure) { if (!disposed) setError(failure.message); }
      finally { pending = false; if (queued && !disposed) { queued = false; checkpoint(); } }
    }
    loadYouTube().then(YT => {
      if (disposed) return;
      const url = new URL(content.url);
      const videoId = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.split("/").pop();
      const target = document.createElement("div");
      host.current.replaceChildren(target);
      player = new YT.Player(target, { videoId, width: "100%", height: "100%", playerVars: { playsinline: 1, origin: window.location.origin }, events: {
        onReady: () => { checkpoint(); timer = window.setInterval(checkpoint, 5000); },
        onStateChange: checkpoint,
        onError: () => { if (!disposed) setError("El video no está disponible. Comunícalo a la administración del curso."); }
      } });
    }).catch(failure => { if (!disposed) setError(failure.message); });
    document.addEventListener("visibilitychange", checkpoint);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", checkpoint); player?.destroy?.(); };
  }, [activityId, moduleId, content.url, enabled]);
  const required = Math.ceil(content.durationSeconds * minimumWatchPercent / 100);
  return <div className="space-y-3"><div ref={host} className="aspect-video min-h-[200px] overflow-hidden rounded-lg bg-overlay [&_iframe]:size-full" /><ProgressBar value={Math.min(100, watched / content.durationSeconds * 100)} label="Reproducción registrada" compact /><p className="text-xs text-text-secondary">{Math.floor(watched)} de {required} segundos requeridos. Solo se registra el video en reproducción y con esta pestaña visible.</p>{error && <p role="alert" className="text-sm text-error">{error}</p>}</div>;
}
