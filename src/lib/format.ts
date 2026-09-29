const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  return dateFormatter.format(new Date(value));
}

export function relativeDue(value: string | null): { label: string; urgent: boolean } {
  if (!value) return { label: "Sin fecha", urgent: false };
  const diff = new Date(value).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: "Fuera de plazo", urgent: true };
  if (days <= 1) return { label: "Hoy", urgent: true };
  return { label: `${days} días`, urgent: false };
}
