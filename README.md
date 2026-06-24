# WorkTrace

A professional work location tracking app built for small teams.

## File Structure

```
worktrace/
├── index.html    — Page structure (HTML only, ~17 KB)
├── style.css     — All styling, themes, responsive layouts (~42 KB)
├── app.js        — All application logic (~99 KB)
└── vercel.json   — Security headers for deployment
```

## index.html
The HTML skeleton — all views, buttons, modals, and the nav bar.
No styling or logic — just structure.

## style.css
All visual styling including:
- Dark / Light theme
- Accent colour system
- Responsive layouts for iPhone, Android, iPad, Desktop
- Location card images and overlays
- All component styles (modals, toasts, nav, etc.)

## app.js
All JavaScript logic including:
- Supabase config (URL + anon key)  ← edit lines 1-2
- Role system (admin/employer emails) ← edit ROLE_MAP
- Location and supply data
- Auth (sign in, sign up, sign out)
- Database (save/load work logs)
- Dashboard, Week, Report, Schedule, Requests

## Setup
1. Create tables in Supabase (see SQL below)
2. Edit `app.js` lines 1-2 with your Supabase URL and anon key
3. Edit `ROLE_MAP` in `app.js` to set admin/employer emails
4. Deploy all 4 files to Vercel

## Role Map (in app.js)
```js
const ROLE_MAP={
  'admin@yourdomain.com': 'admin',
  'manager@yourdomain.com': 'employer',
};
```
Everyone else is automatically `employee`.

## Created by D.Y.D Lokuge
