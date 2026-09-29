import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Keypad } from "@/components/aula/Keypad";
import { checkName, createCode } from "@/lib/aula.functions";

export const Route = createFileRoute("/registro")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Primer acceso — Aula" },
      {
        name: "description",
        content: "Escribe tu nombre completo y elige el código de 6 dígitos con el que entrarás a tu clase.",
      },
      { property: "og:title", content: "Primer acceso — Aula" },
      {
        property: "og:description",
        content: "Escribe tu nombre y elige tu código de acceso.",
      },
    ],
  }),
  component: Registro,
});

function Registro() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const continueWithName = async () => {
    setPending(true);
    setError(null);
    const result = await checkName({ data: { fullName } });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Nombre no válido.");
      return;
    }
    setStep(2);
  };

  const saveCode = async (code: string) => {
    setPending(true);
    setError(null);
    const result = await createCode({ data: { fullName, code } });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo guardar el código.");
      return;
    }
    navigate({ to: "/panel", replace: true });
  };

  return (
    <div className="aula-shell min-h-screen px-6 py-14 font-body text-ink antialiased">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-baseline gap-4">
          <span className="font-mono text-xs text-c1">(a)</span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-balance md:text-3xl">
            Primer acceso
          </h1>
          <span className="text-sm text-ink-soft/70">Solo una vez, al crear tu cuenta</span>
        </div>

        <div className="aula-rise grid gap-5 md:grid-cols-2">
          <div className={`aula-card p-7 ${step === 2 ? "opacity-60" : ""}`}>
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft/60">
              Paso 1
            </div>
            <h2 className="mb-5 font-display text-xl font-semibold">Tu nombre completo</h2>
            <label htmlFor="nombre" className="mb-2 block text-sm font-medium text-ink-soft">
              Nombre y apellidos
            </label>
            <input
              id="nombre"
              value={fullName}
              disabled={step === 2}
              maxLength={80}
              onChange={(event) => setFullName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") continueWithName();
              }}
              placeholder="María Valentina Ríos"
              className="w-full rounded-xl bg-white/80 px-4 py-3 text-sm ring-1 ring-line focus:ring-2 focus:ring-c1/40 focus:outline-none"
            />
            {step === 1 ? (
              <button
                type="button"
                onClick={continueWithName}
                disabled={pending}
                className="mt-5 w-full rounded-xl bg-ink py-3 font-display text-sm font-semibold text-mist transition-colors hover:bg-ink/90 disabled:opacity-50"
              >
                {pending ? "Comprobando…" : "Continuar"}
              </button>
            ) : (
              <p className="mt-5 font-mono text-xs text-c2">Nombre verificado</p>
            )}
          </div>

          <div className={`aula-card p-7 ${step === 1 ? "opacity-60" : ""}`}>
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft/60">
              Paso 2
            </div>
            <h2 className="mb-5 font-display text-xl font-semibold">Crea tu código de acceso</h2>
            {step === 2 ? (
              <Keypad onSubmit={saveCode} pending={pending} tone="light" />
            ) : (
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className="grid h-14 flex-1 place-items-center rounded-xl bg-ink/5 font-mono text-2xl text-ink/25"
                  >
                    ·
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-ink-soft/70">
              Elige 6 dígitos. Los usarás cada vez que abras Aula.
            </p>
          </div>
        </div>

        {error ? <p className="mt-6 font-mono text-xs text-danger">{error}</p> : null}

        <Link
          to="/"
          className="mt-8 inline-block text-sm font-medium text-ink-soft underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink"
        >
          Ya tengo un código
        </Link>
      </div>
    </div>
  );
}
