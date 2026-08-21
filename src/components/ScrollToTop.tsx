import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

type ScrollPosition = { left: number; top: number };

/**
 * Keeps forward navigation predictable while preserving a visitor's place when
 * they use the browser's Back or Forward controls. The previous implementation
 * reset every pathname change, which made deep discovery feeds feel broken on
 * mobile after opening a title detail page.
 */
export default function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, ScrollPosition>());
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savePosition = () => {
      positions.current.set(location.key, {
        left: window.scrollX,
        top: window.scrollY,
      });
    };

    savePosition();
    window.addEventListener("scroll", savePosition, { passive: true });

    return () => {
      savePosition();
      window.removeEventListener("scroll", savePosition);
    };
  }, [location.key]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const savedPosition = navigationType === "POP"
      ? positions.current.get(location.key)
      : undefined;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({
        left: savedPosition?.left ?? 0,
        top: savedPosition?.top ?? 0,
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.key, navigationType]);

  return null;
}
