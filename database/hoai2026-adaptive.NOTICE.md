# Provenance and attribution: `hoai2026-adaptive.json`

`database/hoai2026-adaptive.json` is the customer's adaptive "Hour of AI 2026" lesson
content, vendored verbatim from Code.org so the demo runs on the authentic curriculum.

## Source

- Repository: https://github.com/code-dot-org/code-dot-org
- Path: `dashboard/config/level_content/adaptive/hoai2026-adaptive.json`
- Branch: `staging`
- Commit: `6da3223d94bd4f0344a2b3012c4faf1a108c7e8e`
- Retrieved: 2026-11-04

## License

Code.org's source and assets are licensed under the **Apache License 2.0**
(https://github.com/code-dot-org/code-dot-org/blob/staging/LICENSE), which permits
redistribution with attribution and this notice. This file is unmodified lesson content.

### Proprietary Materials exclusion

Apache-2.0 at that repo excludes Code.org's "Proprietary Materials" (artwork, graphics,
images, videos, logos, fonts — see
https://github.com/code-dot-org/code-dot-org/blob/staging/NOTICE). This repository therefore
contains **only the lesson JSON text** (titles, instructions, questions, structure). It does
**not** copy any Code.org image or media files. The lesson panels reference Code.org image
**URLs** (`https://images.code.org/...`) for display only; those assets are served by Code.org
and are not redistributed here.

## How it is used

- `database/generate_seed_adaptive.py` reads this file to generate the Course 2 block of
  `database/seed.sql` (the DB seed, C-6: content is data, never hand-copied).
- It is the authoritative content model per C-1. The runtime tree file
  `database/sample-skilltree.json` is being reconciled to it in a follow-up (see the DB-seed
  PR description).
