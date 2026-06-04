import { useEffect, useRef } from "react";
import "./CustomCursor.css";

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const ringRef = useRef(null);
  const mouseCoords = useRef({ x: 0, y: 0 });
  const ringCoords = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Only apply custom cursor on desktop screens
    if (window.matchMedia("(max-width: 768px)").matches) return;

    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    const handleMouseMove = (e) => {
      mouseCoords.current = { x: e.clientX, y: e.clientY };
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    };

    let animationId;
    const animateRing = () => {
      const rx = ringCoords.current.x;
      const ry = ringCoords.current.y;
      const mx = mouseCoords.current.x;
      const my = mouseCoords.current.y;

      const nextX = rx + (mx - rx) * 0.12;
      const nextY = ry + (my - ry) * 0.12;

      ringCoords.current = { x: nextX, y: nextY };
      ring.style.left = `${nextX}px`;
      ring.style.top = `${nextY}px`;

      animationId = requestAnimationFrame(animateRing);
    };

    const handleMouseEnter = () => cursor.classList.add("expand");
    const handleMouseLeave = () => cursor.classList.remove("expand");

    const setupListeners = () => {
      document.querySelectorAll("a, button, [role='button']").forEach((el) => {
        el.addEventListener("mouseenter", handleMouseEnter);
        el.addEventListener("mouseleave", handleMouseLeave);
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationId = requestAnimationFrame(animateRing);

    // Setup hover triggers initially and also watch for DOM updates
    setupListeners();
    const observer = new MutationObserver(setupListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
      observer.disconnect();
      document.querySelectorAll("a, button, [role='button']").forEach((el) => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="cursor" id="cur" />
      <div ref={ringRef} className="cursor-ring" id="crg" />
    </>
  );
}
