# Food Tracker

Mobile-first Food Tracker powered by a Gemini estimate of whole foods percentage.

## Local setup

```sh
npm install
cp .env.example .env
```

Edit `.env` and add your `GEMINI_API_KEY`. (Do not commit your key.)

Run the database migration:

```sh
npx prisma migrate dev --name init
```

Start the dev server:

```sh
npm run dev
```

## Production (Vercel)

This app uses SQLite via Prisma. For production persistence on Vercel, use a hosted SQLite provider (e.g. Turso/libSQL) and set:

- `DATABASE_URL`
- `GEMINI_API_KEY`

Then deploy:

```sh
vercel --prod
```
