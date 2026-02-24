import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../services/config";
import AdminSidebar from "./Adminsidebar";
import "./AdminDashboard.scss";

/* ─── Icons ─── */
const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const BlockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

/* ─── Mirrors UserDashboard.jsx helpers exactly ─── */
const cleanDebtorName = (raw = "") =>
  raw.replace(/\d{8,}$/, "").trim();

// Same priority as UserDashboard resolveDisplayName()
const resolveDisplayName = (user) => {
  if (!user) return "—";
  if (user.debtor_name) return cleanDebtorName(user.debtor_name);
  if (user.business_name) return user.business_name;
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  if (full) return full;
  if (user.shop_name) return user.shop_name;
  return user.username || "—";
};

const DEBTOR_API = "https://vsaverapi.imcbs.com/api/debtors/";

/* ════════════════════════════════════════════════════════════════ */
const AdminDashboard = ({ onLogout, userData }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [stats, setStats] = useState({ total_admins: 0, active_admins: 0, disabled_admins: 0 });

  /* ── Debtor autocomplete state ── */
  const [debtors, setDebtors] = useState([]);
  const [debtorSearch, setDebtorSearch] = useState("");
  const [debtorSuggestions, setDebtorSuggestions] = useState([]);
  const [debtorLoading, setDebtorLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debtorNextUrl = useRef(null);
  const debtorSearchTimeout = useRef(null);
  const suggestionsRef = useRef(null);

  const [newAdmin, setNewAdmin] = useState({
    username: "",
    password: "",
    phone_number: "",
    shop_name: "",
  });

  useEffect(() => {
    if (userData?.username) setAdminName(userData.username);
    else {
      const stored = localStorage.getItem("user");
      if (stored) {
        const p = JSON.parse(stored);
        setAdminName(p.username || p.email || "Admin");
      }
    }
    fetchAdmins();
    fetchStats();
  }, [userData]);

  /* ── Click outside to close suggestions ── */
  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  });

  /* ─── Debtor search (live) ─── */
  const searchDebtors = async (query) => {
    if (!query || query.length < 2) {
      setDebtorSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setDebtorLoading(true);
    try {
      const url = `${DEBTOR_API}?search=${encodeURIComponent(query)}&page_size=15`;
      const res = await axios.get(url);
      const results = res.data?.results || [];
      setDebtorSuggestions(results);
      setShowSuggestions(true);
    } catch {
      // fallback: filter local cache if available
      const filtered = debtors.filter((d) =>
        cleanDebtorName(d.name).toLowerCase().includes(query.toLowerCase())
      );
      setDebtorSuggestions(filtered.slice(0, 15));
      setShowSuggestions(filtered.length > 0);
    } finally {
      setDebtorLoading(false);
    }
  };

  const handleDebtorInput = (val) => {
    setDebtorSearch(val);
    clearTimeout(debtorSearchTimeout.current);
    debtorSearchTimeout.current = setTimeout(() => searchDebtors(val), 300);
  };

  const selectDebtor = (debtor) => {
    const name = cleanDebtorName(debtor.name);
    setDebtorSearch(name);
    setNewAdmin((prev) => ({
      ...prev,
      username: debtor.code || prev.username,
      phone_number: debtor.phone2 || prev.phone_number,
      shop_name: name,
      // Use place as location hint stored in business_name / location
      location: debtor.place || prev.location || "",
    }));
    setShowSuggestions(false);
    setDebtorSuggestions([]);
  };

  /* ─── API calls ─── */
  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admins/stats/`, { headers: getAuthHeaders() });
      setStats(res.data);
    } catch {}
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/admins/`, { headers: getAuthHeaders() });
      setAdmins(res.data);
      // fallback stats
      setStats({
        total_admins: res.data.length,
        active_admins: res.data.filter((a) => a.status === "Active").length,
        disabled_admins: res.data.filter((a) => a.status === "Disable").length,
      });
    } catch {
      alert("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) {
      alert("Please fill in Username and Password.");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/admins/`, newAdmin, { headers: getAuthHeaders() });
      fetchAdmins(); fetchStats();
      setShowAddForm(false);
      resetNewAdmin();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || "Failed to add user";
      alert(`❌ ${msg}`);
    }
  };

  const openEditForm = (user) => {
    setEditingUser({ ...user, password: "" });
    setShowEditForm(true);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      const payload = { ...editingUser };
      if (!payload.password) delete payload.password;
      await axios.patch(`${API_BASE_URL}/admins/${editingUser.id}/`, payload, { headers: getAuthHeaders() });
      fetchAdmins(); fetchStats();
      setShowEditForm(false);
      setEditingUser(null);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || "Failed to update";
      alert(`❌ ${msg}`);
    }
  };

  const deleteAdmin = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/admins/${id}/`, { headers: getAuthHeaders() });
      fetchAdmins(); fetchStats();
    } catch {
      alert("❌ Failed to delete user");
    }
  };

  const resetNewAdmin = () => {
    setNewAdmin({ username: "", password: "", phone_number: "", shop_name: "" });
    setDebtorSearch("");
    setDebtorSuggestions([]);
  };

  const filteredAdmins = admins.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      resolveDisplayName(a).toLowerCase().includes(term) ||
      a.username?.toLowerCase().includes(term) ||
      a.phone_number?.toLowerCase().includes(term)
    );
  });

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="admin-dashboard-container">
      <AdminSidebar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={onLogout}
        adminName={adminName}
      />

      <main className={`admin-main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="content-wrapper">

          {/* ── Page Header ── */}
          <div className="page-header">
            <div className="header-left">
              <h1 className="page-title">User Management</h1>
              <p className="page-subtitle">Manage and monitor all business users</p>
            </div>
            <div className="header-actions">
              <div className="search-wrapper">
                <SearchIcon />
                <input
                  className="search-input"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="add-user-btn" onClick={() => setShowAddForm(true)}>
                <PlusIcon /> Add User
              </button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="stats-container">
            <div className="stat-card total">
              <div className="stat-icon"><UsersIcon /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.total_admins}</div>
                <div className="stat-label">Total Users</div>
              </div>
            </div>
            <div className="stat-card active">
              <div className="stat-icon"><CheckIcon /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.active_admins}</div>
                <div className="stat-label">Active</div>
              </div>
            </div>
            <div className="stat-card disabled">
              <div className="stat-icon"><BlockIcon /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.disabled_admins}</div>
                <div className="stat-label">Disabled</div>
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="table-section">
            <div className="table-header">
              <h2 className="table-title">All Users <span className="count-badge">{filteredAdmins.length}</span></h2>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className="loading-cell"><div className="loading-spinner" /> Loading...</td></tr>
                  ) : filteredAdmins.length === 0 ? (
                    <tr><td colSpan="4" className="empty-cell">No users found</td></tr>
                  ) : (
                    filteredAdmins.map((u, i) => (
                      <tr key={u.id}>
                        <td className="row-num">{i + 1}</td>
                        <td className="name-cell">
                          <div className="user-avatar">{resolveDisplayName(u)[0].toUpperCase()}</div>
                          <span>{resolveDisplayName(u)}</span>
                        </td>
                        <td>{u.phone_number || "—"}</td>
                        <td className="actions-cell">
                          <div className="actions-inner">
                            <button className="action-btn edit" title="Edit" onClick={() => openEditForm(u)}><EditIcon /></button>
                            <button className="action-btn delete" title="Delete" onClick={() => deleteAdmin(u.id)}><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════ ADD USER MODAL ═══════════ */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => { setShowAddForm(false); resetNewAdmin(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New User</h2>
              <button className="modal-close" onClick={() => { setShowAddForm(false); resetNewAdmin(); }}><CloseIcon /></button>
            </div>

            <div className="modal-body">
              <div className="form-grid">

                {/* ── Debtor Name Search (autocomplete) ── */}
                <div className="form-field full-width" ref={suggestionsRef}>
                  <label>Search Customer Name <span className="label-hint">(from Misel)</span></label>
                  <div className="debtor-search-wrapper">
                    <input
                      type="text"
                      className="debtor-input"
                      placeholder="Type name to search..."
                      value={debtorSearch}
                      onChange={(e) => handleDebtorInput(e.target.value)}
                      onFocus={() => debtorSuggestions.length > 0 && setShowSuggestions(true)}
                      autoComplete="off"
                    />
                    {debtorLoading && <div className="debtor-spinner" />}
                    {showSuggestions && debtorSuggestions.length > 0 && (
                      <ul className="debtor-suggestions">
                        {debtorSuggestions.map((d, idx) => (
                          <li key={idx} onMouseDown={() => selectDebtor(d)} className="suggestion-item">
                            <span className="sug-name">{cleanDebtorName(d.name)}</span>
                            <span className="sug-meta">{d.place || ""} {d.phone2 ? `· ${d.phone2}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="field-hint">Selecting a customer will auto-fill username, phone & shop name.</p>
                </div>

                {/* ── Shop Name ── */}
                <div className="form-field">
                  <label>Shop / Business Name</label>
                  <input
                    type="text"
                    value={newAdmin.shop_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, shop_name: e.target.value })}
                    placeholder="Shop name"
                  />
                </div>

                {/* ── Username ── */}
                <div className="form-field">
                  <label>Username <span className="required">*</span></label>
                  <input
                    type="text"
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    placeholder="e.g. john_doe"
                    required
                  />
                </div>

                {/* ── Password ── */}
                <div className="form-field">
                  <label>Password <span className="required">*</span></label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {/* ── Phone ── */}
                <div className="form-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={newAdmin.phone_number}
                    onChange={(e) => setNewAdmin({ ...newAdmin, phone_number: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => { setShowAddForm(false); resetNewAdmin(); }}>Cancel</button>
              <button className="submit-btn" onClick={addAdmin}>Add User</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ EDIT USER MODAL ═══════════ */}
      {showEditForm && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit User</h2>
              <button className="modal-close" onClick={() => setShowEditForm(false)}><CloseIcon /></button>
            </div>

            <div className="modal-body">
              <div className="form-grid">

                <div className="form-field">
                  <label>Shop / Business Name</label>
                  <input
                    type="text"
                    value={editingUser.shop_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, shop_name: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Username</label>
                  <input
                    type="text"
                    value={editingUser.username || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>New Password <span className="label-hint">(leave blank to keep current)</span></label>
                  <input
                    type="password"
                    value={editingUser.password || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div className="form-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={editingUser.phone_number || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                  />
                </div>

              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowEditForm(false)}>Cancel</button>
              <button className="submit-btn" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;