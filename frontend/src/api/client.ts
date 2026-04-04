import axios from "axios";
import toast from "react-hot-toast";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (err.config?.url !== "/auth/login") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    } else if (!err.response && err.message === "Network Error") {
      toast.error("Network Error: The server is unreachable or offline.");
    }
    return Promise.reject(err);
  },
);
