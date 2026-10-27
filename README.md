# RAUSO – Freizeit & Community

Offizielles Entwicklungsrepository unter **dmpcgold-rgb**.

## Projektstatus
- Bisheriger lokaler Quellstand: **RAUSO v2.2.0** (Android ZIP)
- Vollständiger Android-Quellcode: **noch nicht in dieses Repository importiert**
- GitHub Actions: Test-APK-Workflow angelegt, wird erst nach dem Import des Gradle-Projekts erfolgreich bauen.
- Dieses Repository heißt derzeit **RAUS0** (Ziffer Null), nicht **RAUSO** (Buchstabe O).

## Geplante Struktur
- `app/` – Android-Anwendung, Designs, Freizeit- und Community-Oberfläche
- `backend/` – Supabase-Datenbankschema und Migrationen
- `publishing/` – Datenschutzhinweise, Google-Play-Checkliste
- `.github/workflows/` – automatische Android-Builds

## Sicherheit
Keine Geheimnisse, Service-Role-Keys, API-Tokens oder Signing-Passwörter einchecken.
Deine Frau soll Hauptadministratorin sein, der zweite Administrator benötigt separate Rechte.
Backend, Push-Dienst und Mehrbenutzerbetrieb sind noch nicht produktiv angebunden.

## Build
Nach vollständigem Source-Import im Reiter *Actions* den Workflow *RAUSO Android Test-APK* starten.
