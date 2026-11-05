# MedicalAccountant.ie (Next.js)

Content from medicalaccountant.ie, design system from medicalfinancialadvisor.ie.

- `npm run dev` / `npm run build` / `npm start`
- Enquiry form posts to `/api/enquiry`, which forwards JSON to the `ENQUIRY_WEBHOOK_URL` env var (returns 503 until it is set).
- Page/post content lives in `lib/content.json`; shared UI in `components/`.
