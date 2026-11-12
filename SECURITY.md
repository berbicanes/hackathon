# Security

Late Bloomers is a static site with no server, database, accounts or analytics. Squad
files are read and analysed in the browser and never leave the device.

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
- CI on every push: dependency audit, lint, type check, unit tests with a coverage floor,
  end-to-end journey, and a smoke check of the deployed site.
