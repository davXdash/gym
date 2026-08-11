#!/usr/bin/env python3
"""
John Reed Screenshot Extractor

Ziel:
- Übersichts-Screenshots: kleine Übungsbilder + Namen extrahieren.
- Detail-Screenshots: großes Übungsbild + Namen extrahieren.
- Kleine Bilder bleiben dauerhaft erhalten.
- Sobald ein Detailbild vorhanden ist, wird es als bevorzugtes Bild markiert.
- Bestehende Bilder werden nicht blind überschrieben; das Manifest dokumentiert alles.
- Unklare Erkennungen landen in review/ statt unter einem erfundenen Namen.

Ordner:
  imports/johnreed/overview/   <- Screenshots der 103er-Übersicht
  imports/johnreed/detail/     <- später einzelne geöffnete Übungen
  pics_johnreed/extracted/thumb/
  pics_johnreed/extracted/detail/
  pics_johnreed/extracted/review/
  pics_johnreed/extracted/catalog.json
  pics_johnreed/extracted/review.html

Abhängigkeiten:
  pip install pillow opencv-python pytesseract
  Zusätzlich Tesseract OCR mit deutschem Sprachpaket installieren.

Aufruf:
  python tools/johnreed_extract.py
"""

from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None

ROOT = Path(__file__).resolve().parents[1]
IN_OVERVIEW = ROOT / "imports" / "johnreed" / "overview"
IN_DETAIL = ROOT / "imports" / "johnreed" / "detail"
OUT = ROOT / "pics_johnreed" / "extracted"
OUT_THUMB = OUT / "thumb"
OUT_DETAIL = OUT / "detail"
OUT_REVIEW = OUT / "review"
CATALOG = OUT / "catalog.json"
REVIEW_HTML = OUT / "review.html"

SUPPORTED = {".png", ".jpg", ".jpeg", ".webp"}


@dataclass
class Candidate:
    name: str
    confidence: float
    crop: Image.Image
    source: str
    kind: str  # thumb | detail


def ensure_dirs() -> None:
    for p in (IN_OVERVIEW, IN_DETAIL, OUT_THUMB, OUT_DETAIL, OUT_REVIEW):
        p.mkdir(parents=True, exist_ok=True)


def norm_space(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = s.encode("ascii", "ignore").decode("ascii")
    s = s.lower().replace("ß", "ss")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "unbenannt"


def sha16(img: Image.Image) -> str:
    data = img.convert("RGB").tobytes()
    return hashlib.sha256(data).hexdigest()[:16]


def load_catalog() -> dict:
    if CATALOG.exists():
        try:
            return json.loads(CATALOG.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"schema": 1, "exercises": {}}


def save_catalog(catalog: dict) -> None:
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")


def ocr_data(img: Image.Image, psm: int = 6):
    if pytesseract is None:
        raise RuntimeError("pytesseract fehlt. Installiere: pip install pytesseract")
    cfg = f"--oem 3 --psm {psm}"
    return pytesseract.image_to_data(img, lang="deu", config=cfg, output_type=pytesseract.Output.DICT)


def ocr_text(img: Image.Image, psm: int = 6) -> str:
    if pytesseract is None:
        raise RuntimeError("pytesseract fehlt. Installiere: pip install pytesseract")
    cfg = f"--oem 3 --psm {psm}"
    return norm_space(pytesseract.image_to_string(img, lang="deu", config=cfg))


def clean_exercise_name(raw: str) -> str:
    s = norm_space(raw)
    # UI-Wörter entfernen, die OCR ggf. mitnimmt.
    junk = [
        "BENÖTIGTES EQUIPMENT", "BENOTIGTES EQUIPMENT", "ÜBUNGSAUSFÜHRUNG",
        "UBUNGSAUSFUHRUNG", "TRAINING", "Maschinen", "Übungen"
    ]
    for j in junk:
        s = re.sub(re.escape(j), " ", s, flags=re.I)
    s = norm_space(s)
    return s.strip("-–—|:;,. ")


def detail_candidate(path: Path) -> Candidate | None:
    """Extrahiert aus einer geöffneten Übung das große Hero-Bild.

    Bei den John-Reed-Detailseiten liegt der Name unter dem Hero-Bild und vor
    'BENÖTIGTES EQUIPMENT'. Wir bestimmen die Titelzone relativ zur Bildhöhe,
    damit normale iPhone-Screenshotgrößen funktionieren.
    """
    img = Image.open(path).convert("RGB")
    w, h = img.size

    # Titelzone: in den gelieferten Screenshots ca. 58–73 % der Höhe.
    title_box = (int(w * 0.02), int(h * 0.56), int(w * 0.98), int(h * 0.73))
    title_img = img.crop(title_box)
    raw = ocr_text(title_img, psm=6)
    name = clean_exercise_name(raw)

    # Falls OCR zu viel Text erwischt, bevorzuge kräftige Großbuchstaben-Zeilen.
    lines = [norm_space(x) for x in raw.split("\n") if norm_space(x)]
    if lines:
        likely = [x for x in lines if len(x) >= 5 and not re.search(r"EQUIPMENT|AUSFÜHR", x, re.I)]
        if likely:
            name = clean_exercise_name(" ".join(likely[:2]))

    # Hero: unter Status/Zurück-Button, oberhalb des Übungsnamens.
    hero = img.crop((0, int(h * 0.09), w, int(h * 0.58)))

    confidence = 0.95 if len(name) >= 6 else 0.35
    return Candidate(name=name, confidence=confidence, crop=hero, source=path.name, kind="detail")


def find_thumb_rects(img: Image.Image) -> list[tuple[int, int, int, int]]:
    """Findet die grauen quadratischen Übungsbilder der John-Reed-Übersicht."""
    arr = np.array(img.convert("RGB"))
    hsv = cv2.cvtColor(arr, cv2.COLOR_RGB2HSV)

    # Thumbnail-Hintergrund ist sehr hellgrau, relativ entsättigt.
    mask = cv2.inRange(hsv, np.array([0, 0, 185]), np.array([180, 45, 248]))
    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    w, h = img.size
    rects = []
    for c in contours:
        x, y, rw, rh = cv2.boundingRect(c)
        if rw < w * 0.12 or rh < w * 0.12:
            continue
        ratio = rw / max(rh, 1)
        if not 0.72 <= ratio <= 1.28:
            continue
        # UI-Elemente ganz oben/unten ausschließen.
        if y < h * 0.30 or y > h * 0.94:
            continue
        if rw > w * 0.38 or rh > w * 0.38:
            continue
        rects.append((x, y, rw, rh))

    # Fast gleiche/überlappende Treffer zusammenführen.
    rects.sort(key=lambda r: (r[1], r[0]))
    out = []
    for r in rects:
        if not out:
            out.append(r)
            continue
        x, y, rw, rh = r
        px, py, pw, ph = out[-1]
        if abs(y - py) < 20 and abs(x - px) < 20:
            if rw * rh > pw * ph:
                out[-1] = r
        else:
            out.append(r)
    return out


def overview_candidates(path: Path) -> list[Candidate]:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    candidates: list[Candidate] = []

    for x, y, rw, rh in find_thumb_rects(img):
        # Name steht rechts neben dem kleinen Bild.
        tx1 = min(w - 1, x + rw + int(w * 0.015))
        tx2 = int(w * 0.98)
        ty1 = max(0, y - int(rh * 0.08))
        ty2 = min(h, y + rh + int(rh * 0.08))
        text_crop = img.crop((tx1, ty1, tx2, ty2))
        raw = ocr_text(text_crop, psm=6)
        name = clean_exercise_name(raw)

        # Thumbnail mit kleinem Sicherheitsrand.
        pad = max(2, int(rw * 0.02))
        crop = img.crop((max(0, x-pad), max(0, y-pad), min(w, x+rw+pad), min(h, y+rh+pad)))
        confidence = 0.9 if len(name) >= 4 else 0.3
        candidates.append(Candidate(name=name, confidence=confidence, crop=crop, source=path.name, kind="thumb"))

    return candidates


def store_candidate(c: Candidate, catalog: dict) -> tuple[bool, str]:
    """Speichert Treffer. Detail ersetzt nie die Thumb-Datei, sondern wird zusätzlich geführt."""
    if c.confidence < 0.7 or len(c.name) < 3:
        fn = f"{Path(c.source).stem}__{c.kind}__{sha16(c.crop)}.jpg"
        c.crop.convert("RGB").save(OUT_REVIEW / fn, quality=92)
        return False, fn

    name = norm_space(c.name)
    slug = slugify(name)
    target_dir = OUT_DETAIL if c.kind == "detail" else OUT_THUMB
    fn = f"{slug}.jpg"
    dest = target_dir / fn

    # Bei Namenskollision mit anderem Bild nichts heimlich überschreiben.
    if dest.exists():
        existing = Image.open(dest).convert("RGB")
        if sha16(existing) != sha16(c.crop):
            # Detailbilder dürfen aktualisiert werden; Thumb-Kollisionen zur Prüfung.
            if c.kind == "detail":
                c.crop.convert("RGB").save(dest, quality=94)
            else:
                review_name = f"{slug}__{Path(c.source).stem}__collision.jpg"
                c.crop.convert("RGB").save(OUT_REVIEW / review_name, quality=92)
                return False, review_name
        # identisch => nichts tun
    else:
        c.crop.convert("RGB").save(dest, quality=94 if c.kind == "detail" else 92)

    ex = catalog["exercises"].setdefault(name, {
        "slug": slug,
        "thumb": None,
        "detail": None,
        "preferred": None,
        "sources": []
    })
    ex[c.kind] = str(dest.relative_to(ROOT)).replace("\\", "/")
    ex["preferred"] = ex.get("detail") or ex.get("thumb")
    if c.source not in ex["sources"]:
        ex["sources"].append(c.source)
    return True, fn


def generate_review(catalog: dict, unresolved: list[str]) -> None:
    rows = []
    for name in sorted(catalog.get("exercises", {}), key=str.casefold):
        ex = catalog["exercises"][name]
        thumb = ex.get("thumb")
        detail = ex.get("detail")
        preferred = ex.get("preferred")
        def img_tag(p):
            if not p:
                return '<span class="missing">—</span>'
            rel = Path(p).relative_to("pics_johnreed/extracted")
            return f'<img src="{html.escape(str(rel).replace(chr(92), "/"))}" loading="lazy">'
        rows.append(
            f"<tr><td><strong>{html.escape(name)}</strong></td>"
            f"<td>{img_tag(thumb)}</td><td>{img_tag(detail)}</td>"
            f"<td>{html.escape(preferred or '—')}</td></tr>"
        )

    unresolved_html = "".join(f"<li>{html.escape(x)}</li>" for x in unresolved) or "<li>Keine</li>"
    REVIEW_HTML.write_text(f"""<!doctype html>
<html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>John Reed Bildkontrolle</title>
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:24px;background:#f6f7f5;color:#171b18}}
main{{max-width:1100px;margin:auto}} table{{width:100%;border-collapse:collapse;background:white;border-radius:18px;overflow:hidden}}
th,td{{padding:12px;border-bottom:1px solid #e3e6e2;text-align:left;vertical-align:middle}} img{{width:120px;height:120px;object-fit:contain;background:#f0f1ef;border-radius:12px}}
.badge{{display:inline-block;padding:5px 9px;border-radius:999px;background:#e7efe9;color:#315a42}} .missing{{color:#999}}
</style><main><h1>John Reed Bildkontrolle</h1>
<p><span class="badge">{len(catalog.get('exercises', {}))} Übungen im Katalog</span></p>
<p><strong>Regel:</strong> Detailbild ist bevorzugt. Fehlt es, wird das Thumbnail benutzt. Das Thumbnail bleibt immer gespeichert.</p>
<h2>Ungeklärte Dateien</h2><ul>{unresolved_html}</ul>
<table><thead><tr><th>Übung</th><th>Klein</th><th>Groß</th><th>Verwendetes Bild</th></tr></thead><tbody>{''.join(rows)}</tbody></table></main></html>""", encoding="utf-8")


def images_in(folder: Path) -> Iterable[Path]:
    return sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in SUPPORTED)


def main() -> None:
    ensure_dirs()
    catalog = load_catalog()
    unresolved: list[str] = []
    ok = 0

    for path in images_in(IN_OVERVIEW):
        try:
            cs = overview_candidates(path)
            if not cs:
                unresolved.append(f"{path.name}: keine Thumbnail-Kacheln erkannt")
            for c in cs:
                stored, note = store_candidate(c, catalog)
                ok += int(stored)
                if not stored:
                    unresolved.append(f"{path.name}: {note}")
        except Exception as e:
            unresolved.append(f"{path.name}: {e}")

    for path in images_in(IN_DETAIL):
        try:
            c = detail_candidate(path)
            if c is None:
                unresolved.append(f"{path.name}: kein Detailbild erkannt")
                continue
            stored, note = store_candidate(c, catalog)
            ok += int(stored)
            if not stored:
                unresolved.append(f"{path.name}: {note}")
        except Exception as e:
            unresolved.append(f"{path.name}: {e}")

    save_catalog(catalog)
    generate_review(catalog, unresolved)

    n = len(catalog.get("exercises", {}))
    n_detail = sum(bool(x.get("detail")) for x in catalog.get("exercises", {}).values())
    n_thumb = sum(bool(x.get("thumb")) for x in catalog.get("exercises", {}).values())
    print(f"Katalog: {n} Übungen | klein: {n_thumb} | groß: {n_detail}")
    print(f"Neu/aktualisiert: {ok} | ungeklärt: {len(unresolved)}")
    print(f"Kontrolle: {REVIEW_HTML.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
