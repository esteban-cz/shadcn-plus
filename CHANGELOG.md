# Changelog

## v1.0.3 - 11/26/2025

- Rename the extension from `shadcn/ui Plus` to `shadcn/plus` for consistency and simplicity.

## v1.0.2 - 11/26/2025

- Codebase cleanup.
- Minor code changes.

## v1.0.1 - 11/26/2025

- Added configurable working directory so init/add commands run where your package.json lives (supports monorepos and non-root layouts).
- Package manager detection and init guard now respect the configured working directory.

## v1.0.0 - 11/26/2025

- Added status bar menu for shadcn/ui actions.
- Added base color configuration and optional prompt for `init`.
- Guarded init when `components.json` already exists.
- Created component install, multi-add, docs shortcuts, and registry reload.
