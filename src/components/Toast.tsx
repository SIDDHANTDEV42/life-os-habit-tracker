import { useState, useEffect } from "react";

interface ToastItem {
  id: number;
  message: string;
}

let counter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function toast(message: string) {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  return { toasts, toast };
}

interface ToastPortalProps {
  toasts: ToastItem[];
}

export function ToastPortal({ toasts }: ToastPortalProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastNotification key={t.id} message={t.message} />
      ))}
    </div>
  );
}

function ToastNotification({ message }: { message: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Enter animation
    const enter = requestAnimationFrame(() => setVisible(true));
    // Exit animation just before removal
    const exit = setTimeout(() => setVisible(false), 2600);
    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(exit);
    };
  }, []);

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-3 shadow-lg
        dark:border-green-800 dark:bg-zinc-900 text-sm font-medium text-green-800 dark:text-green-300
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
      `}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      {message}
    </div>
  );
}
