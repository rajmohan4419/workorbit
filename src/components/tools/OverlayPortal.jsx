import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Fullscreen hides DOM outside its active element, including app-level modals.
export function OverlayPortal({ children }) {
  const [target, setTarget] = useState(() => typeof document === 'undefined' ? null : document.fullscreenElement || document.body);
  useEffect(() => {
    const update = () => setTarget(document.fullscreenElement || document.body);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  return target ? createPortal(children, target) : null;
}
