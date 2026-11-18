import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePubSubStore } from '../stores/pubSubStore';
import { useIsParent } from '../stores/parentStore';
import styles from './Navigation.module.css';

interface NavItem {
  path: string;
  key: string;
  icon: string;
  /** Needs parent mode (shows a lock while locked). */
  guarded?: boolean;
  /** Only shown when this backend plugin is loaded. */
  plugin?: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', key: 'player', icon: '♪' },
  { path: '/library', key: 'library', icon: '📚' },
  { path: '/cards', key: 'cards', icon: '💳', guarded: true },
  { path: '/settings', key: 'settings', icon: '⚙', guarded: true },
  { path: '/spotify', key: 'spotify', icon: '🎵', plugin: 'spotify' },
  { path: '/radio', key: 'radio', icon: '📻', plugin: 'radio' },
];

export function Navigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const plugins = usePubSubStore((s) => s.pluginsLoaded);
  const isParent = useIsParent();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const items = NAV_ITEMS.filter((item) => !item.plugin || plugins[item.plugin]);

  return (
    <nav className={styles.nav} aria-label={t('navigation.label')}>
      {items.map(({ path, key, icon, guarded }) => (
        <button
          key={path}
          className={`${styles.item} ${isActive(path) ? styles.active : ''}`}
          onClick={() => navigate(path)}
          aria-label={t(`navigation.${key}`)}
          aria-current={isActive(path) ? 'page' : undefined}
        >
          <span className={styles.icon} aria-hidden="true">
            {icon}
            {guarded && !isParent && <span className={styles.lock}>🔒</span>}
          </span>
          <span className={styles.label}>{t(`navigation.${key}`)}</span>
        </button>
      ))}
    </nav>
  );
}
