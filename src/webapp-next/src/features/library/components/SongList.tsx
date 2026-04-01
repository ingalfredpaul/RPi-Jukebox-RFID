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
  duration: number;
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

  const handlePlayAll = () => {
    request('play_album', { albumartist: decodedArtist, album: decodedAlbum });
  };

  const handlePlaySong = (file: string) => {
    request('play_single', { song_url: file });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <Header title={decodedAlbum} showBack backTo="/library" />

      <div className={styles.songHeader}>
        <div className={styles.songHeaderTitle}>{decodedAlbum}</div>
        <div className={styles.songHeaderArtist}>{decodedArtist}</div>
        <button className={styles.playAllBtn} onClick={handlePlayAll}>
          ▶ {t('library.songs.play-all')}
        </button>
      </div>

      <div className={styles.list}>
        {data?.map((song) => (
          <div
            key={song.file}
            className={styles.listItem}
            onClick={() => handlePlaySong(song.file)}
          >
            <span className={styles.trackNum}>{song.track || '–'}</span>
            <div className={styles.itemInfo}>
              <div className={styles.itemTitle}>{song.title || song.file}</div>
              <div className={styles.itemSubtitle}>{toHHMMSS(song.duration)}</div>
            </div>
            <button className={styles.itemAction} aria-label="Play">▶</button>
          </div>
        ))}
      </div>
    </div>
  );
}
