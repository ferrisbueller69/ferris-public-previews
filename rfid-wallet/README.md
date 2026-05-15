# RFID → Apple Wallet (Prototype)

Single-page site that captures an RFID/NFC chip UID and bundles it into an
Apple Wallet event ticket pass (`.pkpass`).

## What works

- **Web NFC scan** on Android Chrome (uses the `NDEFReader` API)
- **Manual UID entry** fallback for iPhone Safari and other browsers
- Builds a valid `pass.json` with the UID embedded as both serial number
  and QR barcode
- Bundles `pass.json`, `manifest.json`, and generated icon/logo PNGs into
  a `.pkpass` zip — entirely client-side

## What does NOT work (and why)

1. **iPhone Safari cannot read NFC.** The Web NFC API is Chromium-on-Android
   only. Reading NFC on iPhone requires a native iOS app using Core NFC.
2. **The pass is unsigned.** A real `.pkpass` requires a CMS detached
   signature over `manifest.json`, signed with an Apple Pass Type ID
   certificate plus the WWDR intermediate. Without it, iPhone Wallet
   refuses to install the pass. Signing must happen server-side because
   the private key cannot be shipped to a browser.
3. **You cannot add an Apple Pay payment card from a website.** Card
   provisioning is restricted to issuing banks via Apple's PassKit issuer
   program. Event tickets, loyalty cards, coupons, boarding passes etc.
   are fine — payment cards are not.

## Going from prototype → production

To make installable passes you need:

1. Apple Developer Program membership ($99/yr)
2. A Pass Type ID registered at developer.apple.com
3. A Pass Type ID certificate (`.p12`) exported from Keychain
4. The Apple WWDR intermediate certificate
5. A small server endpoint that:
   - takes the UID + pass details from this page
   - builds `pass.json` + manifest
   - signs `manifest.json` with the Pass Type cert (CMS detached, DER)
   - returns the signed `.pkpass`

Node libraries that handle the signing: `passkit-generator`, `@walletpass/pass-js`.

The static page in this folder can stay almost as-is — just swap the
client-side `buildPkpassBlob` call for a `fetch('/api/sign-pass', ...)`
to your signing endpoint.

## Files

- `index.html` — UI
- `style.css` — styling
- `script.js` — Web NFC + pass building (uses JSZip via CDN)
