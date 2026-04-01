import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePubSubStore } from '../../../stores/pubSubStore';
import { Header } from '../../../components/Header';
import { CardForm } from './CardForm';
import styles from '../cards.module.css';

export function CardRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rfidCardId = usePubSubStore((s) => s.rfidCardId);
  const [cardId, setCardId] = useState<string | null>(null);

  useEffect(() => {
    if (rfidCardId && !cardId) {
      setCardId(rfidCardId);
    }
  }, [rfidCardId, cardId]);

  return (
    <div className={styles.page}>
      <Header title={t('cards.register.title')} showBack backTo="/cards" />

      {!cardId ? (
        <div className={styles.waiting}>
          <div className={styles.pulse} />
          <p>{t('cards.register.waiting')}</p>
        </div>
      ) : (
        <CardForm
          cardId={cardId}
          onSave={() => navigate('/cards')}
        />
      )}
    </div>
  );
}
