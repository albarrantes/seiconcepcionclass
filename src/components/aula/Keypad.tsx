import { useEffect, useState } from "react";

type KeypadProps = {
  length?: number;
  onSubmit: (code: string) => void;
  pending?: boolean;
  tone?: "dark" | "light";
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"] as const;

export function Keypad({ length = 6, onSubmit, pending = false, tone = "dark" }: KeypadProps) {
  const [value, setValue] = useState("");

  const push = (digit: string) => setValue((v) => (v.length >= length ? v : v + digit));
  const back = () => setValue((v) => v.slice(0, -1));
  const submit = () => {
    if (value.length === length && !pending) onSubmit(value);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) push(event.key);
      else if (event.key === "Backspace") back();
      else if (event.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const dark = tone === "dark";
  const slotBase = dark
    ? "bg-white/10 ring-white/15 text-white"
    : "bg-ink text-mist ring-transparent";
  const emptySlot = dark ? "bg-white/5 ring-white/10 text-white/25" : "bg-ink/10 text-ink/30 ring-line";
  const keyBase = dark
    ? "bg-white/10 hover:bg-white/20 text-white"
    : "bg-ink/5 hover:bg-ink/10 text-ink";

  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-center">
      <div>
        <div className="flex gap-2.5">
          {Array.from({ length }).map((_, index) => {
            const digit = value[index];
            return (
              <span
                key={index}
                className={`grid size-11 place-items-center rounded-xl font-mono text-xl ring-1 ${
                  digit ? `${slotBase} aula-pop` : emptySlot
                }`}
              >
                {digit ?? "·"}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key) => {
          if (key === "back") {
            return (
              <button
                key={key}
                type="button"
                onClick={back}
                aria-label="Borrar"
                className={`h-16 rounded-2xl font-display text-2xl transition-colors ${
                  dark ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-ink/5 text-ink-soft/50"
                }`}
              >
                ⌫
              </button>
            );
          }
          if (key === "ok") {
            return (
              <button
                key={key}
                type="button"
                onClick={submit}
                disabled={value.length !== length || pending}
                aria-label="Entrar"
                className="h-16 rounded-2xl bg-c1 font-display text-2xl font-semibold text-mist transition-colors hover:bg-c1/90 disabled:opacity-40"
              >
                {pending ? "…" : "✓"}
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => push(key)}
              className={`h-16 rounded-2xl font-display text-2xl font-medium transition-colors ${keyBase}`}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
