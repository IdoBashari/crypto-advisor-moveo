import { Navigate, Route, Routes } from "react-router-dom";
import { IndexRedirect } from "./components/IndexRedirect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { RequireNoPreferences } from "./components/RequireNoPreferences";
import { RequirePreferences } from "./components/RequirePreferences";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      {/* "/" routes but renders nothing; the two content paths below render
          but do not decide. Signing in lands here, and this sends the user on,
          so the auth screens never repeat the decision. */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <IndexRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <RequireNoPreferences>
              <OnboardingPage />
            </RequireNoPreferences>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RequirePreferences>
              <DashboardPage />
            </RequirePreferences>
          </ProtectedRoute>
        }
      />

      {/* Unknown paths fall back to "/", which then decides. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
