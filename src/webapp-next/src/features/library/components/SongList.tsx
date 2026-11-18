import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRequest } from '../../../hooks/useRequest';
import { request } from '../../../services/request';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { Header } from '../../../components/Header';
import { toHHMMSS } from '../../../utils/time';
import styles from '../library.module.css';

interface Song {
  title: string;
  artist: string;
  file: string;
  track: string;
  duration: number | string;
}

export function SongList() {
  const { artist = '', album = '' } = useParams();
  const { t } = useTranslation();
  const decodedArtist = decodeURIComponent(artist);
  const decodedAlbum = decodeURIComponent(album);

  const { data, isLoading } = useRequest<Song[]>('songList', {
    albumartist: decodedArtist,
    album: decodedAlbum,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <Header title={decodedAlbum} showBack backTo="/library" />

      <div className={styles.songHeader}>
        <div className={styles.songHeaderTitle}>{decodedAlbum}</div>
        <div className={styles.songHeaderArtist}>{decodedArtist}</div>
        <button
          className="ui-btn ui-btn-primary"
          onClick={() => request('play_album', { albumartist: decodedArtist, album: decodedAlbum })}
        >
          ▶ {t('library.songs.play-all')}
        </button>
      </div>

      <div className={styles.list}>
        {data?.map((song) => (
          <div key={song.file} className={styles.listItem}>
            <button className={styles.rowMain} onClick={() => request('play_single', { song_url: song.file })}>
              <span className={styles.trackNum}>{song.track || '–'}</span>
              <span className={styles.itemInfo}>
                <span className={styles.itemTitle} style={{ display: 'block' }}>{song.title || song.file}</span>
                <span className={styles.itemSubtitle} style={{ display: 'block' }}>
                  {toHHMMSS(Number(song.duration) || 0)}
                </span>
              </span>
            </button>
            <button
              className={styles.iconBtn}
              aria-label={t('general.buttons.play')}
              onClick={() => request('play_single', { song_url: song.file })}
            >
              ▶
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
