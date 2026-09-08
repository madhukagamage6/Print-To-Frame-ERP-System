<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/66900443-b6c9-4743-892c-f50b58bf8595

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. For outbound email (enrollment invites, password resets, etc.), also set `SMTP_USER`
   (the sending mailbox, e.g. `info@print2frame.xyz`) and `SMTP_APP_PASSWORD` (a Gmail
   [App Password](https://myaccount.google.com/apppasswords) for that mailbox — not the
   account's normal login password) in `.env.local`. In production these are set as
   Vercel environment variables instead.
4. Run the app:
   `npm run dev`
