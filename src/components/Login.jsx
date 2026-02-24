import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../services/config";
import { setAuthToken } from "../services/api";
import "./Login.scss";

function Login({ onAdminLogin = () => {}, onUserLogin = () => {} }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin state
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  // User state
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ─── Helpers ───────────────────────────────────────────────

  const safeParseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    if (contentType.includes("application/json")) {
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return { error: "Invalid JSON response from server.", _raw: text };
      }
    }
    return { error: "Non-JSON response from server.", _raw: text };
  };

  const switchTab = (toAdmin) => {
    setIsAdmin(toAdmin);
    setError("");
    setPhone("");
    setAdminForm({ email: "", password: "" });
  };

  // ─── Admin Login ──────────────────────────────────────────

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!adminForm.email || !adminForm.password) {
      setError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminForm.email, password: adminForm.password }),
      });

      const data = await safeParseResponse(response);

      if (response.ok && data.access && data.refresh) {
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
      if (data?._raw) console.error("Raw server response:", data._raw);
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Request failed. Check backend URL / CORS / server logs.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── User Login (phone → debtors API check) ───────────────

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: cleaned }),
      });

      const data = await safeParseResponse(response);

      if (response.ok && data.access && data.refresh) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        setAuthToken(data.access);
        const userData = { 
          ...data.user, 
          is_admin: false,
          debtor_name: data.debtor_name || '',
          debtor_code: data.debtor_code || '',
          place: data.place || '',
        };
        localStorage.setItem("user", JSON.stringify(userData));
        onUserLogin(userData);
        navigate("/user-dashboard");
        return;
      }

      setError((() => { const msg = data?.error || "Login failed. Please check your number."; if (msg.toLowerCase().includes("not registered")) return "This number isn't linked to any account. Please check and try again."; return msg.replace(/\.?\s*Please contact.*?(admin|us)\.?/gi, "").trim(); })());
      if (data?._raw) console.error("Raw server response:", data._raw);
    } catch (err) {
      console.error("User login error:", err);
      setError("Request failed. Check backend URL / CORS / server logs.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="login-container">
      <div className="login-card">

        {/* Left panel */}
        <div className="login-left">
          <div className="logo-section">
            <div className="logo-circles">
              <div className="circle"></div>
              <div className="circle"></div>
              <div className="circle"></div>
            </div>
            <div className="welcome-text">
              <h2>Welcome Back!</h2>
              <p>Sign in to access your account and continue your journey with us.</p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="login-right">
          <div className="login-header">
            <h1>Sign In</h1>
            <p>Enter your credentials to continue</p>
          </div>

          {/* Tab toggle */}
          <div className="login-type-toggle">
            <button
              type="button"
              className={!isAdmin ? "active" : ""}
              onClick={() => switchTab(false)}
            >
              User Login
            </button>
            <button
              type="button"
              className={isAdmin ? "active" : ""}
              onClick={() => switchTab(true)}
            >
              Admin Login
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="alert-message alert-error">
              <span className="alert-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <span className="alert-text">{error}</span>
            </div>
          )}

          {/* ── ADMIN: email + password ── */}
          {isAdmin && (
            <form className="login-form" onSubmit={handleAdminSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="email"
                    id="email"
                    value={adminForm.email}
                    onChange={(e) => { setAdminForm((p) => ({ ...p, email: e.target.value })); if (error) setError(""); }}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={adminForm.password}
                    onChange={(e) => { setAdminForm((p) => ({ ...p, password: e.target.value })); if (error) setError(""); }}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    style={{ paddingRight: "45px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    disabled={isLoading}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                {/* <a href="#" className="forgot-password">Forgot Password?</a> */}
              </div>

              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Get Started"}
              </button>
            </form>
          )}

          {/* ── USER: phone number only ── */}
          {!isAdmin && (
            <form className="login-form" onSubmit={handleUserSubmit}>
              <div className="form-group">
                <label htmlFor="phone">Mobile Number</label>
                <div className="input-wrapper phone-input-wrapper">
                  <span className="input-icon">📱</span>
                  <span className="country-code">+91</span>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(val);
                      if (error) setError("");
                    }}
                    placeholder="Enter your mobile number"
                    required
                    disabled={isLoading}
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                <span className="field-hint">Enter the number registered with your account</span>
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={isLoading || phone.replace(/\D/g, "").length < 10}
              >
                {isLoading ? "Verifying..." : "Login"}
              </button>
            </form>
          )}

          <div className="login-footer">
            {/* <p>Don't have an account? <a href="#">Contact Admin</a></p> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;