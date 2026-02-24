import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './UserDashboard.scss';
import { API_BASE_URL } from '../services/config';

const UserDashboard = ({ onLogout, userData }) => {
  const [isSidebarOpen, setIsSidebarOpen]   = useState(true);
  const [userName, setUserName]             = useState('User');
  const [shopName, setShopName]             = useState('');
  const [userBalance, setUserBalance]       = useState(null);
  const [userPlace, setUserPlace]           = useState('');
  const [stats, setStats] = useState({
    total_offer_masters: 0,
    active_offer_masters: 0,
    active_offers: 0,
    total_products: 0,
  });
  const [branches, setBranches]             = useState([]);
  const [recentOffers, setRecentOffers]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [branchLoading, setBranchLoading]   = useState(true);
  const [invoices, setInvoices]             = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError]     = useState('');
  const [invoiceTotal, setInvoiceTotal]     = useState(0);

  // ── helpers ────────────────────────────────────────────────────────
  const cleanDebtorName = (name) =>
    name ? name.replace(/\d{8,}$/, '').trim() : '';

  const resolveDisplayName = (user) => {
    if (!user) return 'User';
    if (user.debtor_name) return cleanDebtorName(user.debtor_name);
    if (user.business_name) return user.business_name;
    const full = [user.first_name, user.last_name].filter(Boolean).join(' ');
    if (full) return full;
    if (user.shop_name) return user.shop_name;
    return 'User';
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fmtDate = (d, opts = {}) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', ...opts,
    });
  };

  const fmtAmount = (val) =>
    parseFloat(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });

  const getOfferStatus = (offer) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const from  = new Date(offer.valid_from);
    const to    = new Date(offer.valid_to); to.setHours(23, 59, 59, 999);
    if (today < from) return 'upcoming';
    if (today > to)   return 'expired';
    return 'active';
  };

  // ── data fetching ──────────────────────────────────────────────────
  useEffect(() => {
    const src = userData || (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    })();
    setUserName(resolveDisplayName(src));
    setShopName(src.shop_name || '');
    setUserBalance(src.balance ?? null);
    setUserPlace(src.place || '');
    fetchAll();
  }, [userData]);

  const fetchAll = () => {
    fetchStats();
    fetchBranches();
    fetchOffers();
    fetchInvoices();
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/dashboard/stats/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error('Stats error:', e); }
    finally { setLoading(false); }
  };

  const fetchBranches = async () => {
    setBranchLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/branches/`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.branches) setBranches(data.branches.slice(0, 5));
      }
    } catch (e) { console.error('Branches error:', e); }
    finally { setBranchLoading(false); }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/public/offers/`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.offers) setRecentOffers(data.offers.slice(0, 5));
      }
    } catch (e) { console.error('Offers error:', e); }
  };

  const fetchInvoices = async () => {
    setInvoiceLoading(true);
    setInvoiceError('');
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { setInvoiceError('Not authenticated'); return; }

      const res = await fetch(`${API_BASE_URL}/invoices/my/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setInvoices(data.invoices || []);
        setInvoiceTotal(data.total_found || 0);
      } else {
        setInvoiceError(data.error || 'Failed to load invoices');
      }
    } catch (e) {
      setInvoiceError('Could not connect to invoice service');
    } finally {
      setInvoiceLoading(false);
    }
  };

  // ── stat card configs ──────────────────────────────────────────────
  const statCards = [
    {
      key: 'total_offer_masters',
      label: 'Total Offers',
      desc: 'All campaigns',
      color: 'orange',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
        </svg>
      ),
    },
    {
      key: 'active_offer_masters',
      label: 'Live Campaigns',
      desc: 'Active right now',
      color: 'green',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      ),
    },
    {
      key: 'active_offers',
      label: 'Active Products',
      desc: 'In promotion',
      color: 'blue',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
    },
    {
      key: 'total_products',
      label: 'Total Products',
      desc: 'In inventory',
      color: 'purple',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
        </svg>
      ),
    },
  ];

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="ud-root">
      <div className="ud-layout">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={onLogout}
          userName={userName}
        />

        <main className={`ud-main ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <div className="ud-inner">

            {/* ── Page Header ──────────────────────────────────────── */}
            <header className="ud-page-header">
              <div className="ud-page-header-left">
                <p className="ud-greeting">{getGreeting()}</p>
                <h1 className="ud-username">
                  {userName}
                  {userPlace && (
                    <span className="ud-user-place">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {userPlace}
                    </span>
                  )}
                </h1>
                <p className="ud-date">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>

              <div className="ud-page-header-right">
                {userBalance !== null && (
                  <div className="ud-balance-card">
                    <div className="ud-balance-card-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                      </svg>
                    </div>
                    <div className="ud-balance-card-body">
                      <span className="ud-balance-label">My Points</span>
                      <span className="ud-balance-value">{fmtAmount(userBalance)}</span>
                    </div>
                  </div>
                )}
                <button className="ud-refresh-btn" onClick={fetchAll} disabled={loading}>
                  <svg className={`ud-refresh-icon${loading ? ' spin' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
                </button>
              </div>
            </header>

            {/* ── Stat Cards ───────────────────────────────────────── */}
            <section className="ud-stats-section">
              <div className="ud-stats-grid">
                {statCards.map((card) => (
                  <div key={card.key} className={`ud-stat-card ud-stat-card--${card.color}`}>
                    <div className="ud-stat-card-inner">
                      <div className={`ud-stat-icon ud-stat-icon--${card.color}`}>{card.icon}</div>
                      <div className="ud-stat-body">
                        {loading ? (
                          <>
                            <div className="ud-skeleton ud-skeleton--value" />
                            <div className="ud-skeleton ud-skeleton--label" />
                          </>
                        ) : (
                          <>
                            <span className="ud-stat-value">{stats[card.key] ?? 0}</span>
                            <span className="ud-stat-label">{card.label}</span>
                            <span className="ud-stat-desc">{card.desc}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Two-column panels ───────────────────────────────── */}
            <div className="ud-two-col">

              {/* Recent Offers */}
              <section className="ud-panel">
                <div className="ud-panel-header">
                  <div className="ud-panel-title-group">
                    <h3 className="ud-panel-title">Recent Offers</h3>
                    {recentOffers.length > 0 && <span className="ud-panel-count">{recentOffers.length}</span>}
                  </div>
                  <a href="/offer-master" className="ud-panel-link">
                    View all
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" /></svg>
                  </a>
                </div>
                <div className="ud-panel-body">
                  {recentOffers.length === 0 ? (
                    <div className="ud-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <p>No offers available yet</p>
                    </div>
                  ) : recentOffers.map((offer) => {
                    const st = getOfferStatus(offer);
                    return (
                      <div key={offer.id} className="ud-offer-row">
                        <div className={`ud-offer-dot ud-offer-dot--${st}`} />
                        <div className="ud-offer-info">
                          <span className="ud-offer-title">{offer.title}</span>
                          <span className="ud-offer-dates">{fmtDate(offer.valid_from)} – {fmtDate(offer.valid_to)}</span>
                        </div>
                        <span className={`ud-offer-badge ud-offer-badge--${st}`}>
                          {st === 'active' ? 'Active' : st === 'upcoming' ? 'Upcoming' : 'Expired'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Active Branches */}
              <section className="ud-panel">
                <div className="ud-panel-header">
                  <div className="ud-panel-title-group">
                    <h3 className="ud-panel-title">Active Branches</h3>
                    {branches.length > 0 && <span className="ud-panel-count">{branches.length}</span>}
                  </div>
                  <a href="/branch-master" className="ud-panel-link">
                    Explore
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" /></svg>
                  </a>
                </div>
                <div className="ud-panel-body">
                  {branchLoading ? (
                    [1,2,3].map((i) => (
                      <div key={i} className="ud-branch-row">
                        <div className="ud-skeleton" style={{ width:34, height:34, borderRadius:6, flexShrink:0 }} />
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
                          <div className="ud-skeleton" style={{ width:'55%', height:12 }} />
                          <div className="ud-skeleton" style={{ width:'38%', height:10 }} />
                        </div>
                      </div>
                    ))
                  ) : branches.length === 0 ? (
                    <div className="ud-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                      <p>No branches found</p>
                    </div>
                  ) : branches.map((branch) => (
                    <div key={branch.id} className="ud-branch-row">
                      <div className="ud-branch-avatar">
                        {branch.branch_image_url
                          ? <img src={branch.branch_image_url} alt={branch.branch_name} />
                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                        }
                      </div>
                      <div className="ud-branch-info">
                        <span className="ud-branch-name">{branch.branch_name}</span>
                        <span className="ud-branch-loc">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                          {branch.location}
                        </span>
                      </div>
                      {branch.active_offers_count > 0 && (
                        <span className="ud-branch-count">{branch.active_offers_count} offer{branch.active_offers_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── E-Invoice History ─────────────────────────────────── */}
            <section className="ud-panel ud-invoice-panel">

              <div className="ud-panel-header">
                <div className="ud-panel-title-group">
                  <div className="ud-invoice-panel-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/>
                    </svg>
                  </div>
                  <h3 className="ud-panel-title">E-Invoice History</h3>
                  {invoiceTotal > 0 && (
                    <span className="ud-panel-count">{invoiceTotal} total</span>
                  )}
                </div>
                <button className="ud-refresh-btn" onClick={fetchInvoices} disabled={invoiceLoading}>
                  <svg className={`ud-refresh-icon${invoiceLoading ? ' spin' : ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>{invoiceLoading ? 'Loading…' : 'Refresh'}</span>
                </button>
              </div>

              {/* Skeleton */}
              {invoiceLoading && (
                <div className="ud-invoice-list">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="ud-invoice-row">
                      <div className="ud-invoice-row-left">
                        <div className="ud-skeleton" style={{ width:36, height:36, borderRadius:8, flexShrink:0 }} />
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          <div className="ud-skeleton" style={{ width:130, height:12 }} />
                          <div className="ud-skeleton" style={{ width:90, height:11 }} />
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                        <div className="ud-skeleton" style={{ width:80, height:16 }} />
                        <div className="ud-skeleton" style={{ width:56, height:11 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {!invoiceLoading && invoiceError && (
                <div className="ud-empty">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <p>{invoiceError}</p>
                </div>
              )}

              {/* Empty */}
              {!invoiceLoading && !invoiceError && invoices.length === 0 && (
                <div className="ud-empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <p>No invoices found for your account</p>
                </div>
              )}

              {/* Invoice rows */}
              {!invoiceLoading && !invoiceError && invoices.length > 0 && (
                <>
                  <div className="ud-invoice-list">
                    {invoices.map((inv, idx) => (
                      <div key={inv.slno || idx} className="ud-invoice-row">

                        {/* Left — icon + invoice details */}
                        <div className="ud-invoice-row-left">
                          <div className="ud-invoice-avatar">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/>
                            </svg>
                          </div>
                          <div className="ud-invoice-info">
                            <span className="ud-invoice-slno">Invoice <strong>#{inv.slno}</strong></span>
                            <span className="ud-invoice-date">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {fmtDate(inv.invdate)}
                            </span>
                          </div>
                        </div>

                        {/* Right — amount + badge */}
                        <div className="ud-invoice-row-right">
                          <span className="ud-invoice-amount">₹ {fmtAmount(inv.nettotal)}</span>
                          <span className="ud-einvoice-tag">E-Invoice</span>
                        </div>

                      </div>
                    ))}
                  </div>

                  {invoiceTotal > invoices.length && (
                    <div className="ud-invoice-more-notice">
                      Showing {invoices.length} most recent of {invoiceTotal} invoices
                    </div>
                  )}
                </>
              )}
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;