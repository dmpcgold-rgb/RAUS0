# RAUSO 1.6 — Entwicklungsstand

## Enthalten
- Android-WebView-Projekt mit Build-Workflow in `.github/workflows/android-apk.yml`.
- OpenStreetMap-Ortssuche für österreichische Regionen; Kino, Therme, Sport, Restaurants, Parks, Familie u. a.; keine garantierte Vollständigkeit.
- Reale Supabase-E-Mail-Konten, Nutzerprofile, Treffen, Zusagen/Interesse, bestehende Nachrichten- und Datinglogik nach Backendkonfiguration.
- Ergänzte Wunschlisten mit Mitgliedschaft/RLS, Profilfotos via Storage, beschränkte serverseitige Adminrollenerkennung, Moderationsliste.
- Kino- und Veranstaltungs-Ansicht weist auf fehlende lizenzierte Programmschnittstelle hin; keine fingierten Termine.
- Statisches lilafarbenes Blattmotiv mit neonfarbenen Vögeln.
- Backend-Erweiterung `backend/upgrade_v1_6.sql`.

## Noch NICHT produktionsreif
- Kein Supabase-Projekt verbunden (in `app/src/main/assets/config.js` eintragen). Zuerst `backend/schema.sql`, danach `backend/security_v1_2.sql`, danach `backend/upgrade_v1_6.sql` anwenden.
- Admin-Zugriff muss serverseitig durch einen Administrator in `app_admins` vergeben werden. Das Projekt ermittelt keinen Eigentümer anhand des Profilnamens.
- Keine echte Push-Zustellung (FCM/Backend), keine produktive Betreiber-Verifikation, keine Altersprüfung.
- Kinospielpläne/Tickets brauchen Lizenz/API-Verträge. Ortssuche ist keine Kino-Spielplanintegration.
- Supabase Storage wird über öffentliche URL für Profilfotos dargestellt: Fotos sind öffentlich abrufbar; bei privatem Foto-Konzept muss ein privater Bucket mit signierten URLs verwendet werden.
- OpenStreetMap Overpass öffentliche Endpunkte sind nicht für unbegrenzten Produktivbetrieb zugesichert. Geo-Datenbedarf klären.
- Datenschutzrechtliche Dokumente, Löschprozesse, Missbrauchsschutz, Jugendschutz, Meldungsablauf und rechtliche Betreiberangaben fehlen.
- Build & manuelle Android-Tests sind nicht erfolgt; ZIP enthält das Android-Projekt, keine APK.

## Anstehende Arbeiten
1. Backend per Migration ausrollen und Auth/Storage/Policies testen.
2. Treffenzusagen unter Kapazität atomar durch serverseitige RPC verwalten und Teilnehmeransicht fertigstellen.
3. Foto-Auswahl, Favoriten teilen, Benachrichtigungs-UI, Familien-Altersfilter und Preisfilter mit Datenqualität entwickeln.
4. Messaging Moderation, Spam-Schutz, Dating ab 18 prüfen; Datenschutzhinweise.
5. Lizenzierte Programmdatenanbieter integrieren.
6. Android Build mit stabilem Signierschlüssel und End-to-End-Tests.
