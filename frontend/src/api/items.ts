import { api } from "./client";

export const itemsApi = {
  save: (data: { url?: string; note?: string }) => api.post("/items", data),

  list: () => api.get("/items"),

  getById: (id: string) => api.get(`/items/${id}`),

  delete: (id: string) => api.delete(`/items/${id}`),

  search: (q: string, sourceType?: string) =>
    api.get("/search", { params: { q, source_type: sourceType } }),

  graph: () => api.get("/graph"),

  related: (id: string) => api.get(`/graph/related/${id}`),

  addTag: (id: string, tag: string) =>
    api.post(`/items/${id}/tags`, { tags: [tag] }),

  removeTag: (id: string, tag: string) =>
    api.delete(`/items/${id}/tags/${tag}`),
};
