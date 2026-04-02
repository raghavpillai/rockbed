"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 shrink-0"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(label ? `${label} copied to clipboard` : "Copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-green-600" />
      ) : (
        <CopyIcon className="size-3.5 text-muted-foreground" />
      )}
    </Button>
  );
}
