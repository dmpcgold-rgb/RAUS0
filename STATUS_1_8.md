# RAUSO 1.8 – transparente Doppeladministration

## Implementiert im Quellcode
- `owner` = Hauptadministratorin / rechtlich verantwortliche Betreiberin.
- `admin` = zusätzlicher Administrator mit Moderationsrechten.
- Beide Rollen bearbeiten Nutzermeldungen über die vorhandene Oberfläche; die App blendet die jeweils eigene Rolle ein.
- Die Rollenzuweisung wird nicht vom Smartphone, sondern von der Datenbank kontrolliert (RLS + keine Client-Schreibrechte auf `app_admins`).
- Bestehendes statisches Violett-Neon-Blätter-Design bleibt erhalten.

## Für den Echtbetrieb offen
1. Es ist **kein eigenes RAUSO-Supabase-Projekt** verbunden. Bestehende, fremde App-Projekte wurden absichtlich nicht verändert.
2. SQL-Migrationen in einem separaten RAUSO-Projekt installieren, Konfiguration eintragen, dann beide Nutzerkonten anlegen und deren echte UUIDs privilegiert als `owner` und `admin` registrieren.
3. Push benötigt Firebase-Anbindung, Android-Gerätetests und Backendversand.
4. Kinoprogramm und Event-Tickets benötigen autorisierte API-Zugangsdaten / Lizenzen.
5. Dating benötigt verlässliche Altersverifikation und Datenschutz-/Moderationskonzept vor öffentlicher Freigabe.
6. Für einen verantwortlichen Produktivbetrieb fehlen weitere Ende-zu-Ende-Tests, datenschutzrechtliche Prüfung, Kontolöschung, Impressum, Missbrauchsschutz, eigene Geo-Datenversorgung sowie signierte Release-APK.

Die Rolle `admin` ist **kein heimlicher Zugang**. Beide Betreiber müssen die Rechte kennen; der Zugriff ist protokollierbar zu gestalten.
