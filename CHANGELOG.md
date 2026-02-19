# Changelog

## v1.0.5 - 02/19/2026

- README.md update

## v1.0.4 - 02/19/2026

- Added adaptive CLI menu behavior: show `Install CLI` before setup and `Reinstall CLI` once `components.json` exists.
- Added reinstall confirmation when `components.json` is already present.
- Added command sanitization for component install names before command execution.
- Improved registry fetch reliability with HTTP status checks, timeout handling, and retry backoff.
- Improved terminal execution fallback behavior when shell integration is unavailable.
- Added configurable terminal auto-close behavior for extension-created command terminals.
- Updated docs to reflect install/reinstall CLI behavior.

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
