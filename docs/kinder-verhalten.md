# Kinderverhalten der Phoniebox

Grundsatz: Kinder machen alles gleichzeitig, mehrfach und zu lange. Die Box muss das aushalten, ohne Geschichten neu zu starten,
zu knallen oder still zu bleiben. Eltern verwalten, Kinder bedienen nur Player und Karten.

## Regeln, Begründung, Umsetzung

| Regel | Warum | Wo umgesetzt |
|---|---|---|
| Dieselbe Karte nochmal auflegen, während der Ordner läuft: weiterspielen. Pausiert: fortsetzen. Gestoppt/Ende: neu starten. | Kinder halten Karten lange auf den Leser oder tippen mehrfach. Neustart der Geschichte ist der größte Ärger. | Plugin `kidsbox` (`core.py`, Alias `play_card_kids`). Für alte Karten zusätzlich `second_swipe_action: play`. |
| Entprellung: dieselbe Karte löst erst nach 2 s ohne Lesen erneut aus. | Leser (hier PN532) lesen unregelmäßig; das Plugin ist zusätzlich idempotent, ein Fehltrigger schadet also nicht. | `rfid.yaml` `same_id_delay` (Future3-Standard 1,0 s, hier auf 2,0 s gesetzt). |
| Andere Karte während der Wiedergabe: kurz ausblenden (400 ms), wechseln, einblenden. | Harter Schnitt klickt/knallt. Lautstärke wird danach exakt wiederhergestellt, auch bei Fehlern. | `kidsbox.core` `_fade_out/_fade_in`, `kidsbox.fade_ms` (0 = aus). |
| Fortsetzen pro Ordner (Hörbuch): merkt Datei und Position, springt 3 s zurück. Musik: immer von vorn. Fertig gehörtes Buch beginnt wieder vorn. | Hörbücher dauern Stunden, Lieder nicht. Future3 hat dafür nur einen nicht angeschlossenen Platzhalter (`RESUME: OFF`). | Einstellung pro Karte im Karten-Dialog und Standard in "Eltern". Speicherung in `shared/settings/kidsbox.json` (alle 30 s beim Spielen, sofort bei Pause/Stopp/Wechsel). |
| Höchstlautstärke (Gehörschutz) und Startlautstärke. | Ein Kind darf nie lauter als eingestellt. Gilt auch für Karten. | `pulse.soft_max_volume`/`startup_volume` (Future3), in "Eltern" per RPC änderbar. UI-Regler endet bei der Grenze. |
| Lautstärkesprung begrenzt (Standard 15 Punkte pro Geste). | Ein Wisch von leise auf laut ist die häufigste Schreckerfahrung. | Nur im Browser (Handy-Einstellung), `prefsStore.limitJump`. Karten-Lauter/Leiser nutzen Schritt 5. |
| Einschlaf-Timer: "Musik anhalten nach N Min." oder "Ausblenden und Box ausschalten". | Einschlafen mit Hörbuch ist der Normalfall; Position wird beim Stopp gespeichert. | Player-Seite, nutzt `timer_stop_player`/`timer_fade_volume` von Future3. |
| Automatisch ausschalten bei Stille: standardmäßig **aus**, optional z. B. nach 15 Min. | Strom sparen, SD-Karte schonen. Aus, weil der Zero 2 W keinen Einschaltknopf hat: nach dem Herunterfahren muss man den Strom trennen. | `timers.idle_shutdown.timeout_sec` (0 = aus), einschalten mit `apply-kids-config.py --idle-minutes 15` oder in "Eltern". |
| Elternmodus mit PIN (4 bis 8 Ziffern). Geschützt: Karten, Eltern-Seite, Datei-Verwaltung/Upload. Offen: Player, Bibliothek ansehen/abspielen. Sperrt sich nach 10 Min. | Kinder sollen nichts löschen, aber Musik starten dürfen. Kein Konto nötig. | `parentStore`, `ParentGate`. **Nur Kindersicherung, keine Sicherheit:** PIN steht im Browser des Geräts, wird in JavaScript geprüft, die Box selbst fragt nichts ab (Port 5556/5557 und `/upload` sind im Heimnetz offen). |
| Unbekannte Karte: kurzer Signalton an der Box und freundlicher Hinweis am Handy ("Diese Karte kennt die Box noch nicht", Eltern sehen die ID und "Zuordnen"). | Stille wirkt kaputt. | `kidsbox` (Callback des RFID-Readers, `resources/audio/unknown-card.wav`, 5 s Pause), `CardScanWatcher`. |
| Spezialkarten: Lauter, Leiser, Pause, Play/Pause, Nächster/Voriger Titel, Schlafen (15/30 Min.), Musik stoppen, Ausschalten. | Steuerung ohne Handy. | Karten-Dialog "Steuerkarte", vorhandene Aliase von Future3. |

## Konfiguration (jukebox.yaml)

```yaml
kidsbox:
  fade_ms: 400                 # 0 = harter Wechsel
  resume_rewind_sec: 3
  resume_save_interval_sec: 30 # SD-Karten-Schonung
  unknown_card_sound: ../../resources/audio/unknown-card.wav   # leer = still
  unknown_card_cooldown_sec: 5
```

Anwenden auf eine bestehende Box: `deploy/kids-config/apply-kids-config.py` (idempotent, mit Backup).

## Grenzen: was Future3 nicht hergibt oder ich nicht prüfen konnte

* **Karte entfernt erkennen** (Pause beim Wegnehmen) geht nur mit "place_not_swipe" und Readern, die dauerhaft lesen.
  Nicht aktiviert: PN532 liest bei kurzen Aussetzern die Karte nicht, das würde ständig pausieren. Nicht getestet.
* Einstellungen, die nur in den YAML-Dateien liegen (`same_id_delay`, Fade-Dauer, Signalton):
  die UI zeigt sie an, ändert sie aber nicht (Future3 hat keine RPC zum Schreiben von `jukebox.yaml`).
* PIN und Sprunggrenze gelten pro Gerät/Browser, nicht für die ganze Box (`get_app_settings` liefert nur `show_covers` zurück).
* Der Signalton nutzt `jingle.play`: das setzt die Lautstärke kurz auf `jingle.volume` (30) und danach zurück. Bei laufender
  Musik kann man das hören.
* Beim Fortsetzen startet MPD kurz Titel 1, bevor der Sprung kommt (Zehntelsekunde hörbar, wenn vorher nichts lief).
* Auf der echten Box geprüft (unabhängige Prüfung, ohne Kartenleser): dieselbe Karte läuft weiter bzw. setzt fort, Kartenwechsel mit Ausblenden
  (Lautstärke danach exakt wie vorher), Hörbuch-Position wird gemerkt. **Nicht** geprüft: unbekannte Karte (Signalton), Entprellung am echten
  PN532, Hörbuch-Ende, wie das Ausblenden *klingt*. Dafür braucht es eine echte Karte und ein Ohr.
* Upstream-Fehler umgangen: `cards.register_card` speichert `kwargs` als `args`. Die UI sendet deshalb nur `args`.
