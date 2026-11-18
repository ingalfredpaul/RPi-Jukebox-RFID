import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import { Dialog } from '../../../components/Dialog';
import { showToast } from '../../../components/Toast';

export function SystemControls() {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<'reboot' | 'shutdown' | null>(null);

  const confirm = async () => {
    const which = dialog;
    setDialog(null);
    if (!which) return;
    const { error } = await request(which);
    showToast(error ? 'error' : 'info', error ? t('toast.settingsfailed') : t(`settings.system.${which}started`));
  };

  return (
    <section className="ui-card">
      <div className="ui-card-title">{t('settings.system.title')}</div>
      <div className="ui-card-body">
        <button className="ui-btn ui-btn-block" onClick={() => setDialog('reboot')}>↻ {t('settings.system.reboot')}</button>
        <button className="ui-btn ui-btn-danger ui-btn-block" onClick={() => setDialog('shutdown')}>⏻ {t('settings.system.shutdown')}</button>
        <p className="ui-hint">{t('settings.system.hint')}</p>
      </div>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === 'reboot' ? t('settings.system.reboot') : t('settings.system.shutdown')}
        actions={
          <>
            <button className="ui-btn" onClick={() => setDialog(null)}>{t('general.buttons.cancel')}</button>
            <button className="ui-btn ui-btn-danger" onClick={() => void confirm()}>{t('general.buttons.confirm')}</button>
          </>
        }
      >
        <p>{dialog === 'reboot' ? t('settings.system.rebootconfirm') : t('settings.system.shutdownconfirm')}</p>
      </Dialog>
    </section>
  );
}
