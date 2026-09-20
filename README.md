# X Reply

Chrome side-panel assistant for **X** and **Reddit**. It reads the current post, drafts two editable replies through an **OpenAI-compatible text API**, and fills the version you pick into the reply box.

- **Value-first**: join the discussion — no product mention, no link
- **Product-link** (optional): respond first, then mention *your* product from a local catalogue

The extension **never** clicks Reply / Comment. Publishing stays with you.

## Text provider

Defaults are aimed at [BeatAPI Text](https://docs.beatapi.io) as one compatible provider. Change **base URL**, **model**, and **API key** in settings for any OpenAI-compatible endpoint.

| Field | Default |
|---|---|
| Base URL | `https://api.beatapi.io/v1` |
| Model | `deepseek-v4.1-flash` |
| API key | empty — paste in the side panel |

**No API keys are bundled.**

## Product catalogue

Open-source builds ship a single **Example Product** stub in `src/lib/product-catalog.ts`.

For private use, put your real notes in `local/product-catalog.ts` (gitignored). Local builds prefer that file automatically.

## Install from source

```bash
git clone https://github.com/BeatAPI/x-reply-plugin.git
cd x-reply-plugin
npm install
npm run build
```

Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `extension-dist` (or `.output/chrome-mv3`).

Prefer `npm run build:ext` to rebuild and sync `extension-dist/`.

## Usage

1. Open a specific X post or Reddit thread and refresh.
2. Open the side panel from the extension icon.
3. Add your text-API key in settings.
4. Generate, edit, then **Fill** — click Reply yourself on the page.

## License

MIT — see `LICENSE`.
