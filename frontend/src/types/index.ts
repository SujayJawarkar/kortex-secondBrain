export interface User {
  id: string;
  email: string;
  plan: "free" | "pro";
}

export interface Item {
  id: string;
  title: string;
  url: string | null;
  summary: string | null;
  sourceType: "url" | "pdf" | "note";
  status: "queued" | "processing" | "ready" | "failed";
  createdAt: string;
  score?: number;
  tags?: string[];
}

export interface GraphNode {
  id: string;
  title: string;
  url: string | null;
  sourceType: string;
  tags: string[];
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  similarity: number;
  linkType: string;
}
