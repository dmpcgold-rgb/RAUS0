# RAUSO v2.2.0 – Sicherheits- und Veröffentlichungsstand

## In dieser Version
- Profilkennzeichnung „Ausweis geprüft“ nur bei serverseitig zurückgemeldeter Identitätsbestätigung einschließlich Gesicht- und Namensabgleich. Ein Login allein gilt nicht mehr als Identitätsprüfung.
- Fahrerfreigabe nur bei bestätigter Identität, Fahrzeug- und Kennzeichenabgleich. Ohne externen Prüfdienst bleibt diese Funktion gesperrt.
- Versionsanzeige aus derselben Versionskonstante in Profil, Einstellungen und technischem Status.
- Android versionCode 23, versionName 2.2.0.

## Vor öffentlichem Betrieb notwendig
1. Eigenes RAUSO-Supabase-Projekt anlegen; keine vorhandene Fremd-App-Datenbank verwenden.
2. SQL-Skripte in Reihenfolge `schema.sql`, `security_v1_2.sql`, `upgrade_v1_6.sql`, `upgrade_v1_7.sql`, `upgrade_v1_8.sql` in einer isolierten Staging-Umgebung prüfen und anwenden.
3. Administration erst nach echtem Login per UUID: Betreiberin=owner, zweiter Administrator=admin. Niemals aus E-Mail oder Profiltext ableiten.
4. Identity/vehicle verification per geprüften Dienst, serverseitig signierte Rückmeldung, Datenschutzprüfung. KEINE automatische Freigabe bei Anmeldung.
5. Datenschutz/Impressum, Löschablauf, Melde- und Sperrmechanismen und Moderation mit Testbenutzern überprüfen.
6. Firebase FCM und eventuelle Veranstaltungsanbieter separat registrieren und auf echten Geräten testen.
7. Android Debug APK in GitHub Actions bauen und installieren. Play Store erfordert gesondert signiertes AAB und Freigabe durch die Betreiberin.

Kein produktives Backend wurde erstellt oder mit dieser ZIP verbunden; Online-Benutzertests und Android-Build wurden hier nicht durchgeführt.
