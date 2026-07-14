"use client";

import { useState } from "react";

export default function CsvExportButton({
  label,
  action,
  filename,
}: {
  label: string;
  action: () => Promise<{ csv: string }>;
  filename: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const { csv } = await action();
    setLoading(false);

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? "Exporting..." : label}
    </button>
  );
}
