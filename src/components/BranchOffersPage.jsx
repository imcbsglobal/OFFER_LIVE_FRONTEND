import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './BranchOffersPage.scss';
import vmartLogo from '../assets/VMART.jpg';

const API_BASE = 'http://192.168.1.45:8000/api';

// ── Icons ─────────────────────────────────────────────────────────────
const CalendarIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const LocationIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const ImagesIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const ClockIcon = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

// ── Popup Modal ───────────────────────────────────────────────────────
function OfferModal({ offer, onClose }) {
  const images = offer.media_files?.filter(m => m.media_type === 'image') || [];
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const newIdx = Math.round(el.scrollTop / el.clientHeight);
    setIdx(newIdx);
  }, []);

  const scrollTo = useCallback((i) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: i * scrollRef.current.clientHeight, behavior: 'smooth' });
    setIdx(i);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowUp')   scrollTo(Math.max(0, idx - 1));
      if (e.key === 'ArrowDown') scrollTo(Math.min(images.length - 1, idx + 1));
      if (e.key === 'Escape')    onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, images.length, scrollTo, onClose]);

  const currentImage = images[idx] || null;
  const hasHourly = offer.offer_start_time && offer.offer_end_time;

  const handleShare = async () => {
    if (navigator.share && currentImage) {
      try { await navigator.share({ title: offer.title, url: currentImage.file_url }); } catch (_) {}
    } else if (currentImage) {
      navigator.clipboard?.writeText(currentImage.file_url);
    }
  };

  return (
    <div className="bop-modal-overlay">

      {/* ── Top bar ── */}
      <div className="bop-modal-topbar">
        <span className="bop-modal-title">{offer.title}</span>
        {images.length > 1 && (
          <div className="bop-modal-dots-v">
            {images.map((_, i) => (
              <span key={i} className={i === idx ? 'active' : ''} onClick={() => scrollTo(i)} />
            ))}
          </div>
        )}
        <button className="bop-modal-close" onClick={onClose}>&#x2715;</button>
      </div>

      {/* ── Continuous vertical snap scroller ── */}
      <div className="bop-modal-scroll-feed" ref={scrollRef} onScroll={handleScroll}>
        {images.length === 0 ? (
          <div className="bop-feed-slide">
            <div className="bop-feed-empty">No image available</div>
          </div>
        ) : (
          images.map((img, i) => (
            <div className="bop-feed-slide" key={img.id}>
              <img src={img.file_url} alt={img.caption || offer.title} />
              {images.length > 1 && (
                <div className="bop-feed-counter">{i + 1} / {images.length}</div>
              )}
              {i === 0 && images.length > 1 && (
                <div className="bop-swipe-hint">
                  <span>&#8593;</span> Swipe up for more
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Bottom panel ── */}
      <div className="bop-modal-bottom-panel">
        {offer.description && (
          <p className="bop-bottom-desc">{offer.description}</p>
        )}
        <div className="bop-bottom-row">
          <div className="bop-bottom-validity-wrap">
            <div className="bop-bottom-validity">
              <CalendarIcon size={12} />
              {formatDate(offer.valid_from)} &middot; {formatDate(offer.valid_to)}
            </div>
            {/* FIX 4: hourly time window in modal */}
            {hasHourly && (
              <div className="bop-bottom-hourly">
                <ClockIcon size={11} />
                {formatTime(offer.offer_start_time)} &ndash; {formatTime(offer.offer_end_time)}
              </div>
            )}
          </div>
          <div className="bop-bottom-actions">
            <button className="bop-btn-share" onClick={handleShare}>
              <ShareIcon /> Share
            </button>
            {currentImage && (
              <a
                className="bop-btn-download"
                href={currentImage.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadIcon /> Download
              </a>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
function BranchOffersPage() {
  const { branchId } = useParams();
  const [offers, setOffers]     = useState([]);
  const [branch, setBranch]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/public/branch/${branchId}/offers/`)
      .then(res => {
        setOffers(res.data.active_offers || []);
        setBranch(res.data || null);
        setLoading(false);
      })
      .catch(err => {
        console.error('API Error:', err);
        setError('Failed to load offers. Please try again.');
        setLoading(false);
      });
  }, [branchId]);

  if (loading) return (
    <div className="bop-loading">
      <div className="bop-spinner" />
      <p>Loading offers&hellip;</p>
    </div>
  );

  if (error) return (
    <div className="bop-error">
      <img src={vmartLogo} alt="VMART" className="bop-error-logo" />
      <div className="bop-error-icon">&#9888;&#65039;</div>
      <p>{error}</p>
      <small>Please check your connection and try again.</small>
    </div>
  );

  return (
    <div className="bop-page">

      {/* ── Header + pill — hidden when no offers ── */}
      {offers.length > 0 && (
        <>
          <header className="bop-header">
            <div className="bop-header-logo-wrap">
              <img src={vmartLogo} alt="VMART" className="bop-header-logo" />
            </div>
            <div className="bop-header-text">
              {branch?.shop_name && (
                <div className="bop-shop-name">{branch.shop_name}</div>
              )}
              <h1 className="bop-branch-name">
                {branch?.branch_name || 'Branch Offers'}
              </h1>
              <div className="bop-branch-meta">
                {branch?.location       && <span><LocationIcon /> {branch.location}</span>}
                {branch?.contact_number && <span><PhoneIcon /> {branch.contact_number}</span>}
              </div>
            </div>
          </header>

          <div className="bop-offers-summary">
            <span className="bop-offer-count">
              {offers.length} {offers.length === 1 ? 'offer' : 'offers'} available
            </span>
          </div>
        </>
      )}

      {/* ── Grouped offer sections ── */}
      {offers.length === 0 ? (
        <div className="bop-empty">
          <div className="bop-empty-logo-wrap">
            <img src={vmartLogo} alt="VMART" className="bop-empty-logo" />
          </div>
          <div className="bop-empty-content">
            <h3 className="bop-empty-title">No Offers Right Now</h3>
            <p className="bop-empty-sub">We&apos;re working on something exciting.<br />Check back soon for great deals!</p>
            <div className="bop-empty-divider"><span>&#10022;</span></div>
            <p className="bop-empty-hint">New offers are added regularly.<br />Thank you for your patience.</p>
          </div>
          <div className="bop-empty-footer">
            <p>&#10022; POWERED BY VSAVER &#10022;</p>
          </div>
        </div>
      ) : (
        Object.entries(
          offers.reduce((groups, offer) => {
            const key = (offer.title || '').trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(offer);
            return groups;
          }, {})
        ).map(([title, groupOffers]) => {
          const totalImages = groupOffers.reduce((sum, o) =>
            sum + (o.media_files?.filter(m => m.media_type === 'image').length || 0), 0
          );
          const validFrom = groupOffers.reduce((min, o) =>
            (!min || o.valid_from < min) ? o.valid_from : min, null
          );
          const validTo = groupOffers.reduce((max, o) =>
            (!max || o.valid_to > max) ? o.valid_to : max, null
          );

          return (
            <div className="bop-offer-section" key={title}>
              <div className="bop-section-title">
                <h2>{title}</h2>
                <div className="bop-section-meta">
                  <span className="bop-validity-tag">
                    <CalendarIcon size={11} />
                    {formatDate(validFrom)} &ndash; {formatDate(validTo)}
                  </span>
                  {totalImages > 0 && (
                    <span className="bop-img-tag">
                      <ImagesIcon /> {totalImages} {totalImages === 1 ? 'image' : 'images'}
                    </span>
                  )}
                  {groupOffers.length > 1 && (
                    <span className="bop-img-tag">{groupOffers.length} offers</span>
                  )}
                </div>
              </div>

              <div className={`bop-group-grid ${groupOffers.length === 1 ? 'bop-group-single' : ''}`}>
                {groupOffers.map(offer => {
                  const images = offer.media_files?.filter(m => m.media_type === 'image') || [];
                  const thumb  = images[0];
                  const hasHourly = offer.offer_start_time && offer.offer_end_time;

                  return (
                    <div
                      className="bop-offer-card bop-offer-card--section"
                      key={offer.id}
                      onClick={() => setSelected(offer)}
                    >
                      <div className="bop-card-thumb">
                        {thumb ? (
                          <img src={thumb.file_url} alt={offer.title} />
                        ) : (
                          <div className="bop-thumb-placeholder">No Image</div>
                        )}

                        <div className="bop-thumb-validity">
                          <CalendarIcon />
                          Until {formatDate(offer.valid_to)}
                        </div>

                        {/* FIX 3: Hourly badge on card thumb */}
                        {hasHourly && (
                          <div className="bop-thumb-hourly">
                            <ClockIcon size={9} />
                            {formatTime(offer.offer_start_time)} &ndash; {formatTime(offer.offer_end_time)}
                          </div>
                        )}

                        {images.length > 1 && (
                          <div className="bop-img-count">
                            <ImagesIcon /> {images.length}
                          </div>
                        )}
                      </div>

                      {/* FIX 2 & 6: Always-present footer with CTA */}
                      <div className="bop-card-footer">
                        {offer.description && (
                          <div className="bop-card-subdesc">{offer.description}</div>
                        )}
                        <div className="bop-card-cta">
                          View Offer <span className="bop-cta-arrow">&#8594;</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* ── Modal ── */}
      {selected && (
        <OfferModal offer={selected} onClose={() => setSelected(null)} />
      )}

    </div>
  );
}

export default BranchOffersPage;