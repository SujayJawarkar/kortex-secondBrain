import { useState } from "react";
import {
  ExternalLink,
  Trash2,
  FileText,
  Link2,
  StickyNote,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Plus
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { itemsApi } from "../../api/items";
import type { Item } from "../../types";

const sourceIcon = {
  url: Link2,
  pdf: FileText,
  note: StickyNote,
};

const statusConfig = {
  queued: { icon: Clock, color: "text-yellow-500", label: "Queued" },
  processing: { icon: Loader2, color: "text-blue-500", label: "Processing" },
  ready: { icon: CheckCircle2, color: "text-green-500", label: "Ready" },
  failed: { icon: AlertCircle, color: "text-red-500", label: "Failed" },
};

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
};

interface Props {
  item: Item;
  onSelect?: (item: Item) => void;
}

export default function ItemCard({ item, onSelect }: Props) {
  const queryClient = useQueryClient();
  const [deleting, setDel] = useState(false);
  const SourceIcon = sourceIcon[item.sourceType];
  const status = statusConfig[item.status];
  const StatusIcon = status.icon;
  const isProcessing = item.status === "processing" || item.status === "queued";

  const deleteMutation = useMutation({
    mutationFn: () => itemsApi.delete(item.id),
    onMutate: () => setDel(true),
    onSuccess: () => {
      toast.success("Item deleted");
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: () => {
      setDel(false);
      toast.error("Failed to delete");
    },
  });

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");

  const addTagMutation = useMutation({
    mutationFn: (tag: string) => itemsApi.addTag(item.id, tag),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
  
  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => itemsApi.removeTag(item.id, tag),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });

  const formattedDate = new Date(item.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`
        group relative bg-card border border-border rounded-2xl p-4
        hover:border-brand-300 dark:hover:border-brand-700
        hover:shadow-md transition-all duration-200 cursor-pointer
        ${isProcessing ? "opacity-75" : ""}
        ${deleting ? "opacity-50 pointer-events-none" : ""}
      `}
      onClick={() => onSelect?.(item)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <SourceIcon className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {item.title}
          </h3>

          {item.url && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {getHostname(item.url)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {item.url && getHostname(item.url) !== item.url && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={(e) => {
                e.stopPropagation();
                window.open(item.url!, "_blank");
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={(e: any) => {
              e.stopPropagation();
              deleteMutation.mutate();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      {item.summary && item.status === "ready" && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
          {item.summary}
        </p>
      )}

      {/* Tags */}
      {item.status === "ready" && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(item.tags ?? []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1.5 flex items-center gap-1 group/tag">
              {tag}
              <button
                type="button"
                className="opacity-0 group-hover/tag:opacity-100 hover:text-red-500 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTagMutation.mutate(tag);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {isAddingTag ? (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (newTag.trim()) {
                  addTagMutation.mutate(newTag.trim());
                  setNewTag("");
                  setIsAddingTag(false);
                }
              }}
              className="flex items-center"
            >
              <input 
                autoFocus
                className="h-5 text-[10px] px-1.5 w-20 border border-border rounded bg-transparent focus:outline-brand-500 text-foreground"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsAddingTag(false);
                }}
                onBlur={() => {
                  if (!newTag.trim()) setIsAddingTag(false);
                }}
                placeholder="tag name..."
              />
            </form>
          ) : (
            <button
              type="button"
              className="h-5 px-1.5 text-[10px] border border-dashed border-border rounded text-muted-foreground hover:text-foreground hover:border-brand-500 transition-colors flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingTag(true);
              }}
            >
              <Plus className="w-3 h-3 mr-0.5" />
              tag
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">{formattedDate}</span>

        <div
          className={`flex items-center gap-1 text-xs font-medium ${status.color}`}
        >
          <StatusIcon
            className={`w-3 h-3 ${isProcessing ? "animate-spin" : ""}`}
          />
          <span>{status.label}</span>
        </div>
      </div>
    </div>
  );
}
