# Foundry backend

Small Express proxy: the frontend never links to GitHub directly. It calls
this API, and this API fetches the file from a **private** GitHub repo and
streams it back to the browser.

## Local setup

```
npm install
ALLOWED_ORIGINS=http://localhost:8888 npm start
```

## Files repo on GitHub

1. Create a **private** repo (e.g. `foundry-files`) — private, since this
   backend is the only thing that should ever fetch from it directly.
2. Put your program files in it, e.g. under a `/files` folder.
3. In `catalog.json`, set `sourceUrl` for each program to its raw file URL:
   `https://raw.githubusercontent.com/<user>/<repo>/main/files/<name>`
4. Because the repo is private, raw.githubusercontent.com will 404 for
   anonymous requests — you need a GitHub **personal access token** with
   `repo` (read) scope so the backend can authenticate. Generate one at
   GitHub → Settings → Developer settings → Personal access tokens.

## Deploy on Render

1. Push this backend folder to its own GitHub repo (this one CAN be public —
   it's just server code, no files in it).
2. Render → New → Web Service → connect that repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment variables:
   - `GITHUB_TOKEN` — the personal access token from above
   - `ALLOWED_ORIGINS` — your Netlify URL, e.g. `https://foundry.netlify.app`
     (comma-separate multiple origins if needed)
6. Deploy. Render gives you a URL like `https://foundry-backend.onrender.com`.

## Wire up the frontend

In the Netlify site's `script.js`, point `API_BASE` at your Render URL
(see the updated frontend files) and the Downloads page will fetch the
catalog and stream files through this backend automatically.

## Notes

- Free Render web services spin down when idle — the first request after
  inactivity can take ~30-60 seconds to wake up. Fine for a small catalog
  site; worth knowing so it doesn't look broken.
- `.py` files download as-is; they won't double-click-run for non-technical
  users without Python installed. Consider noting that on the download card,
  or packaging with PyInstaller if you want a true one-click install.
