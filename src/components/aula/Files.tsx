import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFileUrl, prepareUpload, type Attachment } from "@/lib/aula.functions";

const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_BYTES) throw new Error("El archivo supera los 20 MB.");
  const slot = await prepareUpload({ data: { fileName: file.name } });
  const { error } = await supabase.storage
    .from("aula-files")
    .uploadToSignedUrl(slot.path, slot.token, file);
  if (error) throw new Error("No se pudo subir el archivo.");
  return { path: slot.path, name: file.name };
}

export function FilePicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="cursor-pointer rounded-lg px-3 py-2 font-mono text-xs ring-1 ring-line hover:bg-c1/10">
        📎 Adjuntar archivo
        <input
          type="file"
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
      {file ? (
        <span className="flex items-center gap-2 text-ink-soft">
          {file.name}
          <button type="button" onClick={() => onChange(null)} className="text-danger">
            ✕
          </button>
        </span>
      ) : null}
    </div>
  );
}

export function FileLink({ path, name }: { path: string | null; name: string | null }) {
  const [busy, setBusy] = useState(false);
  if (!path) return null;
  const open = async () => {
    setBusy(true);
    try {
      const { url } = await getFileUrl({ data: { path } });
      window.open(url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={open}
      className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs text-c1 ring-1 ring-line hover:bg-c1/10"
    >
      📎 {busy ? "Abriendo…" : (name ?? "Archivo")}
    </button>
  );
}
