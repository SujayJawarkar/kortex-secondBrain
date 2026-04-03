import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/auth.store";

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),

    onSuccess: (res) => {
      const { user, token } = res.data;
      // Clear ALL cached queries from previous user before navigating
      queryClient.clear();
      setAuth(user, token);
      toast.success("Welcome back!");
      navigate("/");
    },

    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Login failed");
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.register(email, password),

    onSuccess: (res) => {
      const { user, token } = res.data;
      // Clear ALL cached queries from previous user before navigating
      queryClient.clear();
      setAuth(user, token);
      toast.success("Account created!");
      navigate("/");
    },

    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Registration failed");
    },
  });
}
