import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Navigation.module.css';

const NAV_ITEMS = [
  { path: '/', key: 'player', icon: '♪' },
  { path: '/library', key: 'library', icon: '📚' },
  { path: '/cards', key: 'cards', icon: '💳' },
  { path: '/settings', key: 'settings', icon: '⚙' },
  { path: '/spotify', key: 'spotify', icon: '🎵' },
  { path: '/radio', key: 'radio', icon: '📻' },
] as const;

export function Navigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(({ path, key, icon }) => (
        <button
          key={path}
          className={`${styles.item} ${isActive(path) ? styles.active : ''}`}
          onClick={() => navigate(path)}
          aria-label={t(`navigation.${key}`)}
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{t(`navigation.${key}`)}</span>
        </button>
      ))}
    </nav>
  );
}
