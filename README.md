# RAUSO — Österreich erleben, Leute kennenlernen

Android-Prototyp mit Restaurants, Thermen, Ausflügen, gemeinsamen Unternehmungen, Likes, Freunden, Nachrichten und optionalem Dating ab 18.

## Was funktioniert in der Demo?

- Responsive Violett-Rosa-Aurora-Oberfläche mit dunkellila Verlauf, farbigen Glows und Glasoptik für Android und Browser, Hauptnavigation mit 5 Bereichen.
- Region (viele Städte in Österreich), Umkreis, Kategorie, Suche und Kartenansicht.
- „Echte Orte laden“: OpenStreetMap/Overpass-Abfrage **erst auf Knopfdruck**, 6 Stunden Zwischenspeicher und lokaler Beispiel-Fallback bei Fehlern.
- Favoriten, Treffen erstellen und Reaktionen mit lokaler Demo-Speicherung.
- Kontakte, Kontaktanfragen, Beispielchat, optionale Dating-Freigabe und Demo-Matches.
- Demo-Profile und Demo-Nachrichten sind ausdrücklich Beispiele. **Keine Nachrichten werden ohne Backend an andere Personen verschickt.**

## Als APK bauen

Für den kostenlosen GitHub-Actions-Build ein neues (vorzugsweise privates) Repository `RAUSO` erstellen, diese Dateien hochladen und in Actions `RAUSO Android APK` starten. Die debug-APK liegt anschließend im Workflow-Artefakt `RAUSO-Android-1.1-debug`.

Das Repository verfügt über die Android-Projektdateien und eine Workflowdefinition, ist aber noch **nicht** auf GitHub veröffentlicht. Die APK wurde in dieser Arbeitsumgebung nicht kompiliert, da Android SDK/Gradle hier fehlen.

## Für echte Nutzer: eigenes Supabase-Projekt erforderlich

1. **Neues, getrenntes** Supabase-Projekt anlegen. Nicht die bestehende Gym-Coach-Datenbank verwenden.
2. `backend/schema.sql` im SQL-Editor des neuen Projekts einspielen und mit Security Advisor prüfen.
3. Nur `supabaseUrl` und **publishable key** in `app/src/main/assets/config.js` hinterlegen. Nie einen `service_role`, Secret-Key oder Datenbank-Passwort veröffentlichen.
4. E-Mail-Registrierung, RLS, Moderation, Datenschutzrichtlinie, Meldeabläufe, echte Altersprüfung und End-to-End-Tests einrichten, **bevor** die App öffentlich verteilt wird.

Ein selbst bestätigtes Geburtsalter ist keine zuverlässige technische Altersverifizierung. Die Dating-Funktion muss vor einem öffentlichen Launch mit rechtssicherem Alterskonzept und wirksamer Moderation ergänzt werden.

## Daten und Nutzungsbeschränkungen

Ortsdaten © OpenStreetMap-Mitwirkende, ODbL. Öffentliche Overpass- und Kartenserver sind begrenzt belastbar und eignen sich **nicht** als skalierbare öffentliche Produktionsdatenbank. Für viele Nutzer eigene Datenpipeline oder professionellen OSM-Dienst einrichten. Daten sind nicht garantiert vollständig; Öffnungszeiten und Preise werden nicht zugesichert. Die Kartenansicht benötigt eine Internetverbindung.

Einige bekannte Veranstaltungsorte sind nur als **Beispielvorschau** hinterlegt, inklusive näherungsweiser Koordinaten. Erst Live-Abfragen liefern OSM-Positionen.

## Projektstruktur

- `app/src/main/assets/`: App-Oberfläche (HTML/CSS/JS)
- `app/src/main/java/at/rauso/app/MainActivity.java`: sicherer nativer Android-WebView-Host
- `backend/schema.sql`: abgesicherte Supabase-Datenbank für echten Mehrnutzerbetrieb
- `.github/workflows/android-apk.yml`: APK-Build in GitHub Actions

## Version 1.2 — Familie, Anreise und Sicherheitskonzept (Oktober 2026)

- **Original-Look Dark Aurora** beibehalten: dunkles Violett, Pink/Violett-Verläufe, vertraute Karten und Navigation.
- Eigener Reiter **Familie**, Familienveranstaltungen und familienfreundliche Ausflugsziele.
- Öffentliche und private Treffen (gemeinsam Kochen, Basteln, Backen, Spieleabend). Die **private Hausadresse gehört nicht in die öffentliche Anzeige**. Veröffentlichung erfordert geprüfte Erwachsenenidentität.
- Anreisearten Auto, U-Bahn, Bus, Zug und **zu Fuß**, bei ÖV Linie und Einstiegsort, bei Auto Mitfahrt suchen oder Sitzplätze anbieten. Das Demo-Formular zeigt drei Plätze als Auswahl, nicht als buchbare echte Fahrt.
- Ausweisprüfung: Gültigkeit, Lebendigkeits-Selfie, Foto-Ausweis-Abgleich und identischer **amtlicher Profilname**; Status nur durch sichere Anbieterprüfung.
- Fahreranbieter: Amtlicher Profilname muss dem Namen im Zulassungsschein entsprechen; Kennzeichen muss dem Zulassungsdokument entsprechen. Zulassungsbesitzer, der nicht der Fahrer ist, kann keine Fahrt anbieten; Unterstützung für Vollmachten ist nicht eingebaut.
- **Sicherheitsfall melden** mit Notrufhinweis und, sobald die Backend-Migration aktiv ist, privaten Vorfallmeldungen und einem nur für privilegierte Betreiber zugänglichen Fahrten-Nachweis. Dies ist **kein automatischer Polizeialarm**, kein Live-Tracking und keine Garantie, Straftaten verhindern oder aufklären zu können.

### Wichtige Voraussetzungen für den Live-Betrieb

1. Nach `backend/schema.sql` die zusätzliche Datei `backend/security_v1_2.sql` ausführen. Vor Produktionsbetrieb alle Berechtigungen und RLS-Policies auditieren.
2. Einen geeigneten **Ausweis-/Selfie-Verifizierungsdienst** und sichere serverseitige Webhooks einbinden. Der Provider liefert geprüfte Ergebnisse an ein privates Backend, das `identity_checks` und `vehicle_checks` setzt. Der Prototyp **kann keine Dokumente prüfen oder verifizieren** und bietet deshalb bewusst keinen simulierten Freigabe-Knopf. Dokument-Uploads dürfen nicht über die gewöhnliche öffentlich lesbare App-Datenbank erfolgen.
3. Eine echte Fahrzeugdokument-Prüfung mit Registrierungsabgleich beauftragen; bloße optische oder OCR-Ähnlichkeit allein beweist keine Echtheit des Dokuments. Ein eigener Prozess kann für berechtigte Fremdfahrzeuge (Miete, Familie, Leasing) später ergänzt werden.
4. DSGVO-Konzept und rechtliche Prüfung: Rechtsgrundlage, geeignete Einwilligung/Information, begrenzte Speicherung, sichere Schlüsselverwaltung, Verifizierungsdienst als Auftragsverarbeiter, Datenzugriffskontrollen, Löschfristen und dokumentierte Behördenanfragen. Identitätsbilder dürfen nicht an andere Mitglieder verteilt werden.
5. Für echte Fahrten: verbindliche Teilnahmebuchungen, Fahrtenstatus, Check-in, Missbrauchsschutz, Moderation, Notfallprozess und überprüfte Notfallkontakte bauen. Die aktuellen Demo-Profile und -Ereignisse sind rein fiktiv.
6. `security_v1_2.sql` erzeugt bei einem bestätigten Fahrer einen internen Snapshot des bei Veröffentlichung geprüften Kennzeichens. Es bleibt gegenüber normalen Mitgliedern und dem öffentlichen API verborgen; Herausgabe nur auf rechtskonformer Grundlage.

Der Android-Build ist eine **debug-APK zum Testen**. Die App ist nicht für die öffentliche Vermittlung von Fahrgemeinschaften oder privaten Heimtreffen freigegeben, solange Identitätsprüfung, Fahrzeugprüfung und serverseitiger Incident-Response nicht vollständig integriert und geprüft sind.


## Neu in Version 1.4 – Meine Treffen & Neon Flora

- Neuer Hauptnavigationspunkt **Meine Treffen**: bevorstehende eigene Treffen, persönliche Teilnahme-Zusagen und Interesse sowie vergangene Treffen.
- Kompakter Zähler in der Fußnavigation für bevorstehende zugesagte oder selbst organisierte Treffen.
- Treffen können aus der persönlichen Übersicht direkt im Bereich »Gemeinsam« geöffnet werden. Reaktionen können über die Übersicht zurückgenommen werden.
- **Wichtig**: »Bin dabei« bedeutet eine *eigene* Zusage; es ist keine Bestätigung des Veranstalters. Für gegenseitig verbindliche Zusagen wäre ein eigener Freigabeprozess im Backend erforderlich.
- Neues **Neon Flora**-Layout: globaler dunkelvioletter Hintergrund, botanische lilafarbene Blätter, kleine leuchtende Vögel und violett-rosa-cyanfarbene Überschriften. Die SVG-Dekorationen sind lokal enthalten, benötigen kein Internet und blockieren keine Berührungen.
- Paketkennung unverändert `at.rauso.app`; Android `versionCode` auf 4 erhöht. Ob eine erzeugte APK über eine bestehende Installation aktualisieren kann, hängt zusätzlich von identischer Signatur ab. Die GitHub-Debug-APK ist nicht als dauerhaft signierte Release-APK eingerichtet.
