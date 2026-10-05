# SERVE browser end-to-end checks

`run.mjs` drives the **real** staff dashboard, admin portal and student (Flutter
web) app in Chromium against a real backend, PostgreSQL and the Firebase Auth
emulator, and verifies results in the database. It covers sign-up/login for all
roles, staff canteen requests and admin approval, staff menu management, live
menu/price/availability propagation to students, checkout with server-side
totals and mock payment verification, live order status updates, cross-canteen
isolation, paused/inactive canteens, the canteen-switch confirmation, the empty
menu state and logout/login persistence.

## Running locally

```bash
# 1. Firebase Auth emulator (repo root)
npx firebase-tools emulators:start --only auth --project demo-serve

# 2. Fresh database + backend
cd e2e && npm install && ./prepare-db.sh
cd ../backend && DATABASE_URL=postgresql://serve:...@localhost:5432/serve_e2e npm run dev

# 3. Web apps (dev servers use .env.development → emulator + localhost API)
cd ../staff-dashboard && npm run dev -- --port 5173
cd ../admin-portal && npm run dev -- --port 5174

# 4. Student app web build, served on :45678
cd ../student-app && flutter build web --profile --no-web-resources-cdn
cd build/web && python3 -m http.server 45678

# 5. Run
cd ../../../e2e && npm test
```

Screenshots and `results.json` are written to `e2e/artifacts/` (git-ignored).

Notes:
- The run must start from a freshly prepared database (`prepare-db.sh`).
- Do not reload the student web page mid-run: in non-debug web builds FlutterFire
  restores a signed-in user before `useAuthEmulator` can be applied, so a reload
  would send auth calls to production Firebase. This only affects emulator-based
  testing; production builds do not use the emulator.
- When the Firebase JS SDK cannot be fetched from `www.gstatic.com`, the run serves
  the identical files from the `firebase` npm package (see `lib.mjs`).
