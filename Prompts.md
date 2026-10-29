# AI Prompt Log

This project was drafted with AI assistance. The implementation should be reviewed and tested before delivery.

## Initial build prompt

Create a polished, responsive Independent Bookstore Events Page using semantic HTML5, pure vanilla CSS, and vanilla JavaScript only. Do not use React, Tailwind, Bootstrap, or external libraries. Use a clean monochromatic corporate design system and consistent spacing based on 8px/16px/32px increments. Include navigation, an editorial hero section, event cards, search and filters, an about section, an event suggestion form, and a footer.

## Edge cases and reliability prompt

Handle empty search results with a clear “No data found” state; show a visible loading indicator for asynchronous operations; validate required and malformed form values and highlight invalid fields in red; ensure browser storage failures do not crash the page; avoid any backend dependency.

## Accessibility and security prompt

Use semantic landmarks, labels, keyboard-operable controls, visible focus states, appropriate ARIA labels and live regions, and reduced-motion support. Sanitize and length-limit text inputs. Never render user-controlled text through `innerHTML`; use safe text nodes. Add a simulated analytics console message for primary interactions.

## Verification checklist

- [ ] Opened the page locally and checked the browser console.
- [ ] Tested search, filters, reset, and the empty state.
- [ ] Tested invalid and valid form submissions.
- [ ] Confirmed submitted event text is displayed as text, not executable HTML.
- [ ] Checked mobile navigation and responsive layout.
- [ ] Checked keyboard navigation and visible focus indicators.
- [ ] Tested Lighthouse accessibility and documented actual results.
- [ ] Verified the public repository and live deployment URL.


## Professional management upgrade
Updated the prototype with event CRUD controls (create, edit, confirmed delete with undo), JSON export, clearer browser-local data notice, improved responsive management controls, and explicit documentation of the backend/authentication work required for production use.
