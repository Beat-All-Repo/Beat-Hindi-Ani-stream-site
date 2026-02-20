import { useEffect } from "react";

/**
 * Frontend hardening: disable right-click, prevent common dev tools shortcuts,
 * and add basic anti-debugging measures.
 * NOTE: These are client-side deterrents only - they cannot fully prevent determined users.
 */
export function useSecurityHardening() {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block common dev tools shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") { e.preventDefault(); return; }
      // Ctrl+Shift+I (Inspect)
      if (e.ctrlKey && e.shiftKey && e.key === "I") { e.preventDefault(); return; }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") { e.preventDefault(); return; }
      // Ctrl+Shift+C (Element picker)
      if (e.ctrlKey && e.shiftKey && e.key === "C") { e.preventDefault(); return; }
      // Ctrl+U (View source)
      if (e.ctrlKey && e.key === "u") { e.preventDefault(); return; }
      // Ctrl+S (Save page)
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); return; }
    };

    // Disable drag
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    // Disable text selection on video/image elements
    const handleSelectStart = (e: Event) => {
      if ((e.target as HTMLElement)?.closest("video, img, .no-select")) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("selectstart", handleSelectStart);

    // Anti-debugging: detect DevTools via timing
    let devtoolsOpen = false;
    const detectDevTools = () => {
      const start = performance.now();
      // debugger; // Uncomment for aggressive detection
      const end = performance.now();
      if (end - start > 100) {
        devtoolsOpen = true;
      }
    };

    const interval = setInterval(detectDevTools, 3000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("selectstart", handleSelectStart);
      clearInterval(interval);
    };
  }, []);
}
