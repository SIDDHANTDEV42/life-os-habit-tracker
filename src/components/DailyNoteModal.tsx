import { useState } from "react";
import { FileText, X, Check } from "lucide-react";

interface DailyNoteModalProps {
  dateIso: string;
  initialNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
}

export function DailyNoteModal({ dateIso, initialNote, onSave, onClose }: DailyNoteModalProps) {
  const [note, setNote] = useState(initialNote);

  const formattedDate = new Date(dateIso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 font-semibold">
            <FileText size={18} className="text-[var(--accent)]" />
            <span>Daily Note — {formattedDate}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          <textarea
            autoFocus
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write notes, reflections, or GATE study topics for this day..."
            className="w-full rounded-lg border border-zinc-300 bg-transparent p-3 text-sm focus:border-[var(--accent)] focus:outline-none dark:border-zinc-700"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(note.trim());
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95 transition-all"
          >
            <Check size={16} /> Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
