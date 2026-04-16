"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  onDelete: () => Promise<void>;
  label?: string;
}

export default function DeleteButton({ onDelete, label = "刪除" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!window.confirm("確定要刪除嗎？")) return;
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
    >
      <Trash2 size={13} />
      {label}
    </button>
  );
}
