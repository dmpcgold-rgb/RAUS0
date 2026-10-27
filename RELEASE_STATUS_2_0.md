# RAUSO 2.0 – Entwicklungsstatus

## Im Android-WebView-Projekt umgesetzt
- Fünf umschaltbare Oberflächen (Hell, Lila Neon, Orange Neon, Regenbogen, Carbon) und Geräte-Speicherung.
- Optional automatische Hell/Dunkel-Wahl anhand lokaler Uhrzeit beim App-Start.
- Personalisierter Startbereich; fünf sichtbare Navigationspunkte plus Mehr-Menü.
- Offline-Warnung. Echte Offline-Synchronisierung ist noch **nicht** implementiert.
- Bestehende Karten-, Events-, Nachrichten-, Familien-, Mitfahr- und Admin-Funktionen bleiben im Quellcode.
- Fehlenden Profil-Elementzugriff behoben.

## Nicht als fertig anzusehen
- Kein RAUSO-Backend eingerichtet; ohne Backend soziale Daten nur Test/Vorschau.
- Keine lizenzierte Kino-/Event-API, kein Firebase-Push.
- Gruppenchats, Gruppenabstimmungen und Altersprüfung sind noch nicht produktionsreif.
- Android-Build ist ohne Android SDK / Gradle Wrapper in dieser Umgebung nicht möglich.
- Keine signierte APK; RLS-/Integrations- und Play-Store-Tests ausstehend.

## Nächste Schritte
Eigene RAUSO-Supabase-Instanz anlegen, Auth und RLS migrieren und testen, echte Gruppenchats und Abstimmungen implementieren, lizenzierte Datenanbieter anbinden, Firebase konfigurieren, E2E-Tests, signierte APK und AAB via GitHub Actions.
