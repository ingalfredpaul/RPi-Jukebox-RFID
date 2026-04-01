import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/Header';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { StationList } from './components/StationList';
import { PodcastManager } from './components/PodcastManager';
import styles from './radio.module.css';

export function RadioPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'radio' | 'podcasts'>('radio');

  return (
    <div className={styles.page}>
      <Header title={t('radio.title')} />

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'radio' ? styles.activeTab : ''}`}
          onClick={() => setTab('radio')}
        >
          {t('radio.stations.title')}
        </button>
        <button
          className={`${styles.tab} ${tab === 'podcasts' ? styles.activeTab : ''}`}
          onClick={() => setTab('podcasts')}
        >
          {t('radio.podcasts.title')}
        </button>
      </div>

      <ErrorBoundary>
        {tab === 'radio' ? <StationList /> : <PodcastManager />}
      </ErrorBoundary>
    </div>
  );
}
