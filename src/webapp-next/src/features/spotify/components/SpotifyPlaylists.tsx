import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpotifyStore } from '../../../stores/spotifyStore';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import styles from '../spotify.module.css';

export function SpotifyPlaylists() {
  const { t } = useTranslation();
  const playlists = useSpotifyStore((s) => s.playlists);
  const isLoading = useSpotifyStore((s) => s.isLoading);
  const loadPlaylists = useSpotifyStore((s) => s.loadPlaylists);
  const playPlaylist = useSpotifyStore((s) => s.playPlaylist);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  if (isLoading) return <LoadingSpinner />;

  if (playlists.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{t('spotify.playlists.no-playlists')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionTitle}>{t('spotify.playlists.title')}</div>
      <div className={styles.playlistList}>
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className={styles.playlistItem}
            onClick={() => playPlaylist(playlist.id)}
          >
            <div className={styles.playlistCover}>
              {playlist.imageUrl ? (
                <img src={playlist.imageUrl} alt={playlist.name} />
              ) : (
                '🎵'
              )}
            </div>
            <div className={styles.playlistInfo}>
              <div className={styles.playlistName}>{playlist.name}</div>
              <div className={styles.playlistMeta}>{playlist.trackCount} Titel</div>
            </div>
            <button className={styles.playlistAction} aria-label="Play">▶</button>
          </div>
        ))}
      </div>
    </div>
  );
}
