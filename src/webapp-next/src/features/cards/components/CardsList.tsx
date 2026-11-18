import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../../../components/Header';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { describeCard } from '../cardUtils';
import { useCards } from '../useCards';
import styles from '../cards.module.css';

export function CardsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cards, error, reload } = useCards();

  if (error) {
    return (
      <>
        <Header title={t('cards.title')} />
        <div className="ui-empty">
          <p>{t('general.loading-error')}</p>
          <button className="ui-btn" onClick={() => void reload()} style={{ marginTop: 12 }}>
            {t('general.buttons.retry')}
          </button>
        </div>
      </>
    );
  }
  if (!cards) return <LoadingSpinner />;

  const entries = Object.entries(cards).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <Header title={t('cards.title')} />
      {entries.length === 0 ? (
        <div className="ui-empty">
          <div style={{ fontSize: '3rem' }} aria-hidden="true">💳</div>
          <p>{t('cards.overview.no-cards')}</p>
          <p className="ui-hint" style={{ marginTop: 8 }}>{t('cards.overview.no-cards-hint')}</p>
        </div>
      ) : (
        <div className="ui-list">
          {entries.map(([id, entry]) => {
            const d = describeCard(entry, t);
            return (
              <button key={id} className={styles.cardRow} onClick={() => navigate(`/cards/edit/${encodeURIComponent(id)}`)}>
                <span className="ui-icon" aria-hidden="true">{d.icon}</span>
                <span className="ui-grow">
                  <span className="ui-wrap-anywhere" style={{ display: 'block', fontWeight: 500 }}>{d.text}</span>
                  <span className={styles.cardId}>{id}</span>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            );
          })}
        </div>
      )}
      <button className={styles.fab} onClick={() => navigate('/cards/new')} aria-label={t('cards.overview.register-new')}>
        +
      </button>
    </div>
  );
}
