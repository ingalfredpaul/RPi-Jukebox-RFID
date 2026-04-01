import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpotifyStore } from '../../../stores/spotifyStore';
import styles from '../spotify.module.css';

export function SpotifySearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const search = useSpotifyStore((s) => s.search);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length > 2) {
      search(value);
    }
  };

  return (
    <div className={styles.searchContainer}>
      <input
        className={styles.searchInput}
        placeholder={t('spotify.search.placeholder')}
        value={query}
        onChange={handleSearch}
      />
    </div>
  );
}
