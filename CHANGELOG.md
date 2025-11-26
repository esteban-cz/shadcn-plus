# Changelog

## 1.0.1

- Added configurable working directory so init/add commands run where your package.json lives (supports monorepos and non-root layouts).
- Package manager detection and init guard now respect the configured working directory.

## 1.0.0

- Added status bar menu for shadcn/ui actions.
- Added base color configuration and optional prompt for `init`.
- Guarded init when `components.json` already exists.
- Created component install, multi-add, docs shortcuts, and registry reload.
