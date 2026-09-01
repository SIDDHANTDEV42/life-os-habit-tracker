import { useEffect, useState } from "react";
import { Lock, Delete } from "lucide-react";

interface PinLockScreenProps {
  correctPin: string;
  onUnlock: () => void;
}

export function PinLockScreen({ correctPin, onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function processDigit(digit: string) {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      if (next === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 600);
      }
    }
  }

  function handleDelete() {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Support main number keys and Numpad keys (0-9)
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        processDigit(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPin("");
        setError(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, correctPin, onUnlock]);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-zinc-950 text-white select-none">
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
          <Lock size={28} />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold">Life OS Locked</h2>
          <p className="text-xs text-zinc-400 mt-1">Enter 4-digit PIN to continue (Numpad & Keyboard enabled)</p>
        </div>

        {/* PIN Indicators */}
        <div className={`flex gap-4 my-2 transition-transform ${error ? "animate-bounce" : ""}`}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border-2 transition-all ${
                error
                  ? "border-red-500 bg-red-500"
                  : pin.length > idx
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-zinc-700 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && <div className="text-xs text-red-400 font-medium">Incorrect PIN. Try again.</div>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => processDigit(digit)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-xl font-semibold hover:bg-zinc-800 active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => processDigit("0")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-xl font-semibold hover:bg-zinc-800 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white active:scale-95 transition-all"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
