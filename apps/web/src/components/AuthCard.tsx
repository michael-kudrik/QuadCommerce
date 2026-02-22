import { FormEventHandler } from "react";
import { Link } from "react-router-dom";

export function AuthCard({
  title,
  onSubmit,
  err,
  includeName,
  loading = false
}: {
  title: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  err: string;
  includeName: boolean;
  loading?: boolean;
}) {
  const isRegister = includeName;
  return (
    <section className="card" style={{ maxWidth: 440, margin: "30px auto" }}>
      <h2>{title}</h2>
      <form className="form" onSubmit={onSubmit} method="post" aria-busy={loading}>
        <fieldset disabled={loading} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {includeName ? <input className="input" name="name" placeholder="Name" required /> : null}
          <input className="input" name="email" placeholder="you@school.edu" required />
          <input className="input" name="password" type="password" placeholder="Password" required />
          {includeName ? (
            <select className="select" name="role" defaultValue="student">
              <option value="student">Student</option>
              <option value="businessOwner">Business Owner</option>
            </select>
          ) : null}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? "Please wait…" : "Continue"}</button>
        </fieldset>
      </form>
      {loading ? <p className="meta">Submitting…</p> : null}
      {err ? <p className="muted" style={{ color: "#ef4444" }}>{err}</p> : null}
      <p className="meta" style={{ marginTop: 10 }}>
        {isRegister ? <>Already have an account? <Link to="/login">Login</Link></> : <>Need an account? <Link to="/register">Register</Link></>}
      </p>
    </section>
  );
}
