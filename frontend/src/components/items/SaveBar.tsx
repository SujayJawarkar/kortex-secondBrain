import { useState } from "react";
import { Link2, FileText, Loader2, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { itemsApi } from "../../api/items";

export default function SaveBar() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"url" | "note">("url");
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () =>
      mode === "url"
        ? itemsApi.save({ url: input })
        : itemsApi.save({ note: input }),

    onSuccess: () => {
      setInput("");
      toast.success(
        mode === "url" ? "URL saved — processing..." : "Note saved!",
        { icon: "🧠" },
      );
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },

    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (mode === "url") {
      try {
        new URL(trimmedInput);
      } catch {
        toast.error("Format Error: Please enter a valid full URL (e.g., https://example.com)");
        return;
      }
    }

    save.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 max-w-3xl"
      >
        {/* Mode toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1 shrink-0">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "url"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode("note")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "note"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Note
          </button>
        </div>

        {/* Input */}
        <div className="flex-1">
          <Input
            value={input}
            onChange={(e: any) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "url"
                ? "Paste any URL to save..."
                : "Write a quick note..."
            }
            disabled={save.isPending}
            className="h-10 bg-background"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={save.isPending || !input.trim()}
          className="h-10 px-4 bg-brand-600 hover:bg-brand-700 text-grey-900 border-2 border-grey-900 bg-grey-400 shrink-0"
        >
          {save.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1.5" /> Save
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
