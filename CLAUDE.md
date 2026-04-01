# Phoniebox Projekt

## Überblick
Phoniebox (Kinder-Musikbox mit RFID) basierend auf Raspberry Pi Zero W2 mit Phoniebox Future 3 (v3).

## Pi-Zugang
- **Host**: phoniebox.local / 192.168.188.135
- **Benutzer**: phoniebox
- **SSH**: Port 22 (muss ggf. über boot-Partition reaktiviert werden)
- **Web-App**: http://192.168.188.135

## Phoniebox v3
- Repo: MiczFlor/RPi-Jukebox-RFID (Branch: future3/main)
- Installationsverzeichnis auf dem Pi: /home/phoniebox/RPi-Jukebox-RFID
- Musik-Verzeichnis: /home/phoniebox/RPi-Jukebox-RFID/shared/audiofolders
- Konfiguration: /home/phoniebox/RPi-Jukebox-RFID/shared/settings

## Installation
- OS: Raspberry Pi OS Lite 32-bit (Trixie)
- Vor Installation immer: `umask 022` setzen
- Lange Installationen immer in `screen` starten
- triggerhappy.service Fehler bei Trixie ist harmlos (ignorieren)

## Sprache
Kommunikation auf Deutsch.
