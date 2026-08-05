# V56 – iPhone-first Trainingsoberfläche

## Ziel

Die Trainingsansicht wird nicht als verkleinerte Desktop-Webseite behandelt. Sie wird als mobile Arbeitsoberfläche für ein iPhone im Hochformat aufgebaut.

## Nicht verhandelbare Leitplanken

- Live-Version auf `main` bleibt bis zur ausdrücklichen Freigabe unverändert.
- Light Mode zuerst.
- Grundfarbe Grün, nicht Blau.
- Ein klarer Arbeitsfokus pro Bildschirm.
- Keine dauerhaft sichtbare Seitenleiste.
- Keine vier Spalten, keine Desktop-Dashboard-Logik.
- Große Touch-Flächen und mindestens 16 px große Eingabefelder, damit iOS nicht automatisch zoomt.
- Pinch-to-Zoom und normales vertikales Scrollen bleiben möglich.
- Gerätedaten, Coach und Satzwerte bleiben je konkreter Maschine getrennt.

## Mobile Informationsarchitektur

### 1. Feste Trainingskopfzeile

- Schließen
- Training A/B und aktuelle Übung
- dauerhaft sichtbarer Timer
- Abschlussaktion

### 2. Aktuelle Übung

- Übungsname und Fortschritt, zum Beispiel „3 von 7“
- kleines Gerätebild
- konkrete Maschinenvariante
- Varianten horizontal durchwischbar
- kurzer Hinweis, wann diese konkrete Maschine zuletzt verwendet wurde

### 3. Heute

Coach und letzte Werte werden nicht in getrennten langen Textkarten gezeigt. Stattdessen gibt es pro Arbeitssatz eine klare Zeile:

- zuletzt
- heutige Vorgabe
- RIR-Ziel
- kurze Begründung

Warm-up bleibt optional und wird von der Progression getrennt.

### 4. Satztracking

- Gewicht
- Wiederholungen
- RIR
- Warm-up optional
- Werte aus Satz 1 können leere Folgesätze übernehmen
- keine horizontal scrollende Tabelle

### 5. Mobile Navigation

Am unteren Rand:

- vorherige Übung
- Übungsübersicht
- nächste Übung

Die vollständige Übungsliste erscheint als Bottom Sheet. Dort können Reihenfolge und zusätzliche Übungen geändert werden.

## Visuelles System – Light

- Hintergrund: warmes, sehr helles Grau-Grün
- Oberflächen: Weiß und leicht grün getöntes Weiß
- Primärgrün: dunkel, ruhig, nicht neon
- Statusgrün: klar, aber sparsam
- Text: fast schwarz mit leicht grünem Unterton
- Radien: 16–22 px
- Schatten: weich und zurückhaltend
- Farben dienen Hierarchie und Status, nicht Dekoration

## Aktivierung

V56 bleibt auf dem Branch `ui-mobile-light-v56`. Eine Aktivierung auf `main` erfolgt erst nach ausdrücklicher Freigabe nach dem Training.
