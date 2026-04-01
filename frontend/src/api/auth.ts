import { api } from "./client";

export const authApi = {
  register: (email: string, password: string) =>
    api.post("/auth/register", { email, password }),

  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
};
