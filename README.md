# Victor Alabi Daniel — Portfolio

A standard Next.js portfolio prepared for GitHub and Vercel. It preserves the editorial paper palette, burnt-orange accent, responsive layout, light/dark theme toggle, project list, and scroll reveals.

## Before publishing

1. Add your portrait image as `public/portrait.png`. The original Floot portrait is hosted inside Floot's asset storage and is not automatically transferable to this project. Without it, the page shows a clean initials fallback.
2. Review the project links in `app/page.jsx`—Ascii-Art and VicFungo currently link to your GitHub profile because their exact repository URLs have not been confirmed.
3. Review the email address in `app/page.jsx`.

## Run locally

Install Node.js 20 or newer, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Create a GitHub repository named `victor-portfolio`.
2. Upload the contents of this folder to the repository (the files should be at the repository root, not nested inside another folder).
3. In Vercel, choose **Add New → Project**, import `victor-portfolio`, and keep the detected Next.js settings.
4. Click **Deploy**. Vercel will build the project and provide the live URL.

The project is configured for Vercel's standard Next.js deployment; no custom server configuration is required.
