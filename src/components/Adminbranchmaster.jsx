import React, { useState, useEffect } from 'react';
import AdminSidebar from './Adminsidebar';
import './AdminBranchMaster.scss';
import { API_BASE_URL } from '../services/config';

const ROWS_PER_PAGE = 8;

const AdminBranchMaster = ({ onLogout, userData }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  const [branches, setBranches] = useState([]);
  const [miselShops, setMiselShops] = useState([]);
  const [miselLoading, setMiselLoading] = useState(false);
  const [djangoUsers, setDjangoUsers] = useState([]); // ✅ FIX: Django user list for ID resolution
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [formData, setFormData] = useState({
    user: '',
    branch_name: '',
    branch_code: '',
    location: '',
    address: '',
    status: 'active'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);



  useEffect(() => {
    if (userData && userData.username) {
      setAdminName(userData.username);
    } else {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setAdminName(parsedUser.username || parsedUser.email || 'Admin');
      }
    }
    // Load data immediately for instant display
    fetchBranches();
    fetchMiselShops();
    fetchDjangoUsers(); // ✅ FIX: load Django users for proper ID resolution
    // Silently sync Misel shops → then auto-create any missing branches in background
    const token = localStorage.getItem('access_token');
    const autoCreateBranches = async () => {
      try {
        // 1. Sync Misel users into Django first
        await fetch(`${API_BASE_URL}/misel-sync/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        // 2. Fetch latest Misel shops
        const miselRes = await fetch('https://vsaverapi.imcbs.com/api/misel/');
        if (!miselRes.ok) return;
        const miselData = await miselRes.json();
        const shops = Array.isArray(miselData) ? miselData : (miselData.results || []);

        // 3. Fetch latest branches from Django
        const branchRes = await fetch(`${API_BASE_URL}/branch-master/`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!branchRes.ok) return;
        const existingBranches = await branchRes.json();
        const existingCodes = new Set(existingBranches.map(b => String(b.branch_code)));

        // 4. Create a branch for every shop that doesn't have one yet
        let anyCreated = false;

        // Fetch Django users for proper ID resolution
        const usersRes = await fetch(`${API_BASE_URL}/users/dropdown/`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const usersData = usersRes.ok ? await usersRes.json() : [];
        const djangoUsersList = Array.isArray(usersData) ? usersData : (usersData.results || []);

        for (const shop of shops) {
          const branchCode = shop.client_id ? String(shop.client_id) : String(shop.id);
          if (existingCodes.has(branchCode)) continue;

          // Resolve Django user PK — never use raw shop.id as the user FK
          const djangoUser =
            djangoUsersList.find(u => u.username === (shop.client_id ? `misel_${shop.client_id}` : `misel_${shop.id}`)) ||
            djangoUsersList.find(u => u.shop_name === shop.firm_name);

          if (!djangoUser) {
            console.warn(`No Django user found for Misel shop ${shop.firm_name} (id=${shop.id}), skipping auto-create`);
            continue;
          }

          const payload = new FormData();
          payload.append('user', djangoUser.id);
          payload.append('branch_name', shop.address1 || shop.firm_name);
          payload.append('branch_code', branchCode);
          payload.append('location', shop.address1 || '');
          payload.append('address', shop.address1 || '');
          payload.append('status', 'active');

          const res = await fetch(`${API_BASE_URL}/branch-master/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: payload,
          });
          if (res.ok) {
            existingCodes.add(branchCode);
            anyCreated = true;
          }
        }

        // 5. If new branches were created, refresh the table silently
        if (anyCreated) {
          const refreshRes = await fetch(`${API_BASE_URL}/branch-master/`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (refreshRes.ok) {
            const updated = await refreshRes.json();
            setBranches(updated);
          }
        }
      } catch (err) {
        console.error('Background branch auto-sync failed:', err);
      }
    };
    autoCreateBranches();
  }, [userData]);

  const handleToggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const getAuthToken = () => localStorage.getItem('access_token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => { setError(null); setSuccessMessage(null); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // ── FIX 1: Misel API returns plain array [], not { results: [] } ──
  const fetchMiselShops = async () => {
    setMiselLoading(true);
    try {
      const response = await fetch('https://vsaverapi.imcbs.com/api/misel/');
      if (!response.ok) { console.error('Failed to fetch Misel shops'); return; }
      const data = await response.json();
      setMiselShops(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('Error fetching Misel shops:', err);
    } finally {
      setMiselLoading(false);
    }
  };

  // ✅ FIX: Fetch actual Django users so we can resolve real Django PKs
  const fetchDjangoUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/dropdown/`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) return;
      const data = await response.json();
      setDjangoUsers(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('Error fetching Django users:', err);
    }
  };

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/branch-master/`, { headers: getHeaders() });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Session expired. Please login again.');
        throw new Error('Failed to fetch branches');
      }
      const data = await response.json();
      setBranches(data);
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError(err.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('user', formData.user);
      formDataToSend.append('branch_name', formData.branch_name);
      formDataToSend.append('branch_code', formData.branch_code);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('status', formData.status);

      const url = isEditing
        ? `${API_BASE_URL}/branch-master/${editingId}/`
        : `${API_BASE_URL}/branch-master/`;
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        const msg =
          errorData.error ||
          errorData.detail ||
          Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(', ') ||
          'Failed to save branch';
        throw new Error(msg);
      }

      setSuccessMessage(isEditing ? 'Branch updated successfully!' : 'Branch created successfully!');
      resetForm();
      await fetchBranches();
    } catch (err) {
      console.error('Error saving branch:', err);
      setError(err.message || 'Failed to save branch');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (branch) => {
    setFormData({
      user: branch.user_info?.id || branch.user || '',
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      location: branch.location || '',
      address: branch.address || '',
      status: branch.status
    });
    setIsEditing(true);
    setEditingId(branch.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => resetForm();

  const resetForm = () => {
    setFormData({
      user: '',
      branch_name: '',
      branch_code: '',
      location: '',
      address: '',
      status: 'active'
    });
    setIsEditing(false);
    setEditingId(null);
    setError(null);
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/branch-master/${branchId}/`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete branch');
      setSuccessMessage('Branch deleted successfully!');
      await fetchBranches();
    } catch (err) {
      console.error('Error deleting branch:', err);
      setError(err.message || 'Failed to delete branch');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ──
  const filteredBranches = branches.filter(b => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      b.branch_name?.toLowerCase().includes(q) ||
      b.branch_code?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.location?.toLowerCase().includes(q) ||
      b.state?.toLowerCase().includes(q) ||
      b.user_info?.shop_name?.toLowerCase().includes(q) ||
      b.manager_name?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / ROWS_PER_PAGE));
  const paginatedBranches = filteredBranches.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const handleSearchChange = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };

  const stats = {
    total:    branches.length,
    active:   branches.filter(b => b.status === 'active').length,
    inactive: branches.filter(b => b.status === 'inactive').length,
  };

  // ── Resolve the actual Django User PK for a given Misel shop ──
  // Username convention mirrors the backend sync:
  //   • client_id present  → "misel_{client_id}"   e.g. "misel_CLIENT001"
  //   • client_id absent   → "misel_{id}"           e.g. "misel_1"  (fallback)
  const resolveUserId = (shop) => {
    const clientId = (shop.client_id || '').trim();
    const expectedUsername = clientId
      ? `misel_${clientId}`
      : `misel_${shop.id}`;

    // 1. Match by derived username — most reliable
    const byUsername = djangoUsers.find(u => u.username === expectedUsername);
    if (byUsername?.id) return byUsername.id;

    // 2. Fallback: match by shop_name (business_name stored on User)
    const byShopName = djangoUsers.find(
      u => u.shop_name && u.shop_name === shop.firm_name
    );
    if (byShopName?.id) return byShopName.id;

    // 3. Already-linked branch
    const linked = branches.find(b => b.user_info?.shop_name === shop.firm_name);
    if (linked?.user_info?.id) return linked.user_info.id;

    // 4. Cannot resolve — return null so we show "sync needed" warning
    return null;
  };

  return (
    <div className="admin-branch-master-container">
      <AdminSidebar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onLogout={onLogout}
        adminName={adminName}
      />

      <main className={`branch-main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="content-wrapper">

          {/* Page Header */}
          <div className="page-header">
            <div className="header-left">
              <h1 className="page-title">Branch Master</h1>
              <p className="page-subtitle">Manage all branch locations</p>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="stats-strip">
            <div className="stat-card">
              <div className="stat-icon blue">🏢</div>
              <div><div className="stat-num">{stats.total}</div><div className="stat-lbl">Total Branches</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div><div className="stat-num">{stats.active}</div><div className="stat-lbl">Active</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">⛔</div>
              <div><div className="stat-num">{stats.inactive}</div><div className="stat-lbl">Inactive</div></div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {successMessage}
            </div>
          )}

          {/* Form Card */}
          <div className="form-card">
            <div className="card-header">
              <h2>{isEditing ? '✏️ Edit Branch' : '➕ Add New Branch'}</h2>
              {isEditing && (
                <button className="btn-cancel-header" onClick={handleCancel} disabled={loading}>
                  ✕ Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="branch-form">
              <div className="form-row">
                <div className="form-group user-shop-group">
                  <label>Assign to User/Shop *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={miselLoading ? 'Loading shops…' : 'Search shop name…'}
                      value={
                        userSearch !== ''
                          ? userSearch
                          : formData.user
                            ? (miselShops.find(s => String(s.id) === String(formData.user))?.firm_name ||
                               miselShops.find(s => resolveUserId(s) === formData.user)?.firm_name || '')
                            : ''
                      }
                      onChange={e => {
                        setUserSearch(e.target.value);
                        setShowUserDropdown(true);
                        setFormData(prev => ({ ...prev, user: '' }));
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                      disabled={loading || miselLoading}
                      style={{ width: '100%' }}
                    />
                    <input type="hidden" name="user" value={formData.user} />

                    {showUserDropdown && miselShops.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: '#fff', border: '1px solid #d0d5dd', borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999,
                        maxHeight: 220, overflowY: 'auto'
                      }}>
                        {miselShops
                          .filter(s => !userSearch || s.firm_name.toLowerCase().includes(userSearch.toLowerCase()))
                          .map(shop => (
                            <div
                              key={shop.id}
                              onMouseDown={() => {
                                const resolvedUserId = resolveUserId(shop);
                                if (!resolvedUserId) {
                                  alert(`Cannot find a Django user for "${shop.firm_name}". Please run Misel Sync first so the user is created in the system.`);
                                  return;
                                }
                                // ── use firm_name for branch_name, correct user ID ──
                                setFormData(prev => ({
                                  ...prev,
                                  user:        resolvedUserId,
                                  branch_name: shop.address1 || shop.firm_name,
                                  branch_code: shop.client_id ? String(shop.client_id) : String(shop.id),
                                  location:    shop.address1 || '',
                                  address:     shop.address1 || '',
                                }));
                                setUserSearch('');
                                setShowUserDropdown(false);
                              }}
                              style={{
                                padding: '10px 14px', cursor: 'pointer',
                                background: String(formData.user) === String(resolveUserId(shop)) ? '#f0f4ff' : '#fff',
                                borderBottom: '1px solid #f2f4f7',
                                display: 'flex', flexDirection: 'column', gap: 2
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f7f8ff'}
                              onMouseLeave={e => {
                                e.currentTarget.style.background =
                                  String(formData.user) === String(resolveUserId(shop)) ? '#f0f4ff' : '#fff';
                              }}
                            >
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#1d2939' }}>
                                🏪 {shop.firm_name}
                                {!resolveUserId(shop) && (
                                  <span style={{ color: '#f04438', fontSize: 11, marginLeft: 6 }}>⚠ sync needed</span>
                                )}
                              </span>
                              {shop.address1 && (
                                <span style={{ fontSize: 11, color: '#667085' }}>📍 {shop.address1}</span>
                              )}
                            </div>
                          ))}
                        {miselShops.filter(s =>
                          !userSearch || s.firm_name.toLowerCase().includes(userSearch.toLowerCase())
                        ).length === 0 && (
                          <div style={{ padding: '12px 14px', color: '#667085', fontSize: 13 }}>
                            No shops match your search.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {formData.user && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#12b76a', fontWeight: 500 }}>
                      ✅ {
                        miselShops.find(s => String(resolveUserId(s)) === String(formData.user))?.firm_name ||
                        miselShops.find(s => String(s.id) === String(formData.user))?.firm_name ||
                        `User ID: ${formData.user}`
                      }
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Branch Name *</label>
                  <input
                    type="text" name="branch_name" value={formData.branch_name}
                    onChange={handleInputChange} placeholder="e.g., Main Branch"
                    required disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Branch Code *</label>
                  <input
                    type="text" name="branch_code" value={formData.branch_code}
                    onChange={handleInputChange} placeholder="e.g., BR001"
                    required disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text" name="location" value={formData.location}
                    onChange={handleInputChange} placeholder="e.g., Downtown"
                    required disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status *</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} disabled={loading}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Address</label>
                  <input
                    type="text" name="address" value={formData.address}
                    onChange={handleInputChange} placeholder="Street address"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-actions">
                {isEditing && (
                  <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Saving...' : (isEditing ? 'Update Branch' : 'Create Branch')}
                </button>
              </div>
            </form>
          </div>

          {/* Table Section */}
          <div className="branches-table-section">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <h2>All Branches <span className="branch-count-badge">{filteredBranches.length}</span></h2>
              </div>
              <div className="table-toolbar-right">
                <div className="search-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text" placeholder="Search branches…"
                    value={searchQuery} onChange={handleSearchChange}
                  />
                </div>
              </div>
            </div>

            {loading && branches.length === 0 ? (
              <div className="table-empty-state">
                <div className="loading-spinner"></div>
                <p>Loading branches…</p>
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="table-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <p>{searchQuery ? 'No branches match your search.' : 'No branches created yet.'}</p>
              </div>
            ) : (
              <>
                <div className="table-scroll-wrap">
                  <table className="branches-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Branch</th><th>Shop Owner</th><th>Location</th>
                        <th>Address</th><th>Contact</th><th>Manager</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBranches.map((branch, idx) => (
                        <tr key={branch.id}>
                          <td className="row-num">{(currentPage - 1) * ROWS_PER_PAGE + idx + 1}</td>

                          <td>
                            <div className="branch-cell">
                              {branch.branch_image_url
                                ? <img className="branch-thumb" src={branch.branch_image_url} alt={branch.branch_name}/>
                                : <div className="branch-thumb-placeholder">🏢</div>
                              }
                              <div>
                                <div className="branch-cell-name">{branch.branch_name}</div>
                                <span className="branch-cell-code">{branch.branch_code}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {branch.user_info && (
                              <span className="shop-owner-pill">
                                🏪 {branch.user_info.shop_name || branch.user_info.username}
                              </span>
                            )}
                          </td>

                          <td>
                            <div className="location-cell">
                              <span className="location-city">
                                {[branch.city, branch.state].filter(Boolean).join(', ') || branch.location || '—'}
                              </span>
                              <span className="location-area">{branch.location}</span>
                            </div>
                          </td>

                          <td>
                            <div className="contact-cell">
                              {branch.address
                                ? <span>{branch.address}</span>
                                : <span style={{ color: '#97a0af' }}>—</span>}
                              {branch.pincode && <span className="contact-email">{branch.pincode}</span>}
                            </div>
                          </td>

                          <td>
                            <div className="contact-cell">
                              {branch.contact_number
                                ? <span>{branch.contact_number}</span>
                                : <span style={{ color: '#97a0af' }}>—</span>}
                              {branch.email && <span className="contact-email">{branch.email}</span>}
                            </div>
                          </td>

                          <td>
                            <div className="contact-cell">
                              {branch.manager_name
                                ? <span className="manager-name">{branch.manager_name}</span>
                                : <span style={{ color: '#97a0af' }}>—</span>
                              }
                              {branch.manager_phone && <span>{branch.manager_phone}</span>}
                            </div>
                          </td>

                          <td>
                            <span className={`status-pill ${branch.status}`}>{branch.status}</span>
                          </td>

                          <td>
                            <div className="table-actions">
                              <button
                                className="tbl-btn-edit"
                                onClick={() => handleEdit(branch)}
                                disabled={loading}
                                title="Edit Branch"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button
                                className="tbl-btn-delete"
                                onClick={() => handleDelete(branch.id)}
                                disabled={loading}
                                title="Delete Branch"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="table-pagination">
                    <span className="pagination-info">
                      Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, filteredBranches.length)} of {filteredBranches.length}
                    </span>
                    <div className="pagination-btns">
                      <button className="pag-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button key={n} className={`pag-btn ${n === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(n)}>{n}</button>
                      ))}
                      <button className="pag-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </main>

    </div>
  );
};

export default AdminBranchMaster;