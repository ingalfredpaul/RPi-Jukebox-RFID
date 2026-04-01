import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import { Header } from '../../../components/Header';
import { Dialog } from '../../../components/Dialog';
import { showToast } from '../../../components/Toast';
import { CardForm } from './CardForm';
import styles from '../cards.module.css';

export function CardEdit() {
  const { cardId = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    await request('deleteCard', { card_id: cardId });
    showToast('success', t('toast.card-deleted'));
    navigate('/cards');
  };

  return (
    <div className={styles.page}>
      <Header
        title={t('cards.edit.title')}
        showBack
        backTo="/cards"
        actions={
          <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
            {t('general.buttons.delete')}
          </button>
        }
      />

      <CardForm cardId={cardId} onSave={() => navigate('/cards')} />

      <Dialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title={t('cards.dialogs.delete.title')}
        actions={
          <>
            <button className={styles.cancelBtn} onClick={() => setShowDelete(false)}>
              {t('general.buttons.cancel')}
            </button>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete}>
              {t('cards.dialogs.delete.confirm')}
            </button>
          </>
        }
      >
        <p>{t('cards.dialogs.delete.message')}</p>
      </Dialog>
    </div>
  );
}
