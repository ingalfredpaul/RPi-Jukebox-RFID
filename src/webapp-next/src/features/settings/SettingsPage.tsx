import { useTranslation } from 'react-i18next';
import { Header } from '../../components/Header';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { ParentGate } from '../../components/ParentGate';
import { useParentStore, useIsParent } from '../../stores/parentStore';
import { KidsSettings } from './components/KidsSettings';
import { PinSettings } from './components/PinSettings';
import { SystemStatus } from './components/SystemStatus';
import { TimerSettings } from './components/TimerSettings';
import { SystemControls } from './components/SystemControls';

function Content() {
  const { t } = useTranslation();
  const lock = useParentStore((s) => s.lock);
  const hasPin = useParentStore((s) => s.stored !== null);
  const isParent = useIsParent();

  return (
    <div>
      <Header
        title={t('settings.title')}
        actions={
          hasPin && isParent ? (
            <button className="ui-btn" onClick={lock}>🔒 {t('parent.lock-now')}</button>
          ) : undefined
        }
      />
      <div className="ui-page">
        <ErrorBoundary>
          <KidsSettings />
          <PinSettings />
          <TimerSettings />
          <SystemStatus />
          <SystemControls />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <ParentGate>
      <Content />
    </ParentGate>
  );
}
