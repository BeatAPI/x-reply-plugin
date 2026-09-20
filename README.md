# X Reply Plugin

Chrome side-panel assistant for **X** and **Reddit**. It reads the current post, drafts two editable replies via **BeatAPI Text API**, and fills the one you pick into the reply box:

- **High-value**: join the discussion only — no product mention, no link
- **Product promo**: respond first, then naturally mention BeatDesign or BeatAPI with the correct URL

The extension **never** clicks the final Reply / Comment button. Publishing stays with you.

## Model settings (BeatAPI only)

| Field | Default |
|---|---|
| Base URL | `https://api.beatapi.io/v1` |
| Model | `deepseek-v4.1-flash` |
| API Key | empty — paste your BeatAPI key in the side panel |

Catalogue models are listed in settings (DeepSeek / GPT / Claude / Gemini / Grok / Kimi / GLM / Qwen / MiniMax / MiMo). **No API keys are bundled.**

Product copy lives in [`src/lib/product-catalog.ts`](./src/lib/product-catalog.ts).

## Install from source

```bash
git clone https://github.com/BeatAPI/x-reply-plugin.git
cd x-reply-plugin
npm install
npm run build
```

Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `.output/chrome-mv3`.

## Usage

1. Open a specific X post or Reddit thread and refresh.
2. Open the side panel from the extension icon.
3. Paste your BeatAPI key in settings and pick a model.
4. Choose BeatDesign or BeatAPI at the top (default BeatDesign).
5. Generate, edit, then **Fill** — click Reply yourself on the page.

## Develop

```bash
npm test
npm run typecheck
npm run build
npm run zip
```

## Privacy

- Model settings stay in local browser storage.
- Needs page access to read the thread and locate the editor.
- No bundled cookies, profiles, or auto-publish.

## Brand

Icons use the **BeatAPI** mark. This repo is BeatAPI-owned packaging for overseas agent workflows.
