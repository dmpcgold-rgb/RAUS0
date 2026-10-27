# RAUSO 1.5 – Live-Orte / Produktionsstatus

## Funktioniert ohne Server
- Android-WebView-Projekt mit regionaler Freizeitortssuche auf Grundlage tatsächlicher OpenStreetMap-Daten (Overpass)
- Kategorien: Restaurants, Thermen, Kino, Bowling, Spiel & Spaß, Ausflüge, Natur, Kultur, Sport, Familie und Unterkünfte
- regionale Suche, Radius, Freitextfilter, Merkliste auf dem Gerät und Kartenlink
- Kein Fallback auf erfundene Geschäfte oder Demo-Personen bei Ausfall der Ortssuche
- Feststehendes, nicht animiertes Layout mit violetter Dekoration

## Noch einzurichten für eine echte öffentliche Community
1. Eigenes dediziertes Supabase-Projekt für RAUSO erstellen (nicht mit einer anderen App teilen); `backend/schema.sql` und passende Policies prüfen und migrieren.
2. Supabase-URL und **nur** den publishable/anon key in `app/src/main/assets/config.js` einsetzen. Keine Service-Key oder Passwörter in die APK.
3. E-Mail-Bestätigung, Datenschutzinformation, Nutzungsbedingungen, Missbrauchsmeldung, Blockieren, Datenlöschung, Moderation und Server-Sicherheitsregeln testen.
4. Multinutzer-Tests: reale Anmeldung, Profile, Treffen, Zugesagt/Abgesagt, Nachrichten, Moderation; keine Produktionsfreigabe ohne diese Prüfung.
5. Für viele App-Nutzer einen lizenzierten OSM-Datendienst/selbst gehosteten Overpass-Backend-Cache einsetzen. Öffentliche Overpass-Instanzen sind kein SLA und können ausfallen.
6. Android-App in GitHub Actions bauen und von dort signiert ausliefern. Updatefähigkeit erfordert denselben privaten Signierschlüssel wie bei der bisher installierten App.

Anmerkung: OSM-Orte sind reale Karteneinträge, aber Öffnungszeiten, Preise, Kinoprogramme und Thermenangebote brauchen eine zusätzliche autorisierte Quelle und werden hier nicht als live behauptet.
