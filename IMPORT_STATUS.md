# RAUSO GitHub import status

The original RAUSO 2.2 ZIP has 33 source files. The Android foundation and build workflow were uploaded previously. As of this update, the existing JavaScript application, HTML template, CSS styles, graphics and SQL migration assets still need to be imported intact. **Do not distribute the APK until the assets and build are verified.**

Required assets: `app/src/main/assets/index.html`, `app.js`, `style.css`, `neon-flora-left.svg`, `neon-flora-right.svg`. Database SQL files belong under `backend/`; there must be no real Supabase credentials committed.

The GitHub workflow intentionally fails while those assets are missing. After upload, check Actions, the APK artifact, and test it on a device.
