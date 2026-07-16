<div align="center">
<table>
<tbody>
<td align="center">
<br>
<sub>
  
  [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://choosealicense.com/licenses/gpl-3.0/)&nbsp;&nbsp;&nbsp;
  ![Maintenance](https://img.shields.io/maintenance/yes/2026?style=for-the-badge)&nbsp;&nbsp;&nbsp;
  ![Extension Version](https://img.shields.io/github/package-json/v/esteban-cz/shadcn-plus/master?style=for-the-badge&label=Version)&nbsp;&nbsp;&nbsp;
  ![GitHub last commit](https://img.shields.io/github/last-commit/esteban-cz/shadcn-plus?style=for-the-badge)
  
</sub><br><br>
</td>
</tbody>
</table>
</div>

<br>

<div align="center">
  <p style="margin: 0 0 12px 0; font-size: 2.75rem;"><u><b>shadcn/plus</b></u></p>
  <img src="https://github.com/esteban-cz/shadcn-plus/blob/main/assets/images/icon.png?raw=true" width="100" height="100" alt="shadcn/plus logo">
</div>

## Features

- Status bar shortcut: bottom-left `shadcn/plus` menu (only visible when a workspace is open).
- Quick actions: install/reinstall CLI, add one or many components, open component docs, reload registry list, open shadcn/ui docs.
- Configurable working directory for shadcn/ui commands (relative or absolute, great for monorepos).
- Adaptive CLI action: shows `Install CLI` before initialization, and `Reinstall CLI` when `components.json` already exists.
- Registry caching and a dedicated Output channel for clean command logs.
- Non-interactive init and component installation without temporary terminals.

---

## Demo

![Demo video of installing the CLI.](https://github.com/esteban-cz/shadcn-plus/blob/main/assets/demo/videos/install-cli.gif?raw=true)

## shadcn/plus Menu

![To open the shadcn/ui Plus menu, click on the extension in the bottom left corner.](https://github.com/esteban-cz/shadcn-plus/blob/main/assets/demo/menu.png?raw=true)

## Install or Reinstall the shadcn/ui CLI

![Open the shadcn/ui Plus menu and select "Install CLI" or "Reinstall CLI"](https://github.com/esteban-cz/shadcn-plus/blob/main/assets/demo/install-cli.png?raw=true)

## Add Component

![Open the shadcn/ui Plus menu and select "Add Component"](https://github.com/esteban-cz/shadcn-plus/blob/main/assets/demo/add-component.png?raw=true)

## Add Multiple Components

![Open the shadcn/ui Plus menu and select "Add Multiple Components"](https://github.com/esteban-cz/shadcn-plus/blob/main/assets/demo/add-components.png?raw=true)

---

## Settings

- `shadcn-plus.commandWorkingDirectory` (string): optional working directory for shadcn/ui commands. Leave blank to use the workspace root; relative paths resolve from the first workspace folder; absolute paths are supported.
- `shadcn-plus.componentLibrary` (string): component library passed to `shadcn/ui init`. Options: `base` (default and recommended) or `radix`.
- `shadcn-plus.askComponentLibrary` (boolean): prompt for the component library each time before running `shadcn/ui init`.
- `shadcn-plus.preset` (string): preset passed to `shadcn/ui init`. Options: `vega`, `nova` (default), `maia`, `lyra`, `mira`, `luma`, `sera`, or `rhea`.
- `shadcn-plus.askPreset` (boolean): prompt for the preset each time before running `shadcn/ui init`.

---

## Release Notes

## v1.0.7

- Updated initialization for the latest shadcn CLI with Base/Radix component-library and preset selection.
- Added the current Vega, Nova, Maia, Lyra, Mira, Luma, Sera, and Rhea presets.
- Added Yarn CLI commands and modern Bun lockfile detection.
- Updated registry parsing for the current `registry:ui` schema.
- Added Data Table, Date Picker, deprecated Toast, and Typography/Typeset to the documentation picker.
- Made the component-list reload action clear both extension and language-model caches.
- Moved shadcn commands from temporary terminals to the dedicated `shadcn/plus` Output channel.

## v1.0.6

- Updated dependencies
- Updated `components.json` validation

## v1.0.5

- README.md update

## v1.0.4

- Added adaptive CLI menu behavior: show `Install CLI` before setup and `Reinstall CLI` once `components.json` exists.
- Added reinstall confirmation when `components.json` is already present.
- Added command sanitization for component install names before command execution.
- Improved registry fetch reliability with HTTP status checks, timeout handling, and retry backoff.
- Improved terminal execution fallback behavior when shell integration is unavailable.
- Added configurable terminal auto-close behavior for extension-created command terminals.
- Updated docs to reflect install/reinstall CLI behavior.

### 1.0.3

- Rename the extension from `shadcn/ui Plus` to `shadcn/plus` for consistency and simplicity.

### 1.0.2

- Codebase cleanup.
- Minor code changes.

### 1.0.1

- Added configurable working directory so init/add commands run where your `package.json` lives (supports monorepos and non-root layouts).
- Package manager detection and init guard now respect the configured working directory.

### 1.0.0

- Added status bar menu for shadcn/ui actions.
- Added base color configuration and optional prompt for `init`.
- Guarded init when `components.json` already exists.
- Created component install, multi-add, docs shortcuts, and registry reload.

---

**Enjoy!**
