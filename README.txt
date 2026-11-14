ITIA QUIZ — GOOGLE SHEETS DATABASE SETUP

Files:
- index.html, style.css, script.js, questions.json: quiz website
- ITIA-Quiz-Google-Sheets-Backend.gs: Google Apps Script backend

1) Create a blank Google Sheet.
2) Open Extensions > Apps Script.
3) Replace the editor contents with ITIA-Quiz-Google-Sheets-Backend.gs and save.
4) Deploy > New deployment > select Web app.
   Execute as: Me
   Who has access: Anyone
   Deploy and authorize.
5) Copy the Web app URL (ending /exec).
6) Open script.js and replace:
   PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE
   with your deployed URL, keeping the quotes.
7) Upload the whole quiz folder to your static host again.

Sheet:
The script creates a tab named QuizUsers on first request.
Columns: X Username, Status, Progress JSON, Final Result JSON, Last Updated.
A username is reserved on first start. Completed usernames cannot start again.
Progress is saved after each answer. Returning users resume from the saved answer count.
A completed user sees their stored result card and cannot retry.

IMPORTANT LIMITATIONS:
- Entering an X username does NOT verify ownership. Anyone can type another person's handle. For real identity verification, add X OAuth sign-in.
- Public Apps Script endpoints can be abused. This is a lightweight community quiz database, not a high-security identity system.
- The avatar service may fail or block image export due to cross-origin restrictions; the card uses an initial fallback.
- Keep the Apps Script URL private to your deployment environment where practical. The sheet itself should remain private.
- Do not delete rows if you want to preserve the one-attempt rule.

AVATAR CARD FIX:
The result-card avatar now loads from the X profile via unavatar and an image proxy that supports cross-origin canvas export. The download waits up to 7 seconds for the profile image. If X/unavatar has no public avatar or the service is unavailable, the card falls back to the username initial.


PERSONAL RESULT LINKS + X SHARE PREVIEW (NETLIFY)

The Share on X button now shares a clean profile URL such as:
https://itia-challenge.netlify.app/lemonar77

The /username page is rendered by a Netlify Function so X can read Open Graph/Twitter Card metadata before opening the quiz. The preview image is generated as a PNG by a second Netlify Function.

One-time deployment steps:
1. In the Google Apps Script project, replace Code.gs with the updated Code.gs included here and redeploy the web app (Manage deployments > Edit > New version > Deploy). This adds the read-only publicResult action used for public score cards.
2. In Netlify, set the environment variable APPS_SCRIPT_URL to your deployed Apps Script Web App URL (the same /exec URL used by script.js). Do not put a private key or OAuth secret here.
3. Redeploy the site. Netlify installs @resvg/resvg-js from package.json during its build.
4. Keep the existing Apps Script URL configured in script.js for the quiz database.
5. Test a completed user's URL: https://itia-challenge.netlify.app/username. The X preview image is https://itia-challenge.netlify.app/og/username.png.

PFP NOTE:
The avatar loader now tries two CORS-enabled image proxies and then the direct X avatar source. It keeps a visible initial fallback rather than hiding the top-right/profile-card avatar when the remote image fails. PNG download remains available and waits up to 10 seconds for an exportable avatar. If all remote avatar services block or fail, the score card uses the username initial.

SHARING NOTE:
X generates link previews by crawling the shared URL. The PNG preview is server-rendered; it does not require the recipient to download the score card. The manual Download score card button is retained.
