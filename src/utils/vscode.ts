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

async function getDeclaredPackageManager(cwd: vscode.Uri): Promise<PackageManager | undefined> {
  try {
    const file = vscode.Uri.joinPath(cwd, 'package.json')
    const contents = Buffer.from(await vscode.workspace.fs.readFile(file)).toString('utf8')
    const { packageManager } = JSON.parse(contents)
    if (typeof packageManager === 'string') {
      const [name] = packageManager.split('@')
      if (name === 'npm' || name === 'pnpm' || name === 'yarn' || name === 'bun') {
        return name
      }
    }
  } catch {
    // Some packages rely on lockfiles or inherit the workspace configuration.
  }
  return undefined
}

const lockfiles: ReadonlyArray<readonly [string, PackageManager]> = [
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
  ['npm-shrinkwrap.json', 'npm']
]

export const detectPackageManager = async (base: vscode.Uri): Promise<PackageManager> => {
  const workspace = vscode.workspace.getWorkspaceFolder(base)?.uri
  let cwd = base

  while (true) {
    const configured = await getDeclaredPackageManager(cwd)
    if (configured) {
      return configured
    }

    const locks = await Promise.all(lockfiles.map(([file]) => getFileStat(file, cwd)))
    const match = lockfiles.find((_, index) =>
      Boolean((locks[index]?.type ?? 0) & vscode.FileType.File)
    )
    if (match) {
      return match[1]
    }

    if (!workspace || cwd.path === workspace.path) {
      return 'npm'
    }
    const parent = path.posix.dirname(cwd.path)
    if (parent === cwd.path) {
      return 'npm'
    }
    cwd = cwd.with({ path: parent })
  }
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

  const stats = await getFileStat('.', targetUri)
  if (!stats || !(stats.type & vscode.FileType.Directory)) {
    void vscode.window.showWarningMessage(
      `Set shadcn-plus.commandWorkingDirectory to an existing directory. Could not use "${configuredPath}".`
    )
    return null
  }
  return targetUri
}
