import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { NO_FORM_ERROR, toFormError } from "../auth/form-error";
import type { FormErrorState } from "../auth/form-error";

export function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FormErrorState>(NO_FORM_ERROR);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(NO_FORM_ERROR);

    try {
      await login({ email, password });
    } catch (caught) {
      // A failed login returns a single generic message by design; there is no
      // per-field detail to show and none is invented here.
      setError(toFormError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <h1>Log in</h1>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error.message !== null && (
          <p className="form-error" role="alert">
            {error.message}
          </p>
        )}

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error.fields.email !== undefined}
          />
          {error.fields.email?.map((message) => (
            <p className="field-error" key={message}>
              {message}
            </p>
          ))}
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error.fields.password !== undefined}
          />
          {error.fields.password?.map((message) => (
            <p className="field-error" key={message}>
              {message}
            </p>
          ))}
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="auth-switch">
        Need an account? <Link to="/register">Register</Link>
      </p>
    </main>
  );
}
