# FantAsta 26/27

Due strumenti per l'asta del fantacalcio, Serie A 2026/27:

- **`/studio`** — il tool personale per preparare l'asta: crediti, rosa, obiettivi, «Le mie valutazioni» con il listone ufficiale Fantacalcio.it. È un singolo file statico (`public/studio/index.html`), i dati restano nel browser.
- **Asta in tempo reale** — l'admin crea l'asta da `/admin`, i partecipanti entrano dal QR (`/a/CODICE`) scegliendo la squadra con il PIN, puntano dal telefono con timer che riparte a ogni offerta. `/a/CODICE/board` è la vista da proiettare.

## Come funziona l'asta

- L'admin cerca il giocatore chiamato e apre la chiamata: parte da 1 credito.
- Ogni offerta fa ripartire il timer (default 5 s, configurabile per asta). Il timer è sul server: allo scadere la console admin (o il proiettore) chiede la chiusura e il server assegna il giocatore all'ultima offerta valida.
- Regole di puntata: slot libero nel ruolo, e crediti sufficienti lasciando almeno 1 credito per ogni altro slot da riempire.
- I partecipanti vedono le rose di tutti ma non i crediti: l'admin li rivela per reparto (o del tutto) quando vuole.
- Correzioni: assegnazione manuale, annulla chiamata, annulla assegnazione.

## Stack

Next.js 15 (App Router) · Postgres su Neon via Drizzle (in locale PGlite, senza installare nulla) · Ably per il tempo reale (senza chiave i client fanno polling ogni 1,5 s) · deploy su Vercel.

## Sviluppo locale

```bash
npm install
npm run dev
```

Senza `.env` si entra in `/admin` senza password e il database è PGlite nella cartella temporanea di sistema (`PGLITE_DIR` per cambiarla).

## Deploy su Vercel

1. Importa il repo su Vercel (framework Next.js, nessuna impostazione particolare).
2. Variabili d'ambiente:
   - `ADMIN_PASSWORD` — password della console admin
   - `AUTH_SECRET` — stringa lunga casuale per firmare i cookie
   - `DATABASE_URL` — connection string di Neon (pooled, `sslmode=require`)
   - `ABLY_API_KEY` — chiave Ably (root key va bene: il server crea token di sola lettura per i client)
   - `NEXT_PUBLIC_BASE_URL` — opzionale, es. `https://fantasta.vercel.app`, usato per il QR
3. Le migrazioni del database si applicano da sole al primo avvio. In alternativa: `DATABASE_URL=... npm run db:migrate`.

Se cambi lo schema: `npm run db:generate` e committa la cartella `drizzle/`.

## Listone

`data/listone.json` (531 giocatori, Fantacalcio.it del 6 settembre 2026) è usato dall'asta; lo stesso listone è incorporato in `public/studio/index.html`.
