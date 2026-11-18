# Phoniebox Upload-Dienst

Kleiner Dienst (nur Python-Standardbibliothek, ca. 20-30 MB RAM) zum Hochladen und Verwalten von Musik
unterhalb von `~/RPi-Jukebox-RFID/shared/audiofolders`. Wird von der neuen Web-App benutzt.

## Dateien
- `phoniebox_upload.py` der Dienst (eine Datei)
- `phoniebox-upload.service` systemd-User-Unit
- `nginx-upload.conf` Snippet fuer den nginx-`server {}`-Block (Port 80)
- `upload-service.conf.example` Konfiguration (`KEY=VALUE`)
- `tests/` pytest (`python -m pytest deploy/upload-service/tests -q`)

## Konfiguration
Umgebungsvariablen (oder Datei, `--config` bzw. `PHONIEBOX_UPLOAD_CONF`; Umgebung gewinnt):
`PHONIEBOX_UPLOAD_ROOT`, `_HOST` (127.0.0.1), `_PORT` (8081), `_MAX_BYTES` (1 GiB pro Datei),
`_MPD_HOST` (localhost), `_MPD_PORT` (6600), `_MAX_UPLOADS` (4 gleichzeitige Uploads, mehr -> HTTP 429).

## API
Antworten sind JSON. Fehler: `{"ok":false,"error":"code","message":"Text"}`.
Alle POSTs brauchen den Header `X-Requested-With: phoniebox` (sonst 403).

| Aufruf | Zweck |
|---|---|
| `POST /upload` (multipart: erst `path`, dann `file`) | `path` = Zieldatei relativ, z. B. `Pumuckl/01 Intro.mp3`. 201 `{ok,path,size,replaced}`. Ordner werden angelegt, vorhandene Datei wird ersetzt. Content-Length Pflicht. |
| `GET /files/list?path=<ordner>` | `{ok,path,items:[{name,type:dir/file,size,mtime}]}`, Ordner zuerst |
| `POST /files/mkdir` `{path}` | Ordner anlegen |
| `POST /files/delete` `{path}` | Datei oder Ordner (rekursiv); Wurzel nie |
| `POST /files/rename` `{path,to}` | umbenennen/verschieben; Ziel existiert -> 409 |
| `GET /files/info` | `{max_bytes, allowed_extensions, free_bytes}` |
| `GET /files/health` | `{ok:true}` |

Statuscodes: 400 (ungueltiger Pfad, Symlink, kaputter Body), 403 (Header fehlt), 404, 409, 411, 413 (zu gross),
415 (Dateityp), 429 (zu viele Uploads), 507 (Karte voll).

## Verhalten
- Upload wird in 64-KiB-Stuecken in `.upload-xxxx.part` im Zielordner geschrieben, `fsync`, dann `rename`.
  Bei Abbruch/Limit wird die Teildatei geloescht, eine bestehende Datei bleibt unveraendert.
- Erlaubt: mp3, m4a, m4b, ogg, opus, flac, wav, jpg, jpeg, png (Gross/Klein egal, nur die letzte Endung zaehlt).
- Rechte: Dateien 0664, Ordner 0775 (unabhaengig von umask).
- Nach Schreibvorgaengen wird MPD per `update <ordner>` informiert (gebuendelt: 3 s nach dem letzten Vorgang,
  spaetestens nach 20 s). Fehlt MPD, wird nur geloggt.
- Fuer neu hochgeladene Dateien hat die Box nach dem MPD-Update die Titel in der Datenbank; die Web-App
  muss die Liste danach neu laden.

## Sicherheitsmodell (bitte lesen)
**Es gibt keine Anmeldung und kein HTTPS.** Geschuetzt ist:
Pfad-Traversal (`..`, absolute Pfade, Backslash, NUL, versteckte Namen), Ausbrechen ueber Symlinks (werden weder
gefolgt noch erzeugt noch aufgelistet), Dateityp-Whitelist, Groessenlimit, Parallelitaetsgrenze, Socket-Timeout 60 s,
einfacher CSRF-Schutz (Pflicht-Header; Browser senden ihn fremden Seiten nicht ohne CORS-Freigabe, und es gibt keine).
**Nicht** geschuetzt: Jeder im Heimnetz, der Port 80 der Box erreicht, kann Musik hochladen und loeschen.
Den Dienst deshalb nur an `127.0.0.1` binden (Standard) und nie ins Internet freigeben. Die "PIN" der Web-App ist
nur eine Kindersicherung in der Oberflaeche und schuetzt diese API nicht.

## Installation
Siehe `deploy/INSTALL.md`. Kurz: Dateien nach `~/phoniebox-upload/`, Unit nach `~/.config/systemd/user/`,
`systemctl --user enable --now phoniebox-upload`, nginx-Snippet einbinden, `sudo nginx -t && sudo systemctl reload nginx`.
Pruefen, ob User-Dienste beim Booten starten: `loginctl show-user admin | grep Linger`.
