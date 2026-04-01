import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
}

export function Header({ title, showBack = false, backTo, actions }: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {showBack && (
          <button className={styles.backBtn} onClick={handleBack} aria-label={t('general.buttons.back')}>
            ←
          </button>
        )}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
