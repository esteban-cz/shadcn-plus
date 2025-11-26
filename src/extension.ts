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

import {
  getInitCmd,
  getInstallCmd,
  getComponentDocLink,
  getRegistry,
  shadCnDocUrl
} from './utils/registry'
import { executeCommand, getFileStat } from './utils/vscode'
import { logCmd } from './utils/logs'
import type { BaseColor, Components } from './utils/registry'

const commands = {
  initCli: 'shadcn-ui.initCli',
  addNewComponent: 'shadcn-ui.addNewComponent',
  addMultipleComponents: 'shadcn-ui.addMultipleComponents',
  gotoComponentDoc: 'shadcn-ui.gotoComponentDoc',
  reloadComponentList: 'shadcn-ui.reloadComponentList',
  gotoDoc: 'shadcn-ui.gotoDoc',
  showMenu: 'shadcn-ui.showMenu'
} as const
type CommandKey = keyof typeof commands
const baseColorValues: BaseColor[] = [
  'neutral',
  'gray',
  'zinc',
  'stone',
  'slate'
]
const baseColorQuickPickItems: Array<
  vscode.QuickPickItem & { value: BaseColor }
> = baseColorValues.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value
}))
const normalizeBaseColor = (color?: string): BaseColor => {
  const normalized = (color ?? '').toLowerCase()
  if (baseColorValues.includes(normalized as BaseColor)) {
    return normalized as BaseColor
  }
  return 'zinc'
}

class GetShadcnComponentListTool implements vscode.LanguageModelTool<{}> {
  private static registryCache: { data: Components; timestamp: number } | null =
    null
  private static readonly cacheTtl = 5 * 60 * 1000 // 5 minutes

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<{}>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      if (token.isCancellationRequested) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('Operation was cancelled')
        ])
      }

      const now = Date.now()
      if (
        GetShadcnComponentListTool.registryCache &&
        now - GetShadcnComponentListTool.registryCache.timestamp <
          GetShadcnComponentListTool.cacheTtl
      ) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            JSON.stringify(GetShadcnComponentListTool.registryCache.data)
          )
        ])
      }

      const components = await getRegistry()

      if (token.isCancellationRequested) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('Operation was cancelled')
        ])
      }

      if (!components) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            'Failed to fetch component list from shadcn/ui registry'
          )
        ])
      }

      // cache the components
      GetShadcnComponentListTool.registryCache = {
        data: components,
        timestamp: Date.now()
      }

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(components))
      ])
    } catch (error) {
      if (token.isCancellationRequested) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('Operation was cancelled')
        ])
      }
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Error fetching components: ${error}`)
      ])
    }
  }
}

interface InstallComponentInput {
  id: string[]
}

class InstallShadcnComponentTool
  implements vscode.LanguageModelTool<InstallComponentInput>
{
  // regex patterns to clean up the output from install commands
  private static readonly ansiRegex =
    /([\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]|\u001B|\u0007)/gu
  private static readonly spinnerRegex = /^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s/g
  private static readonly vscodeShellRegex = /]633;C|/g
  private static readonly newTerminal = true

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<InstallComponentInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      // check if we've been cancelled
      if (token.isCancellationRequested) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('Operation was cancelled')
        ])
      }

      const { id } = options.input

      if (!id || !Array.isArray(id) || id.length === 0) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            'No component names provided. Please specify component name(s) to install.'
          )
        ])
      }

      const installCmd = await getInstallCmd(id)

      const [terminal, execution, stream] = await executeCommand(
        installCmd,
        InstallShadcnComponentTool.newTerminal
      )
      if (!execution || !stream) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            'Failed to execute the installation command.'
          )
        ])
      }
      await logCmd(installCmd)
      const output: string[] = []
      const componentList = id.join(', ')
      let duplicateCount = 0
      let lastLine = ''

      try {
        for await (let line of stream) {
          if (token.isCancellationRequested) {
            break
          }

          // clean up the line before pushing it to the output
          line = line
            // first regex to remove ANSI escape codes/bash colors
            .replace(InstallShadcnComponentTool.ansiRegex, '')
            // second regex to remove the spinners
            .replace(InstallShadcnComponentTool.spinnerRegex, '')
            // third regex to remove VSCode shell integration stuff
            .replace(InstallShadcnComponentTool.vscodeShellRegex, '')
            .trim()
          if (line === '') {
            continue
          }
          if (line === output[output.length - 1]) {
            duplicateCount++
            lastLine = line
            continue // skip duplicate lines
          }
          // add indication for duplicate
          if (duplicateCount > 0) {
            const lastOutputIndex = output.length - 1
            output[lastOutputIndex] = `${lastLine} [x${duplicateCount + 1}]`
            duplicateCount = 0
          }
          output.push(line)
        }
      } finally {
        if (terminal && InstallShadcnComponentTool.newTerminal) {
          // close the terminal if it was created for us
          terminal.dispose()
        }
      }
      if (duplicateCount > 0) {
        const lastOutputIndex = output.length - 1
        output[lastOutputIndex] = `${lastLine} [x${duplicateCount + 1}]`
      }

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify({
            output: output.join('\n'),
            command: installCmd,
            componentList
          })
        )
      ])
    } catch (error) {
      if (token.isCancellationRequested) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('Operation was cancelled')
        ])
      }
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error installing components: ${error}`
        )
      ])
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  let registryData: Components | undefined

  const hasWorkspace = (): boolean =>
    Boolean(vscode.workspace.workspaceFolders?.length)

  const ensureWorkspace = (): boolean => {
    if (hasWorkspace()) {
      return true
    }

    vscode.window.showWarningMessage(
      'Open a folder or workspace to use shadcn/ui commands.'
    )
    return false
  }

  const checkRegistryData = async (): Promise<boolean> => {
    if (registryData) {
      return true
    }

    const newRegistryData = await getRegistry()
    if (!newRegistryData) {
      vscode.window.showErrorMessage('Can not get the component list')
      return false
    }

    registryData = newRegistryData
    return true
  }

  const quickPickItems: Array<vscode.QuickPickItem & { command: CommandKey }> =
    [
      {
        label: 'Install CLI',
        description: 'Install the shadcn/ui CLI',
        command: 'initCli'
      },
      {
        label: 'Add Component',
        description: 'Add a single shadcn/ui component',
        command: 'addNewComponent'
      },
      {
        label: 'Add Multiple Components',
        description: 'Install more than one component at once',
        command: 'addMultipleComponents'
      },
      {
        label: 'Open Component Docs',
        description: 'Open documentation for a specific component',
        command: 'gotoComponentDoc'
      },
      {
        label: 'Reload Component List',
        description: 'Refresh the locally cached registry list',
        command: 'reloadComponentList'
      },
      {
        label: 'Open Documentation',
        description: 'Open the shadcn/ui documentation site',
        command: 'gotoDoc'
      }
    ]

  const toolDisposables = [
    vscode.lm.registerTool(
      'get_shadcnComponentList',
      new GetShadcnComponentListTool()
    ),
    vscode.lm.registerTool(
      'install_shadcnComponent',
      new InstallShadcnComponentTool()
    )
  ]

  const disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand(commands.showMenu, async () => {
      if (!ensureWorkspace()) {
        return
      }

      const selected = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: 'Choose a shadcn/ui action'
      })

      if (!selected) {
        return
      }

      await vscode.commands.executeCommand(commands[selected.command])
    }),

    vscode.commands.registerCommand(commands.initCli, async () => {
      if (!ensureWorkspace()) {
        return
      }

      const componentsFile = await getFileStat('components.json')
      if (componentsFile) {
        vscode.window.showInformationMessage(
          'shadcn/ui is already initialized (components.json found). Skipping init.'
        )
        return
      }

      const config = vscode.workspace.getConfiguration('shadcn-ui')
      const askBaseColor = config.get<boolean>('askBaseColor', false)
      let baseColor = normalizeBaseColor(
        config.get<string>('baseColor', 'zinc')
      )

      if (askBaseColor) {
        const selectedBaseColor = await vscode.window.showQuickPick(
          baseColorQuickPickItems,
          {
            placeHolder: 'Select base color for shadcn/ui'
          }
        )

        if (!selectedBaseColor) {
          return
        }

        baseColor = selectedBaseColor.value
      }

      const intCmd = await getInitCmd(baseColor)

      executeCommand(intCmd)
      await logCmd(intCmd)
    }),

    vscode.commands.registerCommand(commands.addNewComponent, async () => {
      if (!ensureWorkspace()) {
        return
      }

      const hasRegistryData = await checkRegistryData()
      if (!hasRegistryData || !registryData) {
        return
      }

      const selectedComponent = await vscode.window.showQuickPick(
        registryData,
        {
          matchOnDescription: true
        }
      )

      if (!selectedComponent) {
        return
      }

      const installCmd = await getInstallCmd([selectedComponent.label])

      executeCommand(installCmd)
      await logCmd(installCmd)
    }),

    vscode.commands.registerCommand(
      commands.addMultipleComponents,
      async () => {
        if (!ensureWorkspace()) {
          return
        }

        const hasRegistryData = await checkRegistryData()
        if (!hasRegistryData || !registryData) {
          return
        }

        const selectedComponents = await vscode.window.showQuickPick(
          registryData,
          {
            matchOnDescription: true,
            canPickMany: true
          }
        )

        if (!selectedComponents) {
          return
        }

        const selectedComponent = selectedComponents.map(
          (component: { label: string }) => component.label
        )
        const installCmd = await getInstallCmd(selectedComponent)

        executeCommand(installCmd)
        await logCmd(installCmd)
      }
    ),

    vscode.commands.registerCommand(commands.gotoComponentDoc, async () => {
      const hasRegistryData = await checkRegistryData()
      if (!hasRegistryData || !registryData) {
        return
      }

      const selectedComponent = await vscode.window.showQuickPick(
        registryData,
        {
          matchOnDescription: true
        }
      )

      if (!selectedComponent) {
        return
      }

      const componentDocLink = getComponentDocLink(selectedComponent.label)

      vscode.env.openExternal(vscode.Uri.parse(componentDocLink))
      await logCmd(componentDocLink)
    }),
    vscode.commands.registerCommand(commands.reloadComponentList, async () => {
      registryData = undefined
      const hasRegistryData = await checkRegistryData()
      if (!hasRegistryData) {
        return
      }

      vscode.window.showInformationMessage('shadcn/ui: Reloaded components')
      await logCmd('reload registry data')
    }),
    vscode.commands.registerCommand(commands.gotoDoc, async () => {
      vscode.env.openExternal(vscode.Uri.parse(shadCnDocUrl))
      await logCmd(shadCnDocUrl)
    })
  ]

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  )
  statusBarItem.text = '$(extensions) shadcn/ui $(diff-added)'
  statusBarItem.tooltip = 'Open shadcn/ui commands'
  statusBarItem.command = commands.showMenu
  const updateStatusBarVisibility = () => {
    if (hasWorkspace()) {
      statusBarItem.show()
    } else {
      statusBarItem.hide()
    }
  }
  updateStatusBarVisibility()

  context.subscriptions.push(
    statusBarItem,
    vscode.workspace.onDidChangeWorkspaceFolders(updateStatusBarVisibility),
    ...disposables,
    ...toolDisposables
  )
}

// This method is called when your extension is deactivated
export function deactivate() {}
