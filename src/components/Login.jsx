import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../services/config";
import { setAuthToken } from "../services/api";
import vmartLogo from "../assets/VMART.jpg";
import "./Login.scss";

function Login({ onAdminLogin = () => {}, onUserLogin = () => {} }) {
  const navigate = useNavigate();

  const [adminForm, setAdminForm]       = useState({ email: "", password: "", clientId: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const safeParseResponse = async (response) => {
    const ct   = response.headers.get("content-type") || "";
    const text = await response.text();
    if (ct.includes("application/json")) {
      try { return text ? JSON.parse(text) : {}; }
      catch { return { error: "Invalid JSON from server.", _raw: text }; }
    }
    return { error: "Non-JSON response from server.", _raw: text };
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    if (!adminForm.email || !adminForm.password) {
      setError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }
    if (!adminForm.clientId.trim()) {
      setError("Please enter your Client ID.");
      setIsLoading(false);
      return;
    }
    try {
      const res  = await fetch(`${API_BASE_URL}/admin/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:     adminForm.email,
          password:  adminForm.password,
          client_id: adminForm.clientId.trim(),
        }),
      });
      const data = await safeParseResponse(res);
      if (res.ok && data.access && data.refresh) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        setAuthToken(data.access);
        const userData = { ...data.user, is_admin: true };
        localStorage.setItem("user", JSON.stringify(userData));
        onAdminLogin(userData);
        navigate("/admin-dashboard");
        return;
      }
      setError(data?.error || "Login failed. Please check your credentials.");
    } catch (err) {
      console.error(err);
      setError("Request failed. Check backend URL / CORS / server logs.");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="login-page">

      {/* ══════ LEFT ══════ */}
      <div className="login-left">
        <span className="blob blob-top"    />
        <span className="blob blob-bottom" />
        <div className="brand-card">
          <img src={vmartLogo} alt="VMART" className="brand-logo" />
        </div>
        <p className="brand-tagline">Your trusted partner in every journey.</p>
      </div>

      {/* ══════ RIGHT ══════ */}
      <div className="login-right">

        <span className="deco-ring deco-ring--1" />
        <span className="deco-ring deco-ring--2" />

        <div className="form-box">

          {/* Badge */}
          <div className="admin-badge">
            <span className="admin-badge__dot" />
            Admin Portal
          </div>

          <h1 className="greeting">Welcome Back</h1>
          <p  className="sub">Sign in to access your dashboard</p>

          {/* Error */}
          {error && (
            <div className="error-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8"  x2="12"    y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleAdminSubmit} noValidate>

            {/* Client ID */}
            <div className={`field ${focusedField === "clientId" ? "field--focused" : ""} ${adminForm.clientId ? "field--filled" : ""}`}>
              <label htmlFor="adm-client">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                </svg>
                Client ID
              </label>
              <input
                id="adm-client" type="text"
                value={adminForm.clientId}
                onChange={(e) => { setAdminForm(p => ({ ...p, clientId: e.target.value })); if (error) setError(""); }}
                onFocus={() => setFocusedField("clientId")}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g. 111"
                required disabled={isLoading}
                autoComplete="off"
              />
              <span className="field__bar" />
            </div>

            {/* Email */}
            <div className={`field ${focusedField === "email" ? "field--focused" : ""} ${adminForm.email ? "field--filled" : ""}`}>
              <label htmlFor="adm-email">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email Address
              </label>
              <input
                id="adm-email" type="email"
                value={adminForm.email}
                onChange={(e) => { setAdminForm(p => ({ ...p, email: e.target.value })); if (error) setError(""); }}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="admin@example.com"
                required disabled={isLoading}
              />
              <span className="field__bar" />
            </div>

            {/* Password */}
            <div className={`field ${focusedField === "password" ? "field--focused" : ""} ${adminForm.password ? "field--filled" : ""}`}>
              <label htmlFor="adm-pw">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Password
              </label>
              <div className="pw-wrap">
                <input
                  id="adm-pw" type={showPassword ? "text" : "password"}
                  value={adminForm.password}
                  onChange={(e) => { setAdminForm(p => ({ ...p, password: e.target.value })); if (error) setError(""); }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required disabled={isLoading}
                />
                <button type="button" className="eye-btn" tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)} disabled={isLoading}>
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              <span className="field__bar" />
            </div>

            {/* Remember */}
            <label className="remember">
              <span className="remember__check">
                <input type="checkbox" />
                <span className="remember__box" />
              </span>
              Keep me signed in
            </label>

            {/* Submit */}
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading
                ? <><span className="spinner" />Signing in…</>
                : <>
                    Sign In
                    <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
              }
            </button>

          </form>

          <p className="form-footer">
            🔒 Secure admin access &nbsp;·&nbsp; VMART &copy; {new Date().getFullYear()}
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;