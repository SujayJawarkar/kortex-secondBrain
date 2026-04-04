import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth.store";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import SearchPage from "./pages/SearchPage";
import GraphPage from "./pages/GraphPage";
import SettingsPage from "./pages/SettingsPage";
import UpgradePage from "./pages/UpgradePage";
import NotFoundPage from "./pages/NotFoundPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuth);
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuth);
  return !isAuth ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/search"
          element={
            <PrivateRoute>
              <SearchPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/graph"
          element={
            <PrivateRoute>
              <GraphPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/upgrade"
          element={
            <PrivateRoute>
              <UpgradePage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
