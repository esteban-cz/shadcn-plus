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
  getDocumentationComponents,
  getRegistry,
  shadCnDocUrl
} from './utils/registry'
import {
  executeCommand,
  formatCommand,
  getFileStat,
  getConfiguredCommandCwd
} from './utils/vscode'
import type { ExecutableCommand } from './utils/vscode'
import type {
  ComponentLibrary,
  Components,
  Preset
} from './utils/registry'

const commands = {
  initCli: 'shadcn-plus.initCli',
  addNewComponent: 'shadcn-plus.addNewComponent',
  addMultipleComponents: 'shadcn-plus.addMultipleComponents',
  gotoComponentDoc: 'shadcn-plus.gotoComponentDoc',
  reloadComponentList: 'shadcn-plus.reloadComponentList',
  gotoDoc: 'shadcn-plus.gotoDoc',
  showMenu: 'shadcn-plus.showMenu'
} as const
type CommandKey = keyof typeof commands
const componentLibraryValues: ComponentLibrary[] = ['base', 'radix']
const componentLibraryQuickPickItems: Array<
  vscode.QuickPickItem & { value: ComponentLibrary }
> = [
  {
    label: 'Base',
    description: 'Recommended for new projects',
    value: 'base'
  },
  {
    label: 'Radix',
    description: 'Use Radix UI primitives',
    value: 'radix'
  }
]
const presetValues: Preset[] = [
  'vega',
  'nova',
  'maia',
  'lyra',
  'mira',
  'luma',
  'sera',
  'rhea'
]
const presetQuickPickItems: Array<
  vscode.QuickPickItem & { value: Preset }
> = presetValues.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value
}))
const normalizeComponentLibrary = (value?: string): ComponentLibrary => {
  const normalized = (value ?? '').toLowerCase()
  if (componentLibraryValues.includes(normalized as ComponentLibrary)) {
    return normalized as ComponentLibrary
  }
  return 'base'
}
const normalizePreset = (value?: string): Preset => {
  const normalized = (value ?? '').toLowerCase()
  if (presetValues.includes(normalized as Preset)) {
    return normalized as Preset
  }
  return 'nova'
}

class GetShadcnComponentListTool implements vscode.LanguageModelTool<{}> {
  private static registryCache: { data: Components; timestamp: number } | null =
    null
  private static readonly cacheTtl = 5 * 60 * 1000 // 5 minutes

  static clearCache(): void {
    GetShadcnComponentListTool.registryCache = null
  }

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

type MenuQuickPickItem = vscode.QuickPickItem & { command: CommandKey }

class InstallShadcnComponentTool implements vscode.LanguageModelTool<InstallComponentInput> {
  // regex patterns to clean up the output from install commands
  private static readonly ansiRegex =
    /([\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]|\u001B|\u0007)/gu
  private static readonly spinnerRegex = /^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s/g

  constructor(private readonly outputChannel: vscode.OutputChannel) {}

  private static cleanOutput(output: string): string {
    return output
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(InstallShadcnComponentTool.ansiRegex, '')
          .replace(InstallShadcnComponentTool.spinnerRegex, '')
          .trim()
      )
      .filter((line) => line.length > 0)
      .join('\n')
  }

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

      const commandCwd = await getConfiguredCommandCwd()
      if (!commandCwd) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            'Open a folder or workspace to install components.'
          )
        ])
      }

      const installCmd = await getInstallCmd(id, commandCwd)

      const commandOutput = await executeCommand(
        installCmd,
        commandCwd,
        this.outputChannel,
        token
      )
      const componentList = id.join(', ')

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify({
            output: InstallShadcnComponentTool.cleanOutput(commandOutput),
            command: formatCommand(installCmd),
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
  const outputChannel = vscode.window.createOutputChannel('shadcn/plus')

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

  const getInstallCmdWithFeedback = async (
    components: string[],
    cwd: vscode.Uri
  ): Promise<ExecutableCommand | null> => {
    try {
      return await getInstallCmd(components, cwd)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid component name provided.'
      vscode.window.showErrorMessage(
        `Failed to build install command: ${message}`
      )
      return null
    }
  }

  const executeCommandWithFeedback = async (
    command: ExecutableCommand,
    cwd: vscode.Uri,
    label: string
  ): Promise<void> => {
    try {
      await executeCommand(command, cwd, outputChannel)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      outputChannel.appendLine(`[error] ${message}`)
      vscode.window.showErrorMessage(
        `shadcn/plus: ${label} failed. See the shadcn/plus Output channel for details.`
      )
    }
  }

  const buildQuickPickItems = (
    hasComponentsFile: boolean
  ): MenuQuickPickItem[] => {
    const cliItem: MenuQuickPickItem = hasComponentsFile
      ? {
          label: 'Reinstall CLI',
          description: 'Re-run shadcn/ui init for an existing project',
          command: 'initCli'
        }
      : {
          label: 'Install CLI',
          description: 'Install the shadcn/ui CLI',
          command: 'initCli'
        }

    const baseItems: MenuQuickPickItem[] = [
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

    if (!hasComponentsFile) {
      return [cliItem, baseItems[2], baseItems[3], baseItems[4]]
    }

    return [
      baseItems[0],
      baseItems[1],
      cliItem,
      baseItems[2],
      baseItems[3],
      baseItems[4]
    ]
  }

  const toolDisposables = [
    vscode.lm.registerTool(
      'get_shadcnComponentList',
      new GetShadcnComponentListTool()
    ),
    vscode.lm.registerTool(
      'install_shadcnComponent',
      new InstallShadcnComponentTool(outputChannel)
    )
  ]

  const disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand(commands.showMenu, async () => {
      if (!ensureWorkspace()) {
        return
      }

      const commandCwd = await getConfiguredCommandCwd()
      if (!commandCwd) {
        return
      }

      const componentsFile = await getFileStat('components.json', commandCwd)
      const selected = await vscode.window.showQuickPick(
        buildQuickPickItems(Boolean(componentsFile)),
        {
          placeHolder: 'Choose a shadcn/ui action'
        }
      )

      if (!selected) {
        return
      }

      await vscode.commands.executeCommand(commands[selected.command])
    }),

    vscode.commands.registerCommand(commands.initCli, async () => {
      if (!ensureWorkspace()) {
        return
      }

      const commandCwd = await getConfiguredCommandCwd()
      if (!commandCwd) {
        return
      }

      const componentsFile = await getFileStat('components.json', commandCwd)
      if (componentsFile) {
        const confirmation = await vscode.window.showWarningMessage(
          'components.json found. Re-running shadcn/ui init may overwrite parts of your existing setup.',
          { modal: true },
          'Reinstall CLI'
        )

        if (confirmation !== 'Reinstall CLI') {
          return
        }
      }

      const config = vscode.workspace.getConfiguration('shadcn-plus')
      const askComponentLibrary = config.get<boolean>(
        'askComponentLibrary',
        false
      )
      const askPreset = config.get<boolean>('askPreset', false)
      let componentLibrary = normalizeComponentLibrary(
        config.get<string>('componentLibrary', 'base')
      )
      let preset = normalizePreset(config.get<string>('preset', 'nova'))

      if (askComponentLibrary) {
        const selectedComponentLibrary = await vscode.window.showQuickPick(
          componentLibraryQuickPickItems,
          {
            placeHolder: 'Select the component library for shadcn/ui'
          }
        )

        if (!selectedComponentLibrary) {
          return
        }

        componentLibrary = selectedComponentLibrary.value
      }

      if (askPreset) {
        const selectedPreset = await vscode.window.showQuickPick(
          presetQuickPickItems,
          {
            placeHolder: 'Select the preset for shadcn/ui'
          }
        )

        if (!selectedPreset) {
          return
        }

        preset = selectedPreset.value
      }

      const initCmd = await getInitCmd(
        {
          componentLibrary,
          preset,
          reinstall: Boolean(componentsFile)
        },
        commandCwd
      )

      await executeCommandWithFeedback(initCmd, commandCwd, 'Initialization')
    }),

    vscode.commands.registerCommand(commands.addNewComponent, async () => {
      if (!ensureWorkspace()) {
        return
      }

      const hasRegistryData = await checkRegistryData()
      if (!hasRegistryData || !registryData) {
        return
      }

      const commandCwd = await getConfiguredCommandCwd()
      if (!commandCwd) {
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

      const installCmd = await getInstallCmdWithFeedback(
        [selectedComponent.label],
        commandCwd
      )
      if (!installCmd) {
        return
      }

      await executeCommandWithFeedback(
        installCmd,
        commandCwd,
        'Component installation'
      )
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

        const commandCwd = await getConfiguredCommandCwd()
        if (!commandCwd) {
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
        const installCmd = await getInstallCmdWithFeedback(
          selectedComponent,
          commandCwd
        )
        if (!installCmd) {
          return
        }

        await executeCommandWithFeedback(
          installCmd,
          commandCwd,
          'Component installation'
        )
      }
    ),

    vscode.commands.registerCommand(commands.gotoComponentDoc, async () => {
      const hasRegistryData = await checkRegistryData()
      if (!hasRegistryData || !registryData) {
        return
      }

      const documentationComponents = getDocumentationComponents(registryData)
      const selectedComponent = await vscode.window.showQuickPick(
        documentationComponents,
        {
          matchOnDescription: true
        }
      )

      if (!selectedComponent) {
        return
      }

      const componentDocLink = getComponentDocLink(selectedComponent.label)

      vscode.env.openExternal(vscode.Uri.parse(componentDocLink))
    }),
    vscode.commands.registerCommand(commands.reloadComponentList, async () => {
      registryData = undefined
      GetShadcnComponentListTool.clearCache()
      const hasRegistryData = await checkRegistryData()
      if (!hasRegistryData) {
        return
      }

      vscode.window.showInformationMessage('shadcn/ui: Reloaded components')
    }),
    vscode.commands.registerCommand(commands.gotoDoc, async () => {
      vscode.env.openExternal(vscode.Uri.parse(shadCnDocUrl))
    })
  ]

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  )
  statusBarItem.text = '$(diff-added) shadcn/plus'
  statusBarItem.tooltip = 'Open shadcn/plus commands'
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
    outputChannel,
    statusBarItem,
    vscode.workspace.onDidChangeWorkspaceFolders(updateStatusBarVisibility),
    ...disposables,
    ...toolDisposables
  )
}

export function deactivate() {}
