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
import { spawn } from 'child_process'

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
export type ExecutableCommand = {
  command: string
  args: string[]
}

const formatArgument = (argument: string): string =>
  /^[a-z0-9@/_.:-]+$/i.test(argument) ? argument : JSON.stringify(argument)

export const formatCommand = (command: ExecutableCommand): string =>
  [command.command, ...command.args].map(formatArgument).join(' ')

export async function executeCommand(
  executable: ExecutableCommand,
  cwd: vscode.Uri,
  output: vscode.OutputChannel,
  token?: vscode.CancellationToken
): Promise<string> {
  if (token?.isCancellationRequested) {
    throw new Error('Operation was cancelled')
  }

  output.show(true)
  output.appendLine(`> ${formatCommand(executable)} (cwd: ${cwd.fsPath})`)

  return new Promise<string>((resolve, reject) => {
    const child = spawn(executable.command, executable.args, {
      cwd: cwd.fsPath,
      shell: process.platform === 'win32'
    })
    let commandOutput = ''
    let settled = false

    const appendOutput = (data: Buffer): void => {
      const text = data.toString()
      commandOutput += text
      output.append(text)
    }

    child.stdout?.on('data', appendOutput)
    child.stderr?.on('data', appendOutput)

    const cancellationDisposable = token?.onCancellationRequested(() => {
      child.kill()
    })

    const finish = (error?: Error): void => {
      if (settled) {
        return
      }

      settled = true
      cancellationDisposable?.dispose()
      output.appendLine('')

      if (error) {
        reject(error)
      } else {
        resolve(commandOutput)
      }
    }

    child.on('error', (error) => {
      finish(error)
    })

    child.on('close', (code) => {
      if (token?.isCancellationRequested) {
        finish(new Error('Operation was cancelled'))
      } else if (code === 0) {
        finish()
      } else {
        finish(
          new Error(
            `${formatCommand(executable)} exited with code ${code ?? 'unknown'}`
          )
        )
      }
    })
  })
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
  const bunLockExists =
    (await getFileStat('bun.lock', baseUri)) ??
    (await getFileStat('bun.lockb', baseUri))
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
