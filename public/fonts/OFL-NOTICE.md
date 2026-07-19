# Font licences

Every face here is licensed under the **SIL Open Font License 1.1** (OFL-1.1).
The OFL requires that this notice ship with the font files. It places no obligation
whatsoever on this application's own source code.

| File | Family | Copyright | Source |
|---|---|---|---|
| `Caveat-Regular.woff2` | Caveat | Copyright The Caveat Project Authors | https://github.com/googlefonts/caveat |
| `Nunito-Regular.woff2` | Nunito | Copyright The Nunito Project Authors | https://github.com/googlefonts/nunito |
| `JetBrainsMono-Regular.woff2` | JetBrains Mono | Copyright The JetBrains Mono Project Authors | https://github.com/JetBrains/JetBrainsMono |
| `Lora-Regular.woff2` | Lora | Copyright The Lora Project Authors | https://github.com/cyrealtype/Lora-Cyrillic |
| `ComicNeue-Regular.woff2` | Comic Neue | Copyright The Comic Neue Project Authors | https://github.com/crozynski/comicneue |
| `ArchitectsDaughter-Regular.woff2` | Architects Daughter | Copyright Kimberly Geswein | https://github.com/googlefonts/architectsdaughter |

Each file is the **latin subset** as served by Google Fonts — a few tens of KB rather
than the full multi-script face. If you need other scripts, re-fetch the relevant
`unicode-range` subsets from the same source.

Full licence text: https://openfontlicense.org/open-font-license-official-text/

## Swapping the handwriting face

`Caveat` fills the "hand-drawn" slot. Excalidraw's own face is **Excalifont** (also
OFL) — drop `Excalifont-Regular.woff2` in here and change the one entry in
`src/fonts/load.ts` plus `FONT_FAMILY` in `src/element/text.ts`. Other OFL options
with a similar feel: Kalam, Patrick Hand, Architects Daughter.

Note that the older **Virgil** face is *not* OFL — do not assume a `Virgil.woff2`
pulled off a CDN is free to redistribute.
