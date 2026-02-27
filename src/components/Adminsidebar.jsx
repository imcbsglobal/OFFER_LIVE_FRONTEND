import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './AdminSidebar.scss';

const AdminSidebar = ({ isSidebarOpen, onToggleSidebar, onLogout, adminName = 'Admin' }) => {
  const location = useLocation();

  const menuItems = [
    {
      id: 'user-management',
      label: 'Customer List',
      route: '/admin-dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 17v2H2v-2s0-4 7-4 7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.39 3.39 0 0 0-1.93.59 5 5 0 0 1 0 5.82A3.39 3.39 0 0 0 15 11a3.5 3.5 0 0 0 0-7z" />
        </svg>
      ),
    },
    {
      id: 'branch-master',
      label: 'Branch Master',
      route: '/admin/branch-master',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      id: 'offer-master',
      label: 'Offer Master',
      route: '/admin/offer-master',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
        </svg>
      ),
    },
  ];

  const isActive = (route) => location.pathname === route;

  // Auto-close sidebar on route change on mobile
  useEffect(() => {
    if (window.innerWidth <= 768 && isSidebarOpen) {
      onToggleSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (window.innerWidth <= 768) {
      document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="mobile-topbar">
        <button
          className="mobile-hamburger"
          onClick={onToggleSidebar}
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        <span className="mobile-brand">Vsaver</span>
      </div>

      {/* ── Backdrop (mobile) ── */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={onToggleSidebar}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        {/* Header */}
        <div className="sidebar-header">
          {isSidebarOpen ? (
            <div className="sidebar-branding">
              <div className="brand-logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84H11.53zM14.75 13.51c0-1.14-.42-2.18-1.12-2.98l-.01.01-2.37 2.37c-.11.1-.2.25-.3.37v.01c-.65.9-1.03 1.99-1.03 3.18 0 2.96 2.4 5.35 5.35 5.35V13.5h-.52zM9.01 10.17l-.01.01c-1.14-.7-2.5-1.12-3.95-1.12C2.35 9.06 0 11.41 0 14.11v7.95h7.96c2.7 0 4.89-2.18 4.89-4.88 0-1.68-.84-3.16-2.13-4.05l-1.71-1.71v-.01c-.33-.29-.66-.66-1.01-1.01l.01-.01v-.22z" />
                </svg>
              </div>
              <div className="brand-text">
                <h1 className="sidebar-title">Vsaver</h1>
              </div>
              {/* ✕ close only on mobile */}
              <button
                className="sidebar-close-btn"
                onClick={onToggleSidebar}
                aria-label="Close menu"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="sidebar-branding-collapsed">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84H11.53zM14.75 13.51c0-1.14-.42-2.18-1.12-2.98l-.01.01-2.37 2.37c-.11.1-.2.25-.3.37v.01c-.65.9-1.03 1.99-1.03 3.18 0 2.96 2.4 5.35 5.35 5.35V13.5h-.52zM9.01 10.17l-.01.01c-1.14-.7-2.5-1.12-3.95-1.12C2.35 9.06 0 11.41 0 14.11v7.95h7.96c2.7 0 4.89-2.18 4.89-4.88 0-1.68-.84-3.16-2.13-4.05l-1.71-1.71v-.01c-.33-.29-.66-.66-1.01-1.01l.01-.01v-.22z" />
              </svg>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="menu-list">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.route}
              className={`menu-item ${isActive(item.route) ? 'active' : ''}`}
            >
              <span className="menu-icon">{item.icon}</span>
              {isSidebarOpen && <span className="menu-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="collapse-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d={
                  isSidebarOpen
                    ? 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z'
                    : 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z'
                }
              />
            </svg>
            {isSidebarOpen && <span>Collapse</span>}
          </button>

          {isSidebarOpen && (
            <>
              <div className="user-info">
                <div className="user-avatar">{adminName.charAt(0).toUpperCase()}</div>
                <div className="user-details">
                  <span className="user-name">{adminName}</span>
                  <span className="user-role">Administrator</span>
                </div>
              </div>
              <button className="logout-btn" onClick={onLogout}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4zM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V5z" />
                </svg>
                Sign out
              </button>
            </>
          )}

          {!isSidebarOpen && (
            <button className="logout-btn-icon" onClick={onLogout} aria-label="Logout">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4zM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V5z" />
              </svg>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;