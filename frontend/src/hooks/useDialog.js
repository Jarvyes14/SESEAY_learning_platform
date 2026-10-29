import { useEffect, useRef } from "react";

export default function useDialog(open, onClose) {
  const ref = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const inert = [];
    for (let node = dialog; node?.parentElement && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement.children) if (sibling !== node) { inert.push([sibling, sibling.inert]); sibling.inert = true; }
    }
    const controls = () => [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(el => !el.disabled && !el.matches(':disabled') && el.getClientRects().length);
    const initial = controls().find(el => el.matches("input,textarea,select")) ?? controls()[0];
    initial?.focus({ preventScroll: true });
    function keydown(event) {
      const top = [...document.querySelectorAll('[aria-modal="true"]')].filter(el => el.getClientRects().length).at(-1);
      if (top !== dialog) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close.current?.(); }
      if (event.key !== "Tab") return;
      const items = controls();
      if (!items.length) { event.preventDefault(); return; }
      const index = items.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && (index === items.length - 1 || index === -1)) { event.preventDefault(); items[0].focus(); }
    }
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      document.documentElement.style.overflow = previousOverflow;
      inert.forEach(([element, value]) => { element.inert = value; });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
