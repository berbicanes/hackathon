# Security

Late Bloomers is a static site with no database, accounts or analytics. Squad files are
read and analysed in the browser and never leave the device. The only server component
is an optional Cloudflare Worker (`/worker`) that turns de-identified numbers into a
short explanation when a coach clicks "Objasni mi (AI)".

## Reporting a problem

Please open an issue at https://github.com/berbicanes/hackathon/issues. If the report
contains sensitive details, open an issue that only says "security report" and ask for a
private channel; do not post personal data or real squad files.

## What is in place

- Content-Security-Policy (scripts only from the site itself), no inline scripts, no
  third-party scripts, styles or fonts: everything is served from the site itself.
- Uploaded CSV files are limited in size and rows, parsed defensively, and names are
  stripped of control characters. Exported CSV cells are protected against spreadsheet
  formula injection.
- CI on every push: dependency audit and type check for the site and for the Worker, lint, unit tests with a coverage floor,
  end-to-end journey, and a smoke check of the deployed site.
- Explanation Worker: requests accepted only from the deployed site's origin, strict
  schema (numbers, booleans and fixed codes only; names and free text are rejected),
  60 requests per hour per IP, no logging, API key held as a Worker secret. The model's
  output is rendered as plain text, never as HTML.
