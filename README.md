# MedicalAccountant.ie (Next.js on Cloudflare Workers)

Content from medicalaccountant.ie, design system from medicalfinancialadvisor.ie.
Next.js 16 runs on a Cloudflare Worker through OpenNext, with a D1 database (`migrations/`) and R2 buckets. Config: `wrangler.jsonc`, `open-next.config.ts`.

- `npm run dev`: Next dev server with local D1/R2 (first run `npm run db:migrate`; secrets in `.dev.vars`, see `.dev.vars.example`)
- `npm run preview`: build and run the real Worker locally
- `npm run deploy`: build and deploy (CI does this on every push to `main`)
- `npm test`, `npm run type-check`
- Setup, data migration and day-to-day use: `docs/CMS.md`
- Enquiry form posts to `/api/enquiry`, which forwards JSON to the `ENQUIRY_WEBHOOK_URL` secret (returns 503 until it is set).
- Page/post content lives in `lib/content.json`; shared UI in `components/`.
