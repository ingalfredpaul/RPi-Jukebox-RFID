import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParentStore, useIsParent } from '../stores/parentStore';

/**
 * Wraps a page that only parents should use. Without a PIN everything stays
 * open (no account needed); once a PIN is set the page asks for it.
 * Child protection only - see parentStore.ts.
 */
export function ParentGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const isParent = useIsParent();
  const unlock = useParentStore((s) => s.unlock);
  const touch = useParentStore((s) => s.touch);
  const lockedOutUntil = useParentStore((s) => s.lockedOutUntil);
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Re-check every 15s, so the auto-lock also shows up on an open page.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  void now;

  // Any touch inside the parent area keeps the session alive.
  useEffect(() => {
    if (!isParent) return;
    const keepAlive = () => touch();
    window.addEventListener('pointerdown', keepAlive);
    return () => window.removeEventListener('pointerdown', keepAlive);
  }, [isParent, touch]);

  if (isParent) return <>{children}</>;

  const lockedOut = Date.now() < lockedOutUntil;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const ok = unlock(pin);
    setWrong(!ok);
    setPin('');
  };

  return (
    <form className="ui-page" onSubmit={submit} style={{ alignItems: 'stretch', paddingTop: '15vh' }}>
      <div style={{ textAlign: 'center', fontSize: '3rem' }} aria-hidden="true">🔒</div>
      <h1 style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)' }}>{t('parent.lockedtitle')}</h1>
      <p className="ui-hint" style={{ textAlign: 'center' }}>{t('parent.lockedtext')}</p>
      <input
        className="ui-input"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
        placeholder={t('parent.pin')}
        aria-label={t('parent.pin')}
        style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.4rem' }}
        disabled={lockedOut}
      />
      {wrong && !lockedOut && <div className="ui-banner ui-banner-error">{t('parent.wrongpin')}</div>}
      {lockedOut && <div className="ui-banner ui-banner-warn">{t('parent.toomany')}</div>}
      <button className="ui-btn ui-btn-primary ui-btn-block" type="submit" disabled={pin.length < 4 || lockedOut}>
        {t('parent.unlock')}
      </button>
    </form>
  );
}
