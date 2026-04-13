# Herqua Schoenadviseur v2b — Telefoon-gebaseerde Analyse

**Datum:** 2026-04-13
**Status:** Approved design, ready for implementation plan
**Afhankelijkheid:** v2a (zie `2026-04-13-herqua-schoenadviseur-v2a-design.md`) moet geïmplementeerd zijn; v2b breidt die wizard uit.

## Doel

De v2a schoenadviseur krijgt twee optionele analyse-features die Herman inzetbaar maken als digitale loopanalist:

- **Voetscan** via telefoon-camera — meet EU schoenmaat, breedte en boog-hoogte
- **Loopanalyse** via telefoon-camera — detecteert pronatie, landing en cadans

Beide zijn opt-in upgrades die de v2a wizard-flow verrijken zonder hem te breken. Gebruikers zonder camera of zonder tijd voor scannen krijgen nog steeds het volledige v2a-advies.

## Scope

### In scope
- Voetscan met camera-foto (met A4-papier als schaal, of zonder schaal als fallback)
- Loopanalyse met camera-video (achteraanzicht, 15 sec, 3-4 passes)
- Client-side video-verwerking (MediaPipe Pose) — video verlaat het toestel niet
- Server-side foto-verwerking via Claude Vision
- Expliciete privacy-UI met info-button in elke scan-modal
- Integratie met v2a wizard: voorgevulde velden, profiel-data gevoed aan `/api/recommend`

### Out of scope (phase 3+)
- Rate-limiting van scans (later toe te voegen zonder architectuurverandering)
- Echte ML-training / custom modellen (Claude Vision + MediaPipe zijn goed genoeg voor demo)
- iOS/Android native app
- Multilingual UI
- Analytics / GA4 tracking van scan-usage
- Offline-modus (Claude calls vereisen connectie)

## Tone: Herman spreekt met autoriteit

De gebruiker ziet NOOIT woorden als "confidence", "waarschijnlijk", "ik denk", "ongeveer", "kans dat". Herman adviseert met vertrouwen. Intern heeft de backend een `confidence`-veld in elke scan-response — die wordt alleen gebruikt om te beslissen of een retry nodig is:

- `low` → Herman zegt "De foto/video was niet goed te gebruiken. Probeer opnieuw met betere verlichting." Scan wordt NIET toegepast.
- `medium` of `high` → Herman toont het resultaat gewoon als feit, zonder voorbehoud. Scan wordt toegepast.

## Architectuur (hybride)

- **Voetscan: server-side** — foto (base64) → `POST /api/scan/foot` → Claude Vision analyseert → JSON terug. Kleine payload, Claude Vision is hier sterk.
- **Loopanalyse: client-side pose-tracking** — MediaPipe Pose draait in de browser, extraheert 33 landmarks per frame. Alleen de aggregated pose-tijdreeks (~50-100KB JSON, géén video) gaat naar `POST /api/scan/gait`. Claude interpreteert het patroon.

Reden: video mag het toestel niet verlaten (privacy én bandwidth), terwijl foto's klein genoeg zijn voor directe Vision-analyse.

## Plaatsing in de wizard (opt-in upgrade)

De v2a wizard blijft onveranderd. Op twee stappen verschijnt een **secundaire knop** die een modal opent:

- **Stap 4 (pronatie):** "📹 Laat Herman het meten (2 min)" — opent loopanalyse-modal
- **Stap 5 (maat/gewicht/gender):** "🦶 Doe een voetscan (30 sec)" — opent voetscan-modal

Beide knoppen zijn secondary styled (niet geel-als-CTA), onder de hoofdkeuze-opties. Subtekst: "🔒 Privacy-vriendelijk". Wie ze overslaat loopt normaal door de wizard.

Na een geslaagde scan:
- Wizard re-rendert de stap met voorgevulde waardes
- Een groen "✓ Gescand door Herman" label verschijnt naast de velden
- Gebruiker kan altijd nog handmatig aanpassen

## Persistentie
Scan-resultaten leven in `state.profile` (in-memory, in de JS runtime) totdat de browser-pagina ververst wordt. Terugnavigeren in de wizard bewaart scan-resultaten; "Opnieuw beginnen" wist ze. Geen localStorage, geen server-side opslag.

---

## Voetscan — componenten & flow

### UI stappen

1. Gebruiker klikt "🦶 Doe een voetscan" op stap 5
2. **Modal opent** met 2-keuze:
   - **Met A4-papier** (aanbevolen — meet maat + breedte + boog)
   - **Zonder A4** (alleen breedte + boog; maat blijft handmatig)
3. **Instructie-scherm** met illustratie:
   - Blote voet plat op een A4 (of op contrasterende ondergrond zonder A4)
   - Foto loodrecht van bovenaf (~40 cm hoogte)
   - Voorwaarden: goede verlichting, hele A4 + voet in beeld
4. **Foto-input:** `<input type="file" accept="image/*" capture="environment">` — opent op mobiel direct de achtercamera
5. **Preview + confirm:** "Zie je je hele voet + A4? Maak desgewenst opnieuw."
6. **Analyse:** modal toont spinner + "Herman meet je voet…" (3-5 sec)
7. **Resultaat-scherm** met Herman-avatar:
   - EU maat: **43**
   - Breedte: **Standaard** (Smal / Standaard / Breed)
   - Boogtype: **Normale boog** (Plat / Normaal / Hoog)
   - Knop "Toepassen" → modal sluit, stap 5 toont voorgevulde maat + "✓ Gescand door Herman" label
   - Indien breedte=breed → chip "Brede pasvorm" wordt aangevinkt in voorkeuren (stap 6)

### Backend contract

`POST /api/scan/foot`:

```json
// Request
{
  "image_base64": "iVBORw...",
  "with_a4_scale": true
}

// Response (happy path)
{
  "foot_length_mm": 267,
  "eu_size": "43",
  "width_class": "standard",
  "arch_type": "normal",
  "confidence": "high",
  "notes": "A4-referentie duidelijk zichtbaar, rechtervoet gemeten."
}

// Response (low confidence)
{
  "confidence": "low",
  "message_to_user": "De foto was niet goed bruikbaar. Probeer opnieuw met betere verlichting."
}
```

Velden:
- `width_class`: `"narrow" | "standard" | "wide"`
- `arch_type`: `"flat" | "normal" | "high"`
- `confidence`: `"low" | "medium" | "high"` — intern, nooit getoond
- `message_to_user`: alleen bij low — door Herman geschreven, geen confidence-jargon

Zonder A4 (`with_a4_scale: false`): response bevat `width_class` + `arch_type`, maar `foot_length_mm` en `eu_size` ontbreken (of zijn `null`).

### System prompt (samengevat)

Backend file `backend/prompts/scan-foot.md` bevat de volledige prompt. Kernstukken:

- Claude wordt Herman — warm, kort, Nederlands, jij-vorm
- Taak: meet voetlengte in mm (indien A4 aanwezig), classificeer breedte en boog
- Schaal: A4-lange-zijde = 297 mm, korte-zijde = 210 mm
- Breedte-thresholds: smal/standaard/breed op basis van verhouding lengte/breedte
- Boog: visuele inspectie van de mediane boogzijde (plat/normaal/hoog)
- Output: ALTIJD valide JSON in bovenstaand schema
- Bij slechte foto: confidence=low + vriendelijke retry-boodschap (geen jargon)

---

## Loopanalyse — componenten & flow

### UI stappen

1. Gebruiker klikt "📹 Laat Herman het meten" op stap 4
2. **Voorbereidings-modal** opent:
   - Animatie van opstelling: telefoon liggend op de grond of laag statief achter je, camera naar voren, 5m open ruimte voor je
   - Checklist:
     - ✓ Telefoon op de grond of laag statief
     - ✓ Minimaal 5 meter loopruimte
     - ✓ Strakke broek/legging zichtbaar
     - ✓ Voldoende licht
   - Privacy-strip bovenaan (zie "Privacy-UI" sectie)
   - Knop "Ik ben klaar — start analyse"
3. **Camera-preview:** getUserMedia achtercamera full-screen, grote "Start opname" knop
4. **Countdown 3-2-1** met audio beeps
5. **Opname-fase (15 sec):**
   - MediaPipe Pose draait in browser op 30fps
   - Progress-ring op het scherm (zichtbaar door gebruiker die wegloopt)
   - Audio-cues: start-beep t=0 ("lopen!"), stop-beep t=15 ("stop!")
   - Gebruiker loopt 3-4 passes heen en weer
6. **Pose-aggregatie** client-side:
   - Per frame: 33 landmarks opslaan
   - Detecteer heel-strikes via y-coord van voet-keypoints
   - Tel valide passes (symmetrische heen-en-weer bewegingen)
   - Als <3 valide passes → Herman zegt "Ik kon je niet goed zien, probeer opnieuw" + retry-knop
7. **Upload-fase:** ~50-100KB JSON naar proxy
8. **Verwerking-scherm:** spinner + "Herman analyseert je loopstijl…" (3-5 sec)
9. **Resultaat-scherm** met Herman-avatar:
   - Pronatie: **Neutraal**
   - Landing: **Midvoet** (Hiel / Midvoet / Voorvoet)
   - Cadans: **172 stappen/min**
   - Knop "Toepassen" → stap 4 voorgeselecteerd "Neutraal" + "✓ Gemeten door Herman" label; landing + cadans opgeslagen in profiel voor Claude's uiteindelijke advies

### Backend contract

`POST /api/scan/gait`:

```json
// Request
{
  "fps": 30,
  "duration_sec": 15,
  "num_passes": 4,
  "frames": [
    { "t": 0.033, "landmarks": [[x, y, z], [x, y, z], ...33 total] },
    ...
  ]
}

// Response (happy path)
{
  "pronation_type": "neutral",
  "landing_pattern": "midfoot",
  "cadence_spm": 172,
  "confidence": "high",
  "notes": "3 volledige passes geanalyseerd, symmetrisch patroon."
}

// Response (low)
{
  "confidence": "low",
  "message_to_user": "Ik kon je loopstijl niet goed zien. Probeer opnieuw met betere verlichting en zorg dat je heupen-knieën-voeten volledig in beeld zijn."
}
```

Velden:
- `pronation_type`: `"neutral" | "over" | "supination"`
- `landing_pattern`: `"heel" | "midfoot" | "forefoot"`
- `cadence_spm`: integer
- `confidence`: `"low" | "medium" | "high"` — intern
- `message_to_user`: alleen bij low

### System prompt (samengevat)

Backend file `backend/prompts/scan-gait.md`:

- Claude wordt Herman
- Input: tijdreeks van 33-landmark pose-frames
- Taak:
  1. Meet pronatie door heel-kantelpatroon in heel-strike frames (inward tilt = overpronatie)
  2. Detecteer landing: eerste contact met grond via voet-landmark (heel vs midfoot vs forefoot)
  3. Cadans: aantal heel-strikes per minuut, uit periodiciteit
- Output: valide JSON
- Bij slechte data: confidence=low + vriendelijke retry-boodschap

---

## Privacy-UI — expliciet, altijd zichtbaar

### Privacy-strip (persistent)

Aan de bovenkant van élke scan-modal — zichtbaar door de hele flow (instructie, opname, resultaat):

```
🔒 Jouw beelden blijven privé  ·  [ℹ️ Hoe?]
```

Stylistiek:
- Teal achtergrond (`#eef9f8`) met teal-rand (`#38b6ab`)
- Slot-icoon links, tekst in het midden, info-button rechts
- Rustige, geruststellende look (geen alarmerend rood/geel)

### Info-modal (bij klik op "ℹ️ Hoe?")

Opent een secondary modal. Content verschilt per scan-type:

**Voor voetscan:**

> **Hoe beschermen we jouw privacy?**
>
> ✓ **Je foto wordt niet opgeslagen.** Na de analyse (±3 seconden) wordt hij direct weggegooid — hij komt niet in een database, niet in een back-up, niet op ons dashboard.
>
> ✓ **Alleen Herman en Claude (onze AI) bekijken je foto** voor het meten van maat, breedte en boog. Geen mens bij Herqua kijkt mee.
>
> ✓ **Geen persoonsherkenning.** De AI meet een voet, niks meer.
>
> ✓ **Versleutelde verbinding (HTTPS)** tijdens het uploaden.
>
> Vertrouw je het niet? Sla deze scan over en vul handmatig in — je advies werkt ook zonder.

Met een visuele flow-icon: `📱 → 🔒 ↗ [☁️ AI] → 🗑️`

**Voor loopanalyse:**

> **Hoe beschermen we jouw privacy?**
>
> ✓ **Jouw video verlaat je telefoon niet.** De analyse gebeurt in je browser.
>
> ✓ **Alleen anonieme bewegingspunten worden verstuurd** (heup/knie/voet-coördinaten, ~50 KB JSON) — geen video, geen foto, geen gezicht.
>
> ✓ **De video wordt na de analyse automatisch verwijderd** uit je browser-geheugen.
>
> ✓ **Geen opslag bij Herqua of onze AI.** Alleen de bewegingspatronen worden geïnterpreteerd, daarna weggegooid.
>
> Vertrouw je het niet? Sla deze scan over en kies zelf je pronatie — je advies werkt ook zonder.

Met flow-icon: `📱 (video blijft hier) → 🔢 keypoints → ↗ [☁️ AI] → 🗑️`

### Verdere privacy-indicatoren

- **Wizard-knop sub-tekst (stap 4 en 5):** "🔒 Privacy-vriendelijk"
- **Tijdens opname (loopanalyse):** klein label onder preview: "🔒 Video wordt niet verstuurd"
- **Resultaat-scherm:** groene bevestiging onderaan: "✓ Beelden zijn inmiddels verwijderd"

## Integratie met `/api/recommend`

`state.profile` krijgt 2 extra optionele velden na succesvolle scans:

```json
{
  ...bestaande wizard-velden,
  "_foot_scan": { "eu_size": "43", "width": "standard", "arch": "normal" },
  "_gait_scan": { "pronation": "neutral", "landing": "midfoot", "cadence_spm": 172 }
}
```

Proxy injecteert dit als extra context in de Claude system-prompt voor `/api/recommend`:

> **Extra meetgegevens van de scan-functies:** [JSON van scans].
> Gebruik deze concreet in je `why_for_you` bullets. Voorbeelden: "Jouw gemeten cadans van 172 spm past goed bij…", "Met je licht-overprone patroon kun je het beste…". Herman spreekt met autoriteit — GEEN disclaimers over metingen.

Herman's `personal_tip` kan dan expliciet refereren: "Ik zag dat je iets op je hielen landt — een schoen met meer heel-demping is daarom extra belangrijk."

## Error handling

### Voetscan
- **Geen camera-toegang** → `<input type="file">` valt automatisch terug naar galerij-upload
- **Low confidence** → Herman's retry-boodschap + "Opnieuw" knop; scan niet toegepast
- **Claude Vision timeout / API-fout** → "Er ging iets mis bij Herman's analyse, probeer opnieuw of vul handmatig in"
- **Bestand te groot (>10MB)** → client-side resize naar max 1600×1600 voor upload

### Loopanalyse
- **Geen camera-toegang / getUserMedia faalt** → fallback: "Upload een video die je eerder opnam (achteraanzicht, 10-15 sec)"
- **MediaPipe laadt niet / browser te oud** → feature verborgen; alleen zelfrapportage blijft zichtbaar
- **<3 valide passes gedetecteerd** → Herman: "Ik kon je niet goed zien, probeer opnieuw" + tips (licht, kleding, camera-positie)
- **Low confidence** → idem retry

### Privacy-regels (bindend)
- Geen video of foto wordt opgeslagen op de server
- In-memory verwerking tijdens HTTP request; buffers direct weggegooid na response
- Geen logging van upload-payloads (specifiek uitgezonderd in logger)
- Geen persistent camera-toestemming

## Bestanden die wijzigen (v2b)

| Bestand | Wijziging |
|---|---|
| `frontend/js/wizard.js` | Hook `renderExtraControls(step)` voor stappen 4+5 |
| `frontend/js/scan-foot.js` | NIEUW — voetscan modal + upload |
| `frontend/js/scan-gait.js` | NIEUW — loopanalyse modal + MediaPipe + recording |
| `frontend/js/privacy-info.js` | NIEUW — shared privacy-strip + info-modal component |
| `frontend/css/scan.css` | NIEUW — modals, overlay, privacy-strip, camera-preview |
| `frontend/vendor/pose.min.js` | NIEUW — lokaal gehoste MediaPipe Pose |
| `frontend/vendor/pose_wasm.wasm` | NIEUW — MediaPipe assets |
| `backend/proxy.js` | 2 nieuwe routes toegevoegd (scan/foot, scan/gait) |
| `backend/handlers/scan-foot.js` | NIEUW — Claude Vision call |
| `backend/handlers/scan-gait.js` | NIEUW — Claude pose-interpretatie |
| `backend/prompts/scan-foot.md` | NIEUW — system prompt |
| `backend/prompts/scan-gait.md` | NIEUW — system prompt |
| `README.md` | v2b-features + privacy-statement |

## Toekomstvastheid

- Scan-endpoints (`/api/scan/foot`, `/api/scan/gait`) hebben stabiele JSON-contracts → swap-baar voor dedicated ML-service zonder frontend-wijziging
- Pose-aggregatie is MediaPipe-versie-ongevoelig (we sturen alleen genormaliseerde landmarks, niet Mediapipe-specifiek formaat)
- Rate-limiting is later toe te voegen als middleware zonder design-wijziging
- Native app kan dezelfde backend-routes hergebruiken

## Testing (demo-scope)

Geen formele tests — handmatige smoke-tests in README:
1. Voetscan met A4 → EU-maat ±1 correct
2. Voetscan zonder A4 → breedte + boog, geen maat
3. Voetscan met slechte foto → Herman's retry-boodschap, geen scan-toepassing
4. Loopanalyse happy path → pronatie detectie + cadans redelijk
5. Loopanalyse mislukt (camera afgedekt) → retry-boodschap, geen scan-toepassing
6. E2E: scan voet → scan loopstijl → advies krijgt referenties in `why_for_you` bullets

## Open punten (niet blokkerend)

- Threshold-waardes voor breedte-classificatie en boog-classificatie zullen in prompt-tuning worden bepaald na eerste tests
- Pose-analyse wordt gemeten tegen een referentie-video van een bekend neutraal/overpronate loper tijdens implementatie
- Rate-limiting policy pas vaststellen bij Herqua go-live
