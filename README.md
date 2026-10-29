# Chapter & Co. — Independent Bookstore Events

A responsive Independent Bookstore Events Page proof of concept. Built with semantic HTML5, CSS, and vanilla JavaScript.
## Live Demo

**Live Website:** https://prodesk-bookstore-event.netlify.app

**GitHub Repository:** https://github.com/akshatsoni-2002/independent-bookstore-events

## Public website
- The public homepage opens first. No login or account setup is required, because authentication is not specified in the supplied TRD.
- Monochromatic corporate design system using neutral grayscale surfaces, typography, borders, and book-inspired visuals; responsive layout and reduced-motion-aware animations. Spacing tokens use a 16px rhythm with 32px section steps. Red is reserved for validation errors.
- Light/dark mode toggle in the navigation.
- Internal About, Contact, and Privacy pages.
- Contact form validates fields and explains that it does not send email in the static demo.

## Event management
- Use **Manage events** in the navigation to jump to the event submission and management tools.
- Create, edit, delete, search, filter, and export events directly without logging in.
- Event exports include Excel-compatible CSV, Excel-openable `.xls` HTML table, and print/save-as-PDF.
- Event deletion includes confirmation and a short undo option.
- Records are stored in this browser only. Different users/devices do not share event records in this static prototype.

## Local run
1. Extract the ZIP.
2. Open `bookstore-events` in VS Code.
3. Run `index.html` with Live Server (localhost is required for Web Crypto and service workers).
4. Click **Manage events** in the navbar to reach the event management form. No login is required.
5. Optional developer checks: run `npm install`, then `npm run check`, `npm run verify`, and `npm run lint`. ESLint is a development-only dependency; the website itself has no framework/runtime dependency.

## Critical production limitation
This is a **static proof of concept**. There is no authentication because it is not specified in the supplied TRD. Event records and saved-event preferences are stored in browser storage and are not shared across devices. There is no shared database, real email delivery, central audit log, or automatic backup. Do not use confidential client information.

A real sellable client service requires a backend/API, database, server-side password hashing, secure sessions, role-based authorization enforced server-side, backups, audit logs, monitoring, rate limiting, privacy/retention policies, and deployment security. Before launch, test all flows, keyboard accessibility, screen readers, exports, and responsive layouts, then run Lighthouse and a security review.


## TRD acceptance notes
- Color literals are centralized into a grayscale token palette; red is reserved for invalid-field feedback. The stylesheet uses a documented spacing scale, with 16px/32px used for common layout rhythm.
- Empty search results display the explicit “No data found” state. Event loading and save/edit operations show a visible status indicator.
- Browser online/offline events display a visible connectivity notice; because this is a static app, offline mode does not imply server sync.
- Form fields are validated before writes. Invalid fields receive `aria-invalid`, associated error text, focus, and a red border. User-entered event text is normalized and markup characters are stripped before storage; rendered content is inserted with DOM text APIs, not user-controlled HTML.
- Analytics messages use the required `[Analytics] User interacted with Independent Bookstore Events Page` prefix for primary interactions.
- Keyboard focus styles, a skip link, semantic landmarks, status announcements, accessible names, and reduced-motion support are included.

## Verification status
Run `node --check script.js` to check JavaScript syntax. This ZIP does not claim a measured 100% Lighthouse score: run Lighthouse in Chrome against the deployed page and resolve any findings before submitting. This is a static proof of concept, so it has no shared server database or secure server-side authentication. A GitHub repository and live deployment must be created separately; they are not included as fabricated links.

See `ACCEPTANCE-CHECKLIST.md` for implemented acceptance criteria, local checks, and items that still require a deployed-browser audit. The service worker caches the static app shell for repeat visits on supported HTTPS/localhost deployments, serves cached assets quickly on flaky connections, and falls back to the cached page when navigation fails. It does not synchronize records or replace a server database. Since this static POC has no authentication or shared database, do not use it as a production multi-user system.


## Data and security note
No login is required. Event data is local to the browser running the prototype; clearing browser storage may remove demo records. A production multi-user system needs a shared database, server-side validation and access controls, backups, and a security review. Do not store confidential client information in this prototype.

## Reliability and security improvements in this build
- No login credentials or password storage are required by this no-login prototype.
- Event and staff form text is normalized and inserted into the DOM as text; export paths escape HTML and prefix spreadsheet formula-like values.
- Service-worker navigation falls back to the cached app shell after a short network timeout; cached static assets remain available during transient outages.
- Browser storage failures produce visible feedback rather than being treated as successful durable saves.
