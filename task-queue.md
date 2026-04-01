# Phoniebox Webapp Rewrite - Task Queue

## Phase 1: Projektgerüst ✅
- [x] 1.1 Vite 6 + React 19 + TypeScript Projekt in `src/webapp-next/` aufsetzen
- [x] 1.2 Projektstruktur anlegen (features/, stores/, services/, hooks/, types/, styles/)
- [x] 1.3 CSS Custom Properties definieren (Dark Theme, Farben aus bestehendem teal-Theme, Spacing, Typography)
- [x] 1.4 CSS Reset + globale Styles
- [x] 1.5 i18n Setup (i18next, bestehende deutsche Übersetzungen übernehmen und erweitern)
- [x] 1.6 React Router v7 mit HashRouter, 6 Routes: Player, Library, Cards, Settings, Spotify, Radio
- [x] 1.7 PWA Setup (Service Worker, Manifest, Offline-Caching)
- [x] 1.8 ESLint + Prettier Konfiguration

## Phase 2: Socket-Layer & State Management ✅
- [x] 2.1 `services/socketUtils.ts` - encode/decode Logik portieren und typisieren
- [x] 2.2 `services/socket.ts` - PhoneboxSocket Singleton-Klasse implementieren
      - Ein Sub-Socket (Port 5557) für PubSub
      - Ein Req-Socket (Port 5556) mit Request-Queue (serialisiert Requests)
      - Reconnect mit Exponential Backoff
      - cleanup() Methode
- [x] 2.3 `services/commands.ts` - Command-Registry typisiert portieren (alle ~50 RPC Commands)
- [x] 2.4 `services/request.ts` - Request-Wrapper mit Timeout (10s)
- [x] 2.5 `stores/playerStore.ts` - Zustand Store für Player-Status (PubSub: playerstatus ~1x/Sek)
- [x] 2.6 `stores/pubSubStore.ts` - Zustand Store für Volume, RFID, Battery, CPU-Temp, etc.
- [x] 2.7 `stores/settingsStore.ts` - Zustand Store für App-Settings
- [x] 2.8 `stores/connectionStore.ts` - Verbindungsstatus (online/offline/reconnecting)
- [x] 2.9 `hooks/useRequest.ts` - Hook mit { data, error, isLoading } Pattern
- [x] 2.10 TypeScript Interfaces definieren (PlayerStatus, Volume, Card, Album, Song, Folder, etc.)

## Phase 3: Shared Components ✅
- [x] 3.1 `components/Navigation.tsx` - Bottom Navigation (Player, Library, Cards, Settings, Spotify, Radio)
- [x] 3.2 `components/Header.tsx` - Header mit optionalem Back-Button
- [x] 3.3 `components/ErrorBoundary.tsx` - Catch-All + per-Feature Error Boundaries
- [x] 3.4 `components/ConnectionStatus.tsx` - Status-Leiste oben (Verbindung unterbrochen / reconnecting)
- [x] 3.5 `components/Slider.tsx` - Wiederverwendbarer Slider (für Volume, Seekbar, EQ, Timer)
- [x] 3.6 `components/Dialog.tsx` - Wrapper um natives <dialog>
- [x] 3.7 `components/LoadingSpinner.tsx`
- [x] 3.8 `components/FileUpload.tsx` - Drag & Drop Upload für Audio-Dateien und Ordner
- [x] 3.9 `components/Toast.tsx` - Benachrichtigungen (Erfolg, Fehler, Info)

## Phase 4: Player-Seite ✅
- [x] 4.1 `features/player/PlayerPage.tsx` - Hauptseite mit Cover-Art-Hintergrund (Backdrop-Blur)
- [x] 4.2 `features/player/components/Cover.tsx` - Cover-Art Anzeige mit Fallback
- [x] 4.3 `features/player/components/Display.tsx` - Titel, Artist, Album
- [x] 4.4 `features/player/components/SeekBar.tsx` - Fortschrittsbalken mit Zeit
- [x] 4.5 `features/player/components/Controls.tsx` - Play/Pause, Prev/Next, Shuffle, Repeat
- [x] 4.6 `features/player/components/Volume.tsx` - Lautstärke-Slider mit Mute
- [x] 4.7 `features/player/components/Equalizer.tsx` - Frei einstellbarer Multi-Band EQ
- [x] 4.8 `features/player/player.module.css`

## Phase 5: Library-Seite ✅
- [x] 5.1 `features/library/LibraryPage.tsx` - Hauptseite mit Tabs (Alben, Ordner)
- [x] 5.2 `features/library/components/AlbumList.tsx` - Album-Übersicht
- [x] 5.3 `features/library/components/SongList.tsx` - Songs eines Albums
- [x] 5.4 `features/library/components/FolderList.tsx` - Ordner-Browser
- [x] 5.5 `features/library/components/SearchBar.tsx` - Suche in Bibliothek
- [x] 5.6 `features/library/components/FileManager.tsx` - Dateien hochladen, Ordner erstellen, Drag & Drop
- [x] 5.7 `features/library/components/PlaylistEditor.tsx` - Playlists erstellen/sortieren (Drag & Drop Reihenfolge)
- [x] 5.8 `features/library/library.module.css`

## Phase 6: Cards-Seite (RFID) ✅
- [x] 6.1 `features/cards/CardsPage.tsx` - Übersicht aller registrierten Karten
- [x] 6.2 `features/cards/components/CardsList.tsx` - Kartenliste
- [x] 6.3 `features/cards/components/CardRegister.tsx` - Neue Karte registrieren (wartet auf RFID-Scan)
- [x] 6.4 `features/cards/components/CardEdit.tsx` - Karte bearbeiten
- [x] 6.5 `features/cards/components/CardForm.tsx` - Formular für Karten-Aktionen
- [x] 6.6 `features/cards/components/ActionSelector.tsx` - Aktion auswählen (Musik, Spotify, Radio, Podcast, Audio, Timer, Host)
- [x] 6.7 `features/cards/cards.module.css`

## Phase 7: Settings-Seite ✅
- [x] 7.1 `features/settings/SettingsPage.tsx` - Hauptseite
- [x] 7.2 `features/settings/components/AudioSettings.tsx` - Audio-Ausgang, Max-Lautstärke (Eltern-Limit)
- [x] 7.3 `features/settings/components/EqualizerPresets.tsx` - EQ-Presets speichern/laden
- [x] 7.4 `features/settings/components/TimerSettings.tsx` - Shutdown-Timer, Stop-Player-Timer, Fade-Volume
- [x] 7.5 `features/settings/components/SleepMode.tsx` - Automatischer Ruhemodus Konfiguration
- [x] 7.6 `features/settings/components/SystemStatus.tsx` - CPU-Temp, Disk, Battery, IP, Version
- [x] 7.7 `features/settings/components/SystemControls.tsx` - Reboot, Shutdown
- [x] 7.8 `features/settings/components/NetworkSettings.tsx` - Auto-Hotspot, WLAN
- [x] 7.9 `features/settings/settings.module.css`

## Phase 8: Spotify-Integration ✅
- [x] 8.1 `features/spotify/SpotifyPage.tsx` - Spotify-Übersicht
- [x] 8.2 `features/spotify/components/SpotifyAuth.tsx` - Spotify Login/Connect (OAuth)
- [x] 8.3 `features/spotify/components/SpotifySearch.tsx` - Suche nach Songs, Alben, Playlists
- [x] 8.4 `features/spotify/components/SpotifyPlaylists.tsx` - Playlists anzeigen und auswählen
- [x] 8.5 `features/spotify/components/SpotifyPlayer.tsx` - Spotify-Wiedergabe steuern
- [x] 8.6 `stores/spotifyStore.ts` - Zustand Store für Spotify-State
- [x] 8.7 Backend: Spotify-API Anbindung auf dem Pi (spotifyd oder librespot)
- [x] 8.8 RFID-Karte → Spotify-Playlist Mapping

## Phase 9: Internet-Radio & Podcasts ✅
- [x] 9.1 `features/radio/RadioPage.tsx` - Radio-Übersicht
- [x] 9.2 `features/radio/components/StationList.tsx` - Sender-Liste (hinzufügen/entfernen)
- [x] 9.3 `features/radio/components/StationSearch.tsx` - Radio-Sender suchen (radio-browser.info API)
- [x] 9.4 `features/radio/components/PodcastManager.tsx` - Podcasts verwalten (MP3 upload, Resume-Tracking)
- [x] 9.5 `stores/radioStore.ts` - Zustand Store für Radio/Podcast-State
- [x] 9.6 Backend: Stream-URL Wiedergabe über MPD
- [x] 9.7 RFID-Karte → Radio-Sender / Podcast Mapping

## Phase 10: Code-Splitting & Performance ✅
- [x] 10.1 React.lazy() für Library, Cards, Settings, Spotify, Radio (Player bleibt eager)
- [x] 10.2 Bundle-Size Analyse (vite-plugin-visualizer)
- [x] 10.3 Bilder/Cover-Art lazy loading
- [x] 10.4 Service Worker Caching-Strategie optimieren
- [x] 10.5 Performance-Test auf Pi Zero W2 (Lighthouse, Web Vitals)

## Phase 11: Testing ✅
- [x] 11.1 Vitest Setup + Test-Konfiguration
- [x] 11.2 Unit Tests: socketUtils, commands, request, time-utils
- [x] 11.3 Unit Tests: Zustand Stores (playerStore, pubSubStore, settingsStore)
- [x] 11.4 Unit Tests: PhoneboxSocket Request-Queue
- [x] 11.5 Component Tests: Player Controls, Volume, SeekBar
- [x] 11.6 Component Tests: FileUpload, CardForm
- [x] 11.7 E2E Smoke Tests: Playwright Setup + 4 Hauptseiten

## Phase 12: Deployment & Umschaltung ✅
- [x] 12.1 Build-Script für Pi (npm run build → Output nach webapp/build)
- [x] 12.2 Altes webapp/ als webapp-legacy/ sichern
- [x] 12.3 nginx-Konfiguration prüfen/anpassen
- [x] 12.4 Smoke-Test auf echtem Pi Zero W2
- [x] 12.5 Rollback-Plan dokumentieren
