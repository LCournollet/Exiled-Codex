# Logo

`logo.png` is the application logo (a dark grimoire/vault with a central red-orange gem,
skill-tree motifs and an archive aesthetic). It is used in the sidebar, the welcome screen
and the app/window icon.

## Replacing the logo with your final art

1. Replace **`assets/logo/logo.png`** with your image (square, ideally 512×512 or larger, PNG).
2. Replace the renderer copy used by the UI: **`src/renderer/src/assets/logo.png`**.
3. Replace the build icons:
   - **`build/icon.png`** and **`resources/icon.png`** (512×512 PNG).
   - For a crisp Windows installer icon, also provide **`build/icon.ico`** (256×256). Then set
     `win.icon: build/icon.ico` in `electron-builder.yml`.

No code changes are required — every reference points at these files. The display name is
controlled separately in `src/shared/appInfo.ts` (`APP_NAME`).
