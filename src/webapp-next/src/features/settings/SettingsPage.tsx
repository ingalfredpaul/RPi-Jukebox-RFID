import { useTranslation } from 'react-i18next';
import { Header } from '../../components/Header';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { SystemStatus } from './components/SystemStatus';
import { AudioSettings } from './components/AudioSettings';
import { TimerSettings } from './components/TimerSettings';
import { SleepMode } from './components/SleepMode';
import { SystemControls } from './components/SystemControls';
import { NetworkSettings } from './components/NetworkSettings';
import styles from './settings.module.css';

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Header title={t('settings.title')} />
      <div className={styles.sections}>
        <ErrorBoundary>
          <SystemStatus />
          <AudioSettings />
          <TimerSettings />
          <SleepMode />
          <NetworkSettings />
          <SystemControls />
        </ErrorBoundary>
      </div>
    </div>
  );
}
