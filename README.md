This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Personal Deployment

This app stores uploaded study materials, notes, plans, and progress in a
local SQLite database at:

```text
data/learn-ai.db
```

For personal cloud use, deploy to a service that supports a persistent disk or
volume, then keep the app's `data` directory on that disk.

Recommended settings:

- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Required environment variables:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL=gemini-2.0-flash`
- Persistent disk mount path:
  - Render: mount to the project `data` directory, for example
    `/opt/render/project/src/data`
  - Railway: mount a volume to the app `data` directory used by the service

Vercel is convenient for ordinary Next.js apps, but this app needs persistent
file storage for SQLite and uploaded learning data. Use Vercel only after
moving the database and file storage to managed services.

For Google Cloud, start with Compute Engine because it can keep the current
SQLite database on a persistent disk. See:

```text
docs/google-cloud-deploy.md
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
