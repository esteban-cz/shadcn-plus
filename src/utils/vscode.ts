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
import * as path from 'path'

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
let hasShownShellIntegrationWarning = false

const showShellIntegrationWarning = (message: string) => {
  if (hasShownShellIntegrationWarning) {
    return
  }

  hasShownShellIntegrationWarning = true
  vscode.window.showWarningMessage(message)
}

export async function executeCommand(
  cmd: string,
  createNew = true,
  name?: string,
  cwd?: vscode.Uri
): Promise<
  [vscode.Terminal, vscode.TerminalShellExecution?, AsyncIterable<string>?]
> {
  let terminal = vscode.window.activeTerminal
  if (createNew || !terminal) {
    const terminalOptions: vscode.TerminalOptions = {
      name: name ? name : 'shadcn/plus',
      cwd
    }
    terminal = vscode.window.createTerminal(terminalOptions)
  }

  terminal.show()
  if (!terminal.shellIntegration) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        disposable.dispose()
        resolve()
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
    try {
      const res = terminal.shellIntegration.executeCommand(cmd)
      const stream = res.read()
      return [terminal, res, stream]
    } catch (error) {
      console.error('Failed to execute command via shell integration', error)
      showShellIntegrationWarning(
        'shadcn/plus: Shell integration failed, running command with basic terminal mode.'
      )
    }
  }

  terminal.sendText(cmd)
  showShellIntegrationWarning(
    'shadcn/plus: Shell integration is unavailable, so command status cannot be tracked. The terminal will stay open.'
  )
  return [terminal, undefined, undefined]
}

export const getFileStat = async (fileName: string, baseUri?: vscode.Uri) => {
  const workspaceFolders = baseUri
    ? [{ uri: baseUri } as vscode.WorkspaceFolder]
    : vscode.workspace.workspaceFolders

  if (!workspaceFolders) {
    return null
  }

  for (const workspaceFolder of workspaceFolders) {
    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName)
    try {
      const fileMetadata = await vscode.workspace.fs.stat(filePath)

      return fileMetadata
    } catch (error) {
      // try next workspace folder
    }
  }

  return null
}

export const detectPackageManager = async (
  baseUri?: vscode.Uri
): Promise<PackageManager> => {
  const bunLockExists = await getFileStat('bun.lockb', baseUri)
  if (bunLockExists) {
    return 'bun'
  }

  const pnpmLockExists = await getFileStat('pnpm-lock.yaml', baseUri)
  if (pnpmLockExists) {
    return 'pnpm'
  }

  const yarnLockExists = await getFileStat('yarn.lock', baseUri)
  if (yarnLockExists) {
    return 'yarn'
  }

  return 'npm'
}

export const getConfiguredCommandCwd = async (): Promise<vscode.Uri | null> => {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null
  }

  const config = vscode.workspace.getConfiguration('shadcn-plus')
  const configuredPath = config
    .get<string>('commandWorkingDirectory', '')
    .trim()

  const rootUri = workspaceFolders[0].uri
  if (!configuredPath) {
    return rootUri
  }

  const targetUri = path.isAbsolute(configuredPath)
    ? vscode.Uri.file(configuredPath)
    : vscode.Uri.joinPath(rootUri, configuredPath)

  try {
    await vscode.workspace.fs.stat(targetUri)
    return targetUri
  } catch (error) {
    vscode.window.showWarningMessage(
      `Configured shadcn/ui working directory "${configuredPath}" not found. Using workspace root instead.`
    )
    return rootUri
  }
}
