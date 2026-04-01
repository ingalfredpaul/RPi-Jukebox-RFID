import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRequest } from '../../../hooks/useRequest';
import { Header } from '../../../components/Header';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import styles from '../cards.module.css';

interface Card {
  id: string;
  from_alias: string;
}

export function CardsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRequest<Record<string, Card>>('cardsList');

  const cards = data ? Object.entries(data).map(([id, card]) => ({ ...card, id })) : [];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className={styles.page}>
      <Header title={t('cards.title')} />

      {cards.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>💳</span>
          <p>{t('cards.overview.no-cards')}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {cards.map((card) => (
            <div
              key={card.id}
              className={styles.cardItem}
              onClick={() => navigate(`/cards/${card.id}/edit`)}
            >
              <div className={styles.cardIcon}>💳</div>
              <div className={styles.cardInfo}>
                <div className={styles.cardId}>{card.id}</div>
                <div className={styles.cardAlias}>{card.from_alias || '–'}</div>
              </div>
              <span className={styles.cardAction}>→</span>
            </div>
          ))}
        </div>
      )}

      <button
        className={styles.fab}
        onClick={() => navigate('/cards/register')}
        aria-label={t('cards.overview.register-new')}
      >
        +
      </button>
    </div>
  );
}
