import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePubSubStore } from '../../stores/pubSubStore';
import { useParentStore } from '../../stores/parentStore';
import { request } from '../../services/request';
import { describeCard, type CardsMap } from './cardUtils';
import styles from './cards.module.css';

interface Banner {
  id: string;
  known: boolean;
  text: string;
  icon: string;
}

const SHOW_MS = 6000;

/**
 * Gives visible feedback for every card that is held on the reader:
 * known card -> what it does; unknown card -> friendly hint (+ "assign" for parents).
 * The box itself plays a short sound for unknown cards when the kidsbox plugin is loaded.
 */
export function CardScanWatcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const lastScan = usePubSubStore((s) => s.lastScan);
  const isParent = useParentStore((s) => s.isParent);
  const [banner, setBanner] = useState<Banner | null>(null);
  const seen = useRef(0);

  useEffect(() => {
    if (!lastScan || lastScan.at === seen.current) return;
    seen.current = lastScan.at;
    // The card wizard shows scanned IDs itself.
    if (pathname.startsWith('/cards/new') || pathname.startsWith('/cards/edit')) return;

    let cancelled = false;
    void request<CardsMap>('cardsList').then(({ result }) => {
      if (cancelled) return;
      const entry = result?.[lastScan.id];
      if (entry) {
        const d = describeCard(entry, t);
        setBanner({ id: lastScan.id, known: true, icon: d.icon, text: d.text });
      } else {
        setBanner({ id: lastScan.id, known: false, icon: '❓', text: t('cards.scan.unknown') });
      }
    });
    const timer = setTimeout(() => setBanner(null), SHOW_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lastScan, pathname, t]);

  if (!banner) return null;

  return (
    <div className={`${styles.banner} ${banner.known ? '' : styles.bannerUnknown}`} role="status">
      <span style={{ fontSize: '1.6rem' }} aria-hidden="true">{banner.icon}</span>
      <div className={styles.bannerText}>
        <strong style={{ display: 'block' }}>{banner.text}</strong>
        {!banner.known && isParent() && <span className="ui-muted">{banner.id}</span>}
      </div>
      {!banner.known && isParent() && (
        <button className="ui-btn ui-btn-primary" onClick={() => { setBanner(null); navigate(`/cards/new?card=${encodeURIComponent(banner.id)}`); }}>
          {t('cards.scan.assign')}
        </button>
      )}
    </div>
  );
}
