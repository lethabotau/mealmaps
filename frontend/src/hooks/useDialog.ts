import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseDialogOptions {
  open: boolean;
  onClose: () => void;
  /** Use capture-phase Escape handling so this dialog wins over any dialog beneath it. */
  capture?: boolean;
}

/**
 * Shared dialog behavior: Escape-to-close, a Tab/Shift+Tab focus trap, and
 * focus restoration to whatever was focused before the dialog opened.
 */
export function useDialog<T extends HTMLElement>({
  open,
  onClose,
  capture = false,
}: UseDialogOptions) {
  const containerRef = useRef<T>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;

    return () => {
      const trigger = triggerRef.current;
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (capture) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          return;
        }
        if (!e.defaultPrevented) onClose();
        return;
      }

      if (e.key === "Tab") {
        const container = containerRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey, capture);
    return () => window.removeEventListener("keydown", onKey, capture);
  }, [open, onClose, capture]);

  return { containerRef };
}
