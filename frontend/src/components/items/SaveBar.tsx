import { useState, useRef } from "react";
import { Link2, FileText, FileUp, Loader2, Plus, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { itemsApi } from "../../api/items";

export default function SaveBar() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"url" | "note" | "pdf">("url");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => {
      if (mode === "pdf" && file) {
        return itemsApi.uploadPdf(file);
      }
      return mode === "url"
        ? itemsApi.save({ url: input })
        : itemsApi.save({ note: input });
    },

    onSuccess: () => {
      setInput("");
      setFile(null);
      toast.success(
        mode === "url" || mode === "pdf" ? "Saved — processing..." : "Note saved!",
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
    
    if (mode === "pdf") {
      if (!file) {
        toast.error("Please select a PDF file first");
        return;
      }
      save.mutate();
      return;
    }

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please select a valid PDF file");
        return;
      }
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("File size must be under 20MB");
        return;
      }
      setFile(selectedFile);
    }
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
          <button
            type="button"
            onClick={() => setMode("pdf")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "pdf"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>

        {/* Input */}
        <div className="flex-1 flex items-center">
          {mode === "pdf" ? (
            <div className="w-full relative flex items-center">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={save.isPending}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full flex justify-start text-muted-foreground font-normal border-dashed border-2 hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={save.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                {file ? file.name : "Click to select a PDF file (max 20MB)..."}
              </Button>
            </div>
          ) : (
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
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={save.isPending || (mode === "pdf" ? !file : !input.trim())}
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
