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

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
export async function executeCommand(
  cmd: string,
  createNew = true,
  name?: string
): Promise<
  [vscode.Terminal, vscode.TerminalShellExecution?, AsyncIterable<string>?]
> {
  let terminal = vscode.window.activeTerminal
  if (createNew || !terminal) {
    terminal = vscode.window.createTerminal(name ? name : 'shadcn/ui Plus')
  }

  terminal.show()
  if (!terminal.shellIntegration) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        disposable.dispose()
        reject(new Error('Shell integration timeout'))
      }, 5000)

      const disposable = vscode.window.onDidChangeTerminalShellIntegration(
        (e) => {
          if (e.terminal === terminal) {
            clearTimeout(timeout)
            disposable.dispose()
            resolve()
          }
        }
      )

      if (terminal?.shellIntegration) {
        clearTimeout(timeout)
        disposable.dispose()
        resolve()
      }
    })
  }

  if (terminal.shellIntegration) {
    const res = terminal.shellIntegration.executeCommand(cmd)
    const stream = res.read()
    return [terminal, res, stream]
  } else {
    terminal.sendText(cmd)
    vscode.window.onDidStartTerminalShellExecution((e) => {
      const stream = e.execution.read()
      if (e.terminal === terminal) {
        return [terminal, e.execution, stream]
      }
    })
    // if we are hitting this point, something is messed up real bad
    return [terminal, undefined, undefined]
  }
}

export const getFileStat = async (fileName: string) => {
  // Get the currently opened workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders

  if (!workspaceFolders) {
    return null
  }

  for (const workspaceFolder of workspaceFolders) {
    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName)
    try {
      const fileMetadata = await vscode.workspace.fs.stat(filePath)

      return fileMetadata
    } catch (error) {
      console.error(error)
      return null
    }
  }
}

export const detectPackageManager = async (): Promise<PackageManager> => {
  const bunLockExists = await getFileStat('bun.lockb')
  if (bunLockExists) {
    return 'bun'
  }

  const pnpmLockExists = await getFileStat('pnpm-lock.yaml')
  if (pnpmLockExists) {
    return 'pnpm'
  }

  const yarnLockExists = await getFileStat('yarn.lock')
  if (yarnLockExists) {
    return 'yarn'
  }

  return 'npm'
}
