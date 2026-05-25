# Mushy the Artist 2.0

O'zbek tilidagi san'at tarixi mentor-sayti. Har bir sessiya **to'rt qismli kanvas** ga ega:

1. **Davr** (Era / Movement)
2. **Janr** (Genre)
3. **5 mikroelement** (Visual alphabet)
4. **Shoh asar tahlili** (Masterpiece deep dive)

Va oxirida — 10 savollik mini-test.

## Hozir mavjud

- **Sessiya 01** — Italyan Yuksak Renessansi · Portret · *Mona Liza*
- **Sessiya 02** — Italyan Barokkosi · Diniy hikoya · *Matveyning chaqirig'i*
- **Sessiya 03** — Frantsuz Impressionizmi · Manzara · *Impression, Soleil Levant*

Yana **27 ta sessiya** "Tez orada" holatida — katalogda mavjud, kontentni bosqichma-bosqich qo'shamiz.

## Lokal preview

Sayt statik (HTML + CSS + JS). `fetch()` lokal `file://` URL'lar bilan ishlamaydi, shuning uchun oddiy HTTP server kerak.

```powershell
# loyiha ichida turib
python -m http.server 8000
```

Keyin brauzerda: `http://localhost:8000`

Yoki Node bilan: `npx serve .`

## GitHub Pages'ga deploy qilish

1. Bu papkani GitHub repositorisining ildiziga joylashtiring (yoki `docs/` ichiga).
2. Repo settings → Pages → Branch: `main` / Folder: `/` (yoki `/docs`).
3. `https://<username>.github.io/<repo>/` ochiladi.

## Yangi sessiya qo'shish

1. `data/sessions/NN-slug.json` faylini yarating ([1-sessiya](data/sessions/01-italyan-renessansi.json) ni shablon qilib oling).
2. `data/index.json` ichiga sessiya metadata'sini qo'shing va `"available": true` qilib belgilang.
3. Tayyor. Brauzerni yangilab, yangi sessiya kartochkasini ko'rasiz.

## Sessiya JSON sxemasi

```jsonc
{
  "id": "01-slug",
  "number": 1,
  "title": "Sessiya sarlavhasi",
  "era_en": "English movement name · Genre",
  "reading_time": "~10 daqiqa o'qish",

  "era": {
    "body": ["paragraf 1", "paragraf 2", ...],
    "pull_quote": "katta italics ko'rinishdagi sitata",
    "figure": { "src": "...", "artist": "...", "title": "...", "year": "...", "location": "...", "note": "..." }
  },

  "genre": {
    "name_en": "Portraiture",
    "body": ["..."],
    "gallery": [ {figure}, {figure}, ... ],   // odatda 5 ta
    "outro": ["..."]                          // ixtiyoriy
  },

  "elements": {
    "intro": "...",
    "items": [                                // aynan 5 ta
      {
        "name": "Sfumato",
        "name_en": "sfumato",
        "meaning": "qisqa izoh",
        "body": ["..."],
        "figure": { ... }
      }
    ]
  },

  "masterpiece": {
    "title": "...",
    "artist": "...",
    "year": "...",
    "location": "...",
    "figure": { ... },
    "intro": ["..."],
    "first_impression": "...",
    "hidden_narrative": "...",
    "technical_magic": "...",
    "so_what": "..."
  },

  "quiz": [                                   // aynan 10 ta
    {
      "question": "...",
      "options": ["a", "b", "c", "d"],
      "correct": 1,                            // 0-indexed
      "explanation": "..."
    }
  ]
}
```

Inline markdown `body` matnida ishlaydi: `**bold**`, `*italic*`, `` `code` ``. Paragraflarni alohida string sifatida bering yoki bitta string ichida `\n\n` bilan ajrating.

## Manbaalar

- **Rasmlar:** [Wikimedia Commons](https://commons.wikimedia.org) — barchasi jamoat mulkidan.
- **Shriftlar:** [Google Fonts](https://fonts.google.com) — Cormorant Garamond + Inter.
- **Tarkib:** O'zbek tilida, mentor-uslubida yozilgan. Asosiy atamalar qavs ichida ingliz tilida ham beriladi.

## Litsenziya

Shaxsiy o'rganish loyihasi. Rasmlar ularning asl manbasi (Wikimedia Commons) bo'yicha, matn — CC BY-SA 4.0.
