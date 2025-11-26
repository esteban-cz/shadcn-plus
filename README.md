<div align="center">
<table>
<tbody>
<td align="center">
<br>
<sub>
  
  [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://choosealicense.com/licenses/gpl-3.0/)&nbsp;&nbsp;&nbsp;
  ![Maintenance](https://img.shields.io/maintenance/yes/2025?style=for-the-badge)&nbsp;&nbsp;&nbsp;
  ![Extension Version](https://img.shields.io/github/package-json/v/esteban-cz/shadcn-plus/master?style=for-the-badge&label=Version)&nbsp;&nbsp;&nbsp;
  ![GitHub last commit](https://img.shields.io/github/last-commit/esteban-cz/shadcn-plus?style=for-the-badge)
  
</sub><br><br>
</td>
</tbody>
</table>
</div>

<br>

<div align="center">
  <p style="margin: 0 0 12px 0; font-size: 2.75rem;"><u><b>shadcn/ui Plus</b></u></p>
  <img src="assets/images/icon.png" width="100" height="100" alt="shadcn/ui Plus logo">
</div>

## Features

- Status bar shortcut: bottom-left `shadcn/ui` menu (only visible when a workspace is open).
- Quick actions: install CLI, add one or many components, open component docs, reload registry list, open shadcn/ui docs.
- CLI install guard: skip init when `components.json` already exists.
- Registry caching and terminal output cleanup for clearer component installs.

---

## Settings

- `shadcn-ui.baseColor` (string): default base color passed to `shadcn/ui init`. Options: `neutral`, `gray`, `zinc` (default), `stone`, `slate`.
- `shadcn-ui.askBaseColor` (boolean): prompt for base color each time before running `shadcn/ui init`.

---

## Release Notes

### 1.0.0
- Added status bar menu for shadcn/ui actions.
- Added base color configuration and optional prompt for `init`.
- Guarded init when `components.json` already exists.
- Created component install, multi-add, docs shortcuts, and registry reload.

---

**Enjoy!**
