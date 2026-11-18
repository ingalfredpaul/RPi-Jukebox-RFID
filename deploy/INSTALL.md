# Installation auf der Box (Pi Zero 2 W)

Alles wird auf dem PC gebaut. Die Box bekommt nur fertige Dateien (kein `npm` auf der Box, 415 MB RAM).
Die alte Standard-App unter `src/webapp/build` wird **nicht** angefasst. Sie bleibt der Rückweg (Schritt 6).

Annahmen: Benutzer `admin`, Box `192.168.188.135`, Installation in `~/RPi-Jukebox-RFID`.
Befehle mit `sudo` musst du selbst im Terminal tippen.

## 1. Auf dem PC bauen

```bash
cd src/webapp-next
npm ci && npm run build        # erzeugt src/webapp-next/build/
npm test && npm run lint       # optional
```

## 2. Dateien auf die Box kopieren (nur kopieren, nichts wird aktiviert)

Im Repository-Wurzelverzeichnis des PC:

```bash
deploy/install-on-box.sh admin@192.168.188.135 --dry-run   # zeigt nur, was kopiert wird
deploy/install-on-box.sh admin@192.168.188.135
```

Danach liegt auf der Box:
`~/RPi-Jukebox-RFID/src/webapp-next/build/` (neue App), `.../components/kidsbox/` (Kinder-Plugin),
`~/phoniebox-upload/` (Upload-Dienst, nginx-Dateien) und `~/phoniebox-update/rpc_command_alias.py`.

## 3. Backup und Kinder-Plugin einschalten (auf der Box, per SSH)

```bash
cd ~/RPi-Jukebox-RFID
mkdir -p ~/backup-vor-umbau
cp shared/settings/jukebox.yaml shared/settings/rfid.yaml shared/settings/cards.yaml ~/backup-vor-umbau/
sudo cp /etc/nginx/sites-available/default ~/backup-vor-umbau/nginx-default   # falls die Datei dort liegt
cp src/jukebox/components/rpc_command_alias.py ~/backup-vor-umbau/
cp ~/phoniebox-update/rpc_command_alias.py src/jukebox/components/rpc_command_alias.py

.venv/bin/python deploy/kids-config/apply-kids-config.py --dry-run   # zeigt die Änderungen
.venv/bin/python deploy/kids-config/apply-kids-config.py             # schreibt (mit Backup *.bak-DATUM)
systemctl --user restart jukebox-daemon
sleep 20; journalctl --user -u jukebox-daemon -n 40 --no-pager | grep -i "kids\|error"
```

Erwartet wird eine Zeile `Kids mode ready`. Standardwerte: Startlautstärke 25 %, Höchstlautstärke 60 %,
Ausschalten nach 15 Min. Stille, `same_id_delay` 2 s. Ändern mit `--max-volume 50 --startup-volume 20 --idle-minutes 10`.
Wenn das Plugin nicht lädt: `journalctl` zeigt den Fehler; Rückweg siehe Schritt 6, Abschnitt Plugin.

## 4. Upload-Dienst einrichten

```bash
cd ~/phoniebox-upload
cp upload-service.conf.example upload-service.conf      # Pfade prüfen, ROOT muss absolut sein
mkdir -p ~/.config/systemd/user
cp phoniebox-upload.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now phoniebox-upload
systemctl --user status phoniebox-upload --no-pager
curl -s http://127.0.0.1:8081/files/health            # -> {"ok": true}
loginctl show-user admin | grep Linger                 # nur zur Info, siehe upload-service/README.md
```

## 5. nginx umstellen (sudo)

`/home/admin` hat Rechte `711`: nginx darf Dateien darin lesen, wenn sie selbst `o+r` haben.

```bash
chmod o+r ~/phoniebox-upload/nginx-upload.conf ~/phoniebox-upload/nginx-webapp-next.conf
sudo cp ~/phoniebox-upload/nginx-webapp-next.conf /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl reload nginx
```

(Auf dieser Box ist `sites-enabled/default` die aktive Datei. Prüfe mit `ls -l /etc/nginx/sites-enabled/`, ob es ein Link
auf `sites-available/default` ist; sonst die Datei in `sites-enabled` ersetzen.)

Test am Handy: `http://192.168.188.135/`. Dann "Teilen/Zum Home-Bildschirm". Es gibt kein HTTPS und keinen Service Worker;
das Symbol und der Vollbildstart funktionieren trotzdem (iOS Safari, Android Chrome "Zum Startbildschirm").

## 6. Zurückrollen

* **Web-App (schnell, sicher):** `sudo cp ~/backup-vor-umbau/nginx-default /etc/nginx/sites-available/default && sudo nginx -t && sudo systemctl reload nginx`.
  Die alte App liegt unverändert in `src/webapp/build`.
* **Upload-Dienst:** `systemctl --user disable --now phoniebox-upload`.
* **Kinder-Plugin:** `cp ~/backup-vor-umbau/jukebox.yaml shared/settings/jukebox.yaml`, danach
  `systemctl --user restart jukebox-daemon`. Karten, die mit "Musik oder Hörbuch" angelegt wurden, nutzen den Alias
  `play_card_kids`; ohne Plugin spielen sie nicht. Dann in der alten App neu zuordnen oder `cards.yaml` aus dem Backup zurückkopieren.
* Musik wird bei keinem dieser Schritte gelöscht.

## 7. Prüfliste nach der Installation

1. Handy: Player-Seite lädt, Lautstärke-Regler endet bei der Höchstlautstärke.
2. Eltern -> PIN setzen. Danach sperrt sich der Bereich nach 10 Min. oder über "Sperren".
3. Bibliothek -> Verwalten -> Hochladen: zwei MP3s in einen neuen Ordner. Nach dem Upload erscheinen sie in der Ordnerliste
   (MPD-Update läuft automatisch, ca. 3 Sekunden später).
4. Karten -> + -> Karte auflegen -> ID erscheint -> Ordner wählen -> Speichern -> Karte erneut auflegen: Musik startet.
5. Dieselbe Karte nochmal auflegen: Musik läuft weiter (nicht von vorn).
6. Unbekannte Karte: Signalton an der Box, Hinweis am Handy.

Nicht von mir auf einer echten Box ausprobiert (nur lokal getestet): alles ab Schritt 3. Siehe `docs/kinder-verhalten.md`, Abschnitt "Grenzen".
