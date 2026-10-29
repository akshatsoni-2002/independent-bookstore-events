# Independent Bookstore Events Page — TRD Acceptance Checklist

## Implemented in this static proof of concept
- [x] Semantic HTML landmarks, skip link, responsive layout, visible keyboard focus, and reduced-motion support.
- [x] Search and category/date filters update locally without a network request.
- [x] Empty result state explicitly says “No data found”.
- [x] Visible loading state during initial event load and event create/update.
- [x] Field-level validation prevents invalid event and contact-form submissions; invalid fields receive `aria-invalid`, associated error text, focus, and red borders.
- [x] Text from event/staff/contact inputs is normalized and stripped of markup/control characters before use where relevant; user text is rendered through DOM text APIs, not inserted as HTML.
- [x] Analytics messages use the required `[Analytics] User interacted with Independent Bookstore Events Page` prefix for primary actions.
- [x] Grayscale-only design tokens and neutral visual surfaces; red is reserved for validation errors.
- [x] Vanilla HTML/CSS/JavaScript; no framework or external UI library.
- [x] Offline/online notice and a service worker app-shell cache for repeat visits on supported HTTPS/localhost deployments.
- [x] `node --check script.js` and `node --check sw.js` pass.
- [x] Static audit found no duplicate HTML IDs and no form controls missing explicit labels.

## Required before final client sign-off
- [ ] Run Lighthouse in Chrome against the actual deployed URL and verify the accessibility score reaches 100; fix any findings.
- [ ] Complete manual keyboard/screen-reader checks and verify contrast at every state.
- [ ] Test event create/edit/delete/undo and CSV/XLS/PDF exports in the target browsers.
- [ ] Test offline after the service worker has installed, and test slow-network throttling in DevTools.
- [ ] Run the team's configured ESLint version and resolve all warnings. ESLint was not available in this build environment, so a zero-warning ESLint result is not claimed.
- [ ] Publish to the user's GitHub repository and deploy to Netlify/Vercel; insert real links into the ticket after deployment.

## Scope and security note
This static POC uses browser storage. It does not provide shared cross-device records, server-side authorization, secure account storage, or central backups. A shared, production system requires a backend/database, appropriate access controls, and server-side validation. Do not treat the POC as production-secure.


## Additional implementation hardening
- [x] No login or account setup required; event management is accessible directly as authentication is not specified in the TRD.
- [x] Spreadsheet formula-injection mitigation for CSV and Excel-compatible HTML exports.
- [x] Centralized grayscale color tokens and explicit error color token.
- [x] Service-worker network timeout with cached app-shell fallback and background refresh for cached assets.
- [x] Explicitly documented no-login prototype and browser-local storage limitations.
- [ ] Browser/Lighthouse/ESLint audits must still be performed by the submitter.
