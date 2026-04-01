import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { request } from '../services/request';
import { generateId } from '../utils/uuid';

interface RadioStation {
  id: string;
  name: string;
  url: string;
}

interface Podcast {
  id: string;
  name: string;
  file: string;
  duration: number;
  position: number;
}

interface RadioState {
  stations: RadioStation[];
  podcasts: Podcast[];

  addStation: (station: Omit<RadioStation, 'id'>) => void;
  removeStation: (id: string) => void;
  playStation: (id: string) => void;

  addPodcast: (podcast: Omit<Podcast, 'id' | 'position'>) => void;
  removePodcast: (id: string) => void;
  playPodcast: (id: string) => void;
  updatePodcastPosition: (id: string, position: number) => void;
}

export const useRadioStore = create<RadioState>()(
  persist(
    (set, get) => ({
      stations: [],
      podcasts: [],

      addStation: (station) => {
        const id = generateId();
        set((s) => ({ stations: [...s.stations, { ...station, id }] }));
      },

      removeStation: (id) => {
        set((s) => ({ stations: s.stations.filter((st) => st.id !== id) }));
      },

      playStation: (id) => {
        const station = get().stations.find((s) => s.id === id);
        if (station) {
          request('play_single', { song_url: station.url });
        }
      },

      addPodcast: (podcast) => {
        const id = generateId();
        set((s) => ({
          podcasts: [...s.podcasts, { ...podcast, id, position: 0 }],
        }));
      },

      removePodcast: (id) => {
        set((s) => ({ podcasts: s.podcasts.filter((p) => p.id !== id) }));
      },

      playPodcast: (id) => {
        const podcast = get().podcasts.find((p) => p.id === id);
        if (podcast) {
          request('play_single', { song_url: podcast.file });
          if (podcast.position > 0) {
            setTimeout(() => {
              request('seek', { new_time: Math.floor(podcast.position) });
            }, 1000);
          }
        }
      },

      updatePodcastPosition: (id, position) => {
        set((s) => ({
          podcasts: s.podcasts.map((p) =>
            p.id === id ? { ...p, position } : p,
          ),
        }));
      },
    }),
    {
      name: 'phoniebox-radio',
    },
  ),
);
