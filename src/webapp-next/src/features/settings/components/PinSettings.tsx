import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParentStore } from '../../../stores/parentStore';
import { showToast } from '../../../components/Toast';

/** Set / change / remove the parent PIN. Child lock only, see stores/parentStore.ts. */
export function PinSettings() {
  const { t } = useTranslation();
  const hasPin = useParentStore((s) => s.stored !== null);
  const setPin = useParentStore((s) => s.setPin);
  const removePin = useParentStore((s) => s.removePin);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');

  const valid = /^\d{4,8}$/.test(next) && next === again;
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 8);

  const save = () => {
    if (!setPin(next, hasPin ? current : undefined)) {
      showToast('error', t('parent.wrong-pin'));
      return;
    }
    setCurrent('');
    setNext('');
    setAgain('');
    showToast('success', t('parent.pin-saved'));
  };

  const remove = () => {
    if (!removePin(current)) {
      showToast('error', t('parent.wrong-pin'));
      return;
    }
    setCurrent('');
    showToast('success', t('parent.pin-removed'));
  };

  return (
    <section className="ui-card">
      <div className="ui-card-title">{t('parent.pin-title')}</div>
      <div className="ui-card-body">
        <div className={`ui-banner ${hasPin ? 'ui-banner-ok' : 'ui-banner-warn'}`}>
          {hasPin ? t('parent.pin-active') : t('parent.pin-none')}
        </div>
        {hasPin && (
          <div className="ui-field">
            <label className="ui-label" htmlFor="pin-current">{t('parent.pin-current')}</label>
            <input id="pin-current" className="ui-input" type="password" inputMode="numeric" autoComplete="off" value={current} onChange={(e) => setCurrent(digits(e.target.value))} />
          </div>
        )}
        <div className="ui-field">
          <label className="ui-label" htmlFor="pin-new">{hasPin ? t('parent.pin-new') : t('parent.pin-choose')}</label>
          <input id="pin-new" className="ui-input" type="password" inputMode="numeric" autoComplete="off" value={next} onChange={(e) => setNext(digits(e.target.value))} />
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="pin-again">{t('parent.pin-repeat')}</label>
          <input id="pin-again" className="ui-input" type="password" inputMode="numeric" autoComplete="off" value={again} onChange={(e) => setAgain(digits(e.target.value))} />
        </div>
        <button className="ui-btn ui-btn-primary" disabled={!valid || (hasPin && current.length < 4)} onClick={save}>
          {t('general.buttons.save')}
        </button>
        {hasPin && (
          <button className="ui-btn ui-btn-danger" disabled={current.length < 4} onClick={remove}>
            {t('parent.pin-remove')}
          </button>
        )}
        <p className="ui-hint">{t('parent.pin-disclaimer')}</p>
      </div>
    </section>
  );
}
