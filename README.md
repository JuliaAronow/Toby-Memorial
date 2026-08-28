# Toby Memorial

A photo/video gallery site built with React, Vite, and Tailwind CSS. Images and videos are served from a Cloudflare R2 bucket, grouped by date, and rendered in a masonry layout with lazy loading, infinite scroll, and a lightbox.

## Requirements

- [Node.js](https://nodejs.org/) **v20 or later**
- [pnpm](https://pnpm.io/) — this project pins `pnpm@9.14.4` via Corepack.
  If you have Corepack enabled, the correct pnpm version installs
  automatically the first time you run a pnpm command:
  ```bash
  corepack enable
  ```

## Compiling and Viewing the Site

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Run it**
   ```bash
   pnpm dev
   ```
   Open `http://localhost:5173` in your browser to view the site.

That's it — `manifest.json` (the list of photos/videos) is already included in the repo, and images/videos load directly from a public Cloudflare R2 bucket, so no extra setup or credentials are needed.

## Troubleshooting

### Windows: `pnpm : File ... cannot be loaded because running scripts is disabled on this system`

This is a default PowerShell security setting, not a problem with the project. PowerShell blocks `.ps1` scripts (which is how pnpm's command is installed) unless script execution is allowed.

**Fix (one-time):**

1. Open PowerShell **as Administrator**.
2. Run:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
3. Confirm with `Y` when prompted.
4. Close and reopen your terminal, then try `pnpm install` again.

**One-off alternative** (if you'd rather not change the system setting):
```powershell
powershell -ExecutionPolicy Bypass -Command "pnpm install"
```