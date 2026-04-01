import { create } from 'zustand';

interface SpotifyPlaylist {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
}

interface SpotifyState {
  isConnected: boolean;
  isLoading: boolean;
  playlists: SpotifyPlaylist[];
  searchResults: SpotifyPlaylist[];

  connect: () => void;
  disconnect: () => void;
  loadPlaylists: () => Promise<void>;
  search: (query: string) => void;
  playPlaylist: (id: string) => void;
}

export const useSpotifyStore = create<SpotifyState>((set) => ({
  isConnected: false,
  isLoading: false,
  playlists: [],
  searchResults: [],

  connect: () => {
    // TODO: Implement Spotify OAuth flow when backend is ready
    // For now, just toggle the state
    console.log('[Spotify] Connect - backend not yet implemented');
    set({ isConnected: true });
  },

  disconnect: () => {
    set({ isConnected: false, playlists: [], searchResults: [] });
  },

  loadPlaylists: async () => {
    set({ isLoading: true });
    // TODO: Fetch playlists from backend when Spotify integration is ready
    // const { result } = await request('spotify_playlists');
    console.log('[Spotify] Load playlists - backend not yet implemented');
    set({ isLoading: false, playlists: [] });
  },

  search: (query: string) => {
    // TODO: Search via backend when ready
    console.log('[Spotify] Search:', query);
    set({ searchResults: [] });
  },

  playPlaylist: (id: string) => {
    // TODO: Play via backend when ready
    // request('play_spotify_playlist', { playlist_id: id });
    console.log('[Spotify] Play playlist:', id);
  },
}));
