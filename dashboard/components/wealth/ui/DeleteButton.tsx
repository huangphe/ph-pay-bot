"use client";

import { Trash2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  onDelete: () => Promise<void>;
  label?: string;
}

export default function DeleteButton({ onDelete, label = "刪除" }: Props) {
  const [stage, setStage] = useState<"idle" | "confirm" | "loading">("idle");

  // Auto-reset after 3 seconds if not confirmed
  useEffect(() => {
    if (stage === "confirm") {
      const timer = setTimeout(() => setStage("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (stage === "idle") {
      setStage("confirm");
      return;
    }

    if (stage === "confirm") {
      setStage("loading");
      try {
        await onDelete();
      } catch (err) {
        setStage("idle");
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={stage === "loading"}
      className={`flex items-center gap-1 text-xs transition-all px-2 py-1 rounded-lg ${
        stage === "confirm" 
          ? "bg-red-500/20 text-red-200 border border-red-500/50" 
          : "text-red-400 hover:bg-red-500/10"
      } ${stage === "loading" ? "opacity-50" : "opacity-100"}`}
    >
      {stage === "confirm" ? (
        <>
          <AlertCircle size={13} />
          <span>確認？</span>
        </>
      ) : (
        <>
          <Trash2 size={13} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
