import { useCallback, useEffect } from "react";
export default function useUnsavedChanges(dirty) {
  const confirmDiscard = useCallback(() => !dirty || window.confirm("Hay cambios sin guardar. ¿Quieres descartarlos?"), [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const unload = event => { event.preventDefault(); event.returnValue = ""; };
    const navigate = event => {
      const anchor = event.target.closest("a[href]");
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || anchor.target === "_blank") return;
      if (new URL(anchor.href).origin === location.origin && anchor.pathname !== location.pathname && !confirmDiscard()) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty, confirmDiscard]);
  return confirmDiscard;
}
