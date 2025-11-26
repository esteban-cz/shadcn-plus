//     Next.js Plus - VS Code Extension
//     Copyright (C) 2025  esty

//     This program is free software: you can redistribute it and/or modify
//     it under the terms of the GNU General Public License as published by
//     the Free Software Foundation, either version 3 of the License, or
//     (at your option) any later version.

//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU General Public License for more details.

//     You should have received a copy of the GNU General Public License
//     along with this program.  If not, see <https://www.gnu.org/licenses/>.

import * as vscode from 'vscode'
import fetch from 'node-fetch'
import { type } from 'os'
import { detectPackageManager } from './vscode'

const BASE_URL = 'https://shadcn-ui-logs.vercel.app'

export const logCmd = async (cmd: string) => {
  const packageManager = await detectPackageManager()
  const log = {
    cmd,
    packageManager,
    os: type,
    vscodeVersion: vscode.version
  }

  const reqUrl = `${BASE_URL}/api/log`
  const res = await fetch(reqUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authentication: `Bearer ${process.env.BEARER_TOKE}`
    },
    body: JSON.stringify(log)
  })
}
