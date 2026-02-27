import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../services/config";
import { setAuthToken } from "../services/api";
import vmartLogo from "../assets/VMART.jpg"; // ← put VMART.jpg in src/assets/
import "./Login.scss";

function Login({ onAdminLogin = () => {}, onUserLogin = () => {} }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin]         = useState(false);
  const [adminForm, setAdminForm]     = useState({ email: "", password: "", clientId: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState("");

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const safeParseResponse = async (response) => {
    const ct   = response.headers.get("content-type") || "";
    const text = await response.text();
    if (ct.includes("application/json")) {
      try { return text ? JSON.parse(text) : {}; }
      catch { return { error: "Invalid JSON from server.", _raw: text }; }
    }
    return { error: "Non-JSON response from server.", _raw: text };
  };

  const switchTab = (toAdmin) => {
    setIsAdmin(toAdmin);
    setError("");
    setPhone("");
    setAdminForm({ email: "", password: "", clientId: "" });
  };

  // ─── Admin Login ──────────────────────────────────────────────────────────
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
      if (data?._raw) console.error("Raw:", data._raw);
    } catch (err) {
      console.error(err);
      setError("Request failed. Check backend URL / CORS / server logs.");
    } finally { setIsLoading(false); }
  };

  // ─── User Login ───────────────────────────────────────────────────────────
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) { setError("Please enter a valid 10-digit mobile number."); return; }
    setIsLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/user/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: cleaned }),
      });
      const data = await safeParseResponse(res);
      if (res.ok && data.access && data.refresh) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        setAuthToken(data.access);
        const userData = {
          ...data.user, is_admin: false,
          debtor_name: data.debtor_name || "",
          debtor_code: data.debtor_code || "",
          place:       data.place       || "",
        };
        localStorage.setItem("user", JSON.stringify(userData));
        onUserLogin(userData);
        navigate("/user-dashboard");
        return;
      }
      setError((() => {
        const msg = data?.error || "Login failed. Please check your number.";
        if (msg.toLowerCase().includes("not registered"))
          return "This number isn't linked to any account. Please check and try again.";
        return msg.replace(/\.?\s*Please contact.*?(admin|us)\.?/gi, "").trim();
      })());
      if (data?._raw) console.error("Raw:", data._raw);
    } catch (err) {
      console.error(err);
      setError("Request failed. Check backend URL / CORS / server logs.");
    } finally { setIsLoading(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="login-page">

      {/* ══════ LEFT — orange + logo ══════ */}
      <div className="login-left">

        {/* decorative blobs */}
        <span className="blob blob-top"    />
        <span className="blob blob-bottom" />

        <div className="brand-card">
          <img src={vmartLogo} alt="VMART" className="brand-logo" />
        </div>
        <p className="brand-tagline">Your trusted partner in every journey.</p>
      </div>

      {/* ══════ RIGHT — white + form ══════ */}
      <div className="login-right">
        <div className="form-box">

          <h1 className="greeting">Welcome Back</h1>
          <p  className="sub">Sign in to continue</p>

          {/* Tabs */}
          <div className="tabs">
            <button
              type="button"
              className={`tab ${!isAdmin ? "tab--active" : ""}`}
              onClick={() => switchTab(false)}
            >User Login</button>
            <button
              type="button"
              className={`tab ${isAdmin ? "tab--active" : ""}`}
              onClick={() => switchTab(true)}
            >Admin Login</button>
          </div>

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

          {/* ── Admin ── */}
          {isAdmin && (
            <form onSubmit={handleAdminSubmit}>
              <div className="field">
                <label htmlFor="adm-client">Client ID</label>
                <input
                  id="adm-client" type="text"
                  value={adminForm.clientId}
                  onChange={(e) => { setAdminForm(p => ({ ...p, clientId: e.target.value })); if (error) setError(""); }}
                  placeholder="e.g. 111"
                  required disabled={isLoading}
                  autoComplete="off"
                />
              </div>

              <div className="field">
                <label htmlFor="adm-email">Email Address</label>
                <input
                  id="adm-email" type="email"
                  value={adminForm.email}
                  onChange={(e) => { setAdminForm(p => ({ ...p, email: e.target.value })); if (error) setError(""); }}
                  placeholder="admin@example.com"
                  required disabled={isLoading}
                />
              </div>

              <div className="field">
                <label htmlFor="adm-pw">Password</label>
                <div className="pw-wrap">
                  <input
                    id="adm-pw" type={showPassword ? "text" : "password"}
                    value={adminForm.password}
                    onChange={(e) => { setAdminForm(p => ({ ...p, password: e.target.value })); if (error) setError(""); }}
                    placeholder="••••••••"
                    required disabled={isLoading}
                  />
                  <button type="button" className="eye-btn" tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)} disabled={isLoading}>
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <label className="remember">
                <input type="checkbox" /> Remember me
              </label>

              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? "Signing in…" : "Log in"}
              </button>
            </form>
          )}

          {/* ── User ── */}
          {!isAdmin && (
            <form onSubmit={handleUserSubmit}>
              <div className="field">
                <label htmlFor="usr-phone">Mobile Number</label>
                <div className="phone-wrap">
                  <span className="dial">+91</span>
                  <input
                    id="usr-phone" type="tel"
                    value={phone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(v);
                      if (error) setError("");
                    }}
                    placeholder="Enter your mobile number"
                    required disabled={isLoading}
                    maxLength={10} inputMode="numeric"
                  />
                </div>
                <span className="hint">Enter the number registered with your account</span>
              </div>

              <button type="submit" className="login-btn"
                disabled={isLoading || phone.replace(/\D/g, "").length < 10}>
                {isLoading ? "Verifying…" : "Log in"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default Login;