import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import { Dialog } from '../../../components/Dialog';
import styles from '../settings.module.css';

export function SystemControls() {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<'reboot' | 'shutdown' | null>(null);

  const handleConfirm = async () => {
    if (dialog === 'reboot') {
      await request('reboot');
    } else if (dialog === 'shutdown') {
      await request('shutdown');
    }
    setDialog(null);
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>{t('settings.system.title')}</div>
      <div className={styles.cardBody}>
        <div className={styles.controlsGrid}>
          <button className={`${styles.dangerBtn} ${styles.rebootBtn}`} onClick={() => setDialog('reboot')}>
            {t('settings.system.reboot')}
          </button>
          <button className={`${styles.dangerBtn} ${styles.shutdownBtn}`} onClick={() => setDialog('shutdown')}>
            {t('settings.system.shutdown')}
          </button>
        </div>
      </div>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === 'reboot' ? t('settings.system.reboot') : t('settings.system.shutdown')}
        actions={
          <>
            <button className={styles.cancelBtn} onClick={() => setDialog(null)}>
              {t('general.buttons.cancel')}
            </button>
            <button className={styles.confirmBtn} onClick={handleConfirm}>
              {t('general.buttons.confirm')}
            </button>
          </>
        }
      >
        <p>{dialog === 'reboot' ? t('settings.system.reboot-confirm') : t('settings.system.shutdown-confirm')}</p>
      </Dialog>
    </section>
  );
}
