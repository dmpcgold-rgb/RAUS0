# RAUSO – verschlüsselte Datenbank-Backups

## Status
Der GitHub-Actions-Workflow `.github/workflows/rauso-encrypted-backup.yml` ist angelegt.
**Backups laufen erst, wenn die beiden Repository-Secrets eingerichtet und ein Workflow-Lauf erfolgreich war.**
Der Zeitplan ist täglich 02:17 UTC (in Österreich 03:17 MEZ / 04:17 MESZ).
Die GitHub-Artefakte sind auf 30 Tage Aufbewahrung eingestellt.

## GitHub-Secrets einrichten
Repository > Settings > Secrets and variables > Actions > New repository secret:

- `RAUSO_DATABASE_URL`: der **Datenbank-Verbindungsstring** aus dem RAUSO-Projekt in Supabase > Connect (PostgreSQL). Verwende eine dafür geeignete direkte oder Session-Pooler-Verbindung mit SSL und einen Datenbankbenutzer, der die benötigten Schemas lesen darf. Niemals im Code eintragen.
- `RAUSO_BACKUP_PASSPHRASE`: ein langes, zufällig generiertes Backup-Passwort. **An einem zweiten sicheren Ort aufbewahren.** Ohne dieses Passwort können die Backups nicht entschlüsselt werden.

Diese Secrets werden weder in `config.js` noch in APKs abgelegt.

## Erstes Backup prüfen
GitHub > Actions > RAUSO encrypted database backup > Run workflow. Der Lauf muss grün sein; unter Artifacts muss `rausodb-encrypted-...` mit `rauso.dump.gpg` und `SHA256SUMS` verfügbar sein.
Der Workflow prüft die Struktur des PostgreSQL-Dumps vor der Verschlüsselung. **Zusätzlich entschlüsselt er die erzeugte GPG-Datei testweise und vergleicht den Inhalt Byte für Byte mit dem ursprünglichen Dump.** Schlägt dieser Vergleich fehl, wird kein Backup-Artefakt hochgeladen. Dabei wird die produktive Datenbank nicht verändert.
Ein vollständiger Wiederherstellungstest auf einer **separaten** Testdatenbank ist zusätzlich erforderlich. Die automatische Byte-Prüfung ersetzt keinen vollständigen Restore-Test.

## Wiederherstellung
1. GitHub-Artefakt auf einen abgesicherten Rechner herunterladen.
2. SHA256SUMS prüfen: `sha256sum -c SHA256SUMS`.
3. `gpg --output rausodb.dump --decrypt rausodb.dump.gpg` (Backup-Passwort eingeben).
4. `pg_restore --list rausodb.dump` prüfen.
5. **Nur auf einer separaten Testdatenbank** die Wiederherstellung ausprobieren. Niemals ohne vorherige neue Sicherung direkt auf der produktiven RAUSO-Datenbank wiederherstellen.
6. Die produktive Wiederherstellung muss Auth-Konfiguration, Datenbankrollen, Erweiterungen und Funktionen berücksichtigen. `pg_dump` sichert keine Upload-Dateien aus Supabase Storage; diese müssen separat geschützt werden.

## Vor großen Änderungen
Den Workflow manuell mit reason `pre-update` starten und erst nach erfolgreicher Sicherung fortfahren. Ein automatischer Vorab-Backup-Zwang für jede App-Code-Änderung ist damit noch **nicht** eingerichtet.

## Datenschutz und Grenzen
Backups enthalten potentiell personenbezogene Daten, Konten und private Nachrichten. Die GitHub-Artefakte dürfen nur berechtigten Repo-Mitgliedern zugänglich sein, die Secrets dürfen nicht veröffentlicht werden.
Eine GitHub-Artefakt-Aufbewahrung von 30 Tagen ist kein unabhängiges Offsite-Backup: Wird das Repository oder der GitHub-Zugang gelöscht, können auch die Backups verloren gehen.
Für Betriebssicherheit ist eine zweite verschlüsselte Speicherstelle empfehlenswert.

## Automatischer Restore-Test (separater Workflow)
Der Workflow `.github/workflows/rauso-restore-verification.yml` startet nach einem erfolgreichen RAUSO-Datenbank-Backup automatisch und lässt sich zusätzlich manuell ausführen. Er lädt das verschlüsselte Backup, entschlüsselt es nur auf dem kurzlebigen GitHub-Runner und versucht, die `public`-Tabellen in einer **lokalen, isolierten PostgreSQL-17-Testinstanz** wiederherzustellen. Anschließend prüft er das Vorhandensein der Tabellen `rauso_profiles`, `rauso_outings`, `rauso_messages` und `rauso_friendships`.

**Wichtig:** Der erste erfolgreiche Restore-Lauf muss noch bestätigt werden. Einige Supabase-spezifische Rollen, Erweiterungen und Funktionen können die Wiederherstellung auf einem reinen PostgreSQL-Server verhindern. Ein roter Restore-Test bedeutet deshalb nicht automatisch, dass das verschlüsselte Backup unbrauchbar ist; seine Protokolle müssen ausgewertet werden. Der Test ist keine vollständige Wiederherstellung von Supabase Auth, Storage-Dateien oder Projektkonfiguration. Die produktive Datenbank wird niemals als Restore-Ziel verwendet.

## Supabase Storage (Profilbilder und weitere Dateien)
Im RAUSO-Projekt gibt es derzeit den **privaten** Bucket `profile-photos`. Der zusätzliche GitHub-Workflow `.github/workflows/rauso-storage-backup.yml` durchsucht alle Storage-Buckets inklusive Unterordner, lädt die Dateien mit Serverberechtigung herunter und sichert sie zusammen mit einem Dateiverzeichnis/Prüfsummen in einem **AES-256-verschlüsselten** Archiv.

**Zusätzlicher GitHub Repository Secret:**
- `RAUSO_STORAGE_SERVICE_ROLE_KEY`: Der **Legacy service_role API Key** des RAUSO-Projekts (Dashboard > Project Settings > API Keys). Nur bei GitHub Actions als Secret hinterlegen, niemals in die App, in `config.js`, in einen Commit oder in einen Screenshot. Der öffentliche `anon`- bzw. Publishable-Key reicht für den privaten Bucket nicht aus.
- Das vorhandene `RAUSO_BACKUP_PASSPHRASE` wird wiederverwendet. Bitte nicht ändern, solange ältere Backups weiterhin entschlüsselbar bleiben sollen.

**Test:** Nach Einrichtung des Secrets in GitHub > Actions > **RAUSO encrypted Storage backup** > **Run workflow** einen Lauf starten. Nur ein **grüner** Lauf mit Artifact `rauso-storage-encrypted-...` bestätigt eine tatsächlich erzeugte Sicherung. Geplant täglich um 02:47 UTC; Aufbewahrung 30 Tage.

**Inhalt und Grenzen:** Das Archiv enthält die aktuell über die Storage-API erreichbaren Objektinhalte und ein `manifest.json` mit Objektpfaden, Größen und SHA-256-Prüfsummen. Es enthält keine automatisch wiederhergestellte Supabase-Storage-Konfiguration, keine Versionierung gelöschter Dateien und keine Auth-Benutzer. Storage-Objekte und Datenbank-Metadaten werden zu unterschiedlichen Zeitpunkten gesichert und sind kein transaktional konsistenter Snapshot. Der GPG-Roundtrip wird bei jeder Sicherung verifiziert, ein vollständiger Test-Restore der Storage-Objekte steht separat aus. Temporär unverschlüsselte Daten werden nur auf dem kurzlebigen GitHub-Runner verarbeitet und nicht hochgeladen.

**Schutz:** Der Service-Role-Key hat umfangreiche Berechtigungen. GitHub-Repository und Actions-Artefakte nur für autorisierte Teammitglieder freigeben. Bei Verdacht auf Schlüsselabfluss den Schlüssel im Supabase-Dashboard rotieren und das GitHub-Secret ersetzen.
