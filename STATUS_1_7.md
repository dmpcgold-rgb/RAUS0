# RAUSO 1.7 — Ausbau, nicht produktionsreif

Fertig im Quellcode: serverseitig atomare Kapazitätskontrolle über `set_outing_reaction` (SQL Migration erforderlich), In-App-Benachrichtigungsübersicht, Kennzeichnung von bekannten/kostenlosen/preispflichtigen Orten anhand OSM-Attributen, sichere Behandlung unbekannter Eintrittspreise, statisches Design. Bestehende Messaging-, Profile-, Familien-, Dating- und Admin-Basis bleibt enthalten.

## Zwingend externe Schritte
1. Eigenes Supabase-Projekt erzeugen, SQL in Reihenfolge `schema.sql`, `security_v1_2.sql`, `upgrade_v1_6.sql`, `upgrade_v1_7.sql` ausführen. Versionsabhängige Sicherheitspolicies sorgfältig prüfen.
2. Supabase URL und öffentlichen anon/publishable Key in `assets/config.js` hinterlegen, E-Mail-Bestätigung und Löschprozess konfigurieren.
3. Erst nach Einwilligung des tatsächlichen Projektbetreibers Adminrolle serverseitig zuweisen. Keine Hintertür und keine verdeckten Adminrechte.
4. FCM/APNs bzw. Android-native FCM plus Serverversand mit Push-Tokens und Zustimmung konfigurieren. In-App-Hinweise allein sind KEIN Handy-Push.
5. Lizenzverträge und API-Zugang zu Kino/Veranstaltungs- und Ticketdaten beschaffen. Keine Kinozeiten erfinden.
6. Betreiberangaben, DSGVO-Texte, Moderation, Spam-/Missbrauchsschutz, Meldewege, Datenlöschung, Altersprüfung (insbesondere Dating), Regeln für Treffen und Mitfahrgelegenheiten rechtlich prüfen.
7. Für öffentliches Produkt eine belastbare Geo-API betreiben, da öffentliche Overpass-Server keine Produktions-SLA haben.
8. Android-Build inkl. Signatur, echte Geräte-Tests, reale Konto- und Datenbanktests durchführen.

Die App benötigt Online-Dienste für Community-Funktionen. ZIP ist Android-Quellprojekt, keine APK.
