# John Reed Bild-Import

Es gibt bewusst **zwei Bildstufen pro Übung**:

- `thumb`: kleines Bild aus der 103-Übungen-Gesamtübersicht.
- `detail`: großes Bild aus einer später geöffneten Übungsdetailseite.

Beide bleiben erhalten. In `catalog.json` gilt automatisch:

```text
preferred = detail, wenn vorhanden
preferred = thumb, solange noch kein detail vorhanden ist
```

Damit kann die GYM-App sofort mit den kleinen Bildern arbeiten. Später können einzelne Übungen schrittweise durch große Detailbilder aufgewertet werden, ohne die vorhandenen Thumbnails zu löschen.

## Eingabe

Screenshots der Gesamtübersicht kommen nach:

```text
imports/johnreed/overview/
```

Screenshots einzelner geöffneter Übungen kommen später nach:

```text
imports/johnreed/detail/
```

Danach:

```bash
python tools/johnreed_extract.py
```

## Ausgabe

```text
pics_johnreed/extracted/
  thumb/        kleine Bilder
  detail/       große Bilder
  review/       nicht sicher zuordenbare Treffer
  catalog.json  Zuordnung Name -> klein/groß/bevorzugt
  review.html   visuelle Kontrolle
```

Das Tool überschreibt **kein kleines Bild durch ein großes Bild**. Ein großes Bild wird zusätzlich gespeichert und nur im Manifest als bevorzugt gesetzt.

## Kontrolle

`review.html` zeigt pro Übung nebeneinander:

- Name
- kleines Bild
- großes Bild
- aktuell bevorzugte Datei

Unklare OCR-/Zuordnungsfälle werden nicht erfunden, sondern unter `review/` abgelegt und oben in der Kontrollseite aufgeführt.

## Abhängigkeiten

```bash
pip install pillow opencv-python pytesseract
```

Zusätzlich benötigt das Skript Tesseract OCR mit deutschem Sprachpaket (`deu`).
