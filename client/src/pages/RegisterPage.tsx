import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { NO_FORM_ERROR, toFormError } from "../auth/form-error";
import type { FormErrorState } from "../auth/form-error";

export function RegisterPage() {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FormErrorState>(NO_FORM_ERROR);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Guards against a double submit from a fast second click or an Enter
    // press landing before the button has re-rendered as disabled.
    if (submitting) return;

    setSubmitting(true);
    setError(NO_FORM_ERROR);

    try {
      await register({ name, email, password });
      // No navigation needed: once the user is set, the route wrapper for
      // /register redirects to the dashboard.
    } catch (caught) {
      setError(toFormError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <h1>Create an account</h1>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error.message !== null && (
          <p className="form-error" role="alert">
            {error.message}
          </p>
        )}

        <div className="field">
          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error.fields.name !== undefined}
          />
          {error.fields.name?.map((message) => (
            <p className="field-error" key={message}>
              {message}
            </p>
          ))}
        </div>

        <div className="field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
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
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
