import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/sei-concepcion-logo.jpg.asset.json";
import { Keypad } from "@/components/aula/Keypad";
import { LoadingScreen } from "@/components/aula/AppShell";
import { answerOwnerChallenge, getSession, loginWithCode } from "@/lib/aula.functions";
import emiratesImg from "@/assets/air-emirates.jpg";
import iberiaImg from "@/assets/air-iberia.jpg";
import qatarImg from "@/assets/air-qatar.jpg";
import ryanairImg from "@/assets/air-ryanair.jpg";

const AIRLINES = [
  { id: "iberia", name: "Iberia", img: iberiaImg },
  { id: "qatar", name: "Qatar Airways", img: qatarImg },
  { id: "emirates", name: "Emirates", img: emiratesImg },
  { id: "ryanair", name: "Ryanair", img: ryanairImg },
];

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SEI Concepcion — acceso con código" },
      {
        name: "description",
        content:
          "Entra a tu clase con tu código de 6 dígitos. Tareas, avisos y calificaciones en un solo lugar.",
      },
      { property: "og:title", content: "SEI Concepcion — acceso con código" },
      {
        property: "og:description",
        content: "Entra a tu clase con tu código de 6 dígitos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LockScreen,
});

function LockScreen() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [challenge, setChallenge] = useState(false);

  const session = useQuery({ queryKey: ["session"], queryFn: () => getSession() });

  useEffect(() => {
    const m = session.data?.member;
    if (m) navigate({ to: m.role === "owner" ? "/admin" : "/panel", replace: true });
  }, [session.data, navigate]);

  if (session.isLoading) return <LoadingScreen />;

  const handleSubmit = async (code: string) => {
    setPending(true);
    setError(null);
    const result = await loginWithCode({ data: { code } });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Código incorrecto.");
      return;
    }
    if (result.challenge) {
      setChallenge(true);
      return;
    }
    const fresh = await session.refetch();
    const role = fresh.data?.member?.role;
    navigate({ to: role === "owner" ? "/admin" : "/panel", replace: true });
  };

  const handleAnswer = async (answer: string) => {
    setPending(true);
    setError(null);
    const result = await answerOwnerChallenge({ data: { answer } });
    setPending(false);
    if (!result.ok) {
      setChallenge(false);
      setError(result.error ?? "Respuesta incorrecta.");
      return;
    }
    await session.refetch();
    navigate({ to: "/admin", replace: true });
  };

  if (challenge) {
    return (
      <div className="aula-shell grid min-h-screen place-items-center px-5 py-10 font-body antialiased">
        <div className="aula-rise w-full max-w-2xl rounded-3xl bg-ink p-6 text-mist md:p-10">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-mist/50">
            Segunda protección
          </div>
          <h1 className="mb-6 font-display text-2xl font-bold md:text-3xl">
            ¿Cuál es tu aerolínea favorita?
          </h1>
          <div className="grid grid-cols-2 gap-3">
            {AIRLINES.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={pending}
                onClick={() => handleAnswer(a.id)}
                className="overflow-hidden rounded-xl border border-line bg-card text-left transition hover:border-primary disabled:opacity-50"
              >
                <img src={a.img} alt={a.name} width={992} height={672} className="aspect-[3/2] w-full object-cover" />
                <div className="px-3 py-2 text-sm font-medium">{a.name}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setChallenge(false)}
            className="mt-6 text-sm text-mist/70 underline underline-offset-4"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="aula-shell grid min-h-screen place-items-center px-6 py-14 font-body text-ink antialiased">
      <div className="aula-rise relative w-full max-w-4xl overflow-hidden rounded-3xl bg-ink p-8 text-mist md:p-12">
        <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <img
              src={logoAsset.url}
              alt="Logo de SEI Concepcion"
              className="mb-7 h-20 w-auto rounded-md object-contain md:hidden"
            />
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-mist/50">
              SEI Concepcion · clase única
            </div>
            <h1 className="mb-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Hola de nuevo
            </h1>
            <p className="mb-8 text-sm text-mist/60">
              Introduce tu código de 6 dígitos para entrar.
            </p>
            <Keypad onSubmit={handleSubmit} pending={pending} tone="dark" />
            {error ? (
              <p className="mt-6 font-mono text-xs text-danger">{error}</p>
            ) : (
              <p className="mt-6 font-mono text-xs text-mist/40">
                Si olvidaste tu código, pide al dueño que lo restablezca.
              </p>
            )}
            <Link
              to="/registro"
              className="mt-6 inline-block text-sm font-medium text-mist/80 underline decoration-mist/30 underline-offset-4 transition-colors hover:text-mist"
            >
              Es mi primera vez aquí
            </Link>
          </div>
          <div className="hidden justify-center md:flex">
            <img
              src={logoAsset.url}
              alt="Logo de SEI Concepcion"
              className="w-full max-w-sm rounded-xl object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
