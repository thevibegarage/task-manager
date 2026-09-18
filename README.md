# Task Manager

A very simple task manager: add tasks, mark them complete, filter, and clear completed. No backend — tasks persist in the browser's `localStorage`.

## Run locally

Just open `index.html` in a browser, or serve it with any static server:

```bash
npx serve .
```

## Deploy

### GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create task-manager --public --source=. --push
```

### Vercel

This is a static site, so Vercel needs no build step. Either:

- Import the GitHub repo at [vercel.com/new](https://vercel.com/new), or
- Deploy from the CLI:

```bash
vercel
```
