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

import { detectPackageManager } from './vscode'
import type { ExecutableCommand, PackageManager } from './vscode'

type RegistryFile = {
  path: string
  type: string
  target?: string
  content?: string
}

type RegistryItem = {
  type: 'registry:ui'
  name: string
  files?: RegistryFile[]
  dependencies?: string[]
  registryDependencies?: string[]
}

type Component = {
  label: string
  dependencies?: string
}

export const shadCnDocUrl = 'https://ui.shadcn.com/docs'

export type Components = Component[]
export type ComponentLibrary = 'base' | 'radix'
export type Preset =
  | 'vega'
  | 'nova'
  | 'maia'
  | 'lyra'
  | 'mira'
  | 'luma'
  | 'sera'
  | 'rhea'

export type InitOptions = {
  componentLibrary?: ComponentLibrary
  preset?: Preset
  reinstall?: boolean
}

const registryUrl = 'https://ui.shadcn.com/r/index.json'
const registryRequestTimeoutMs = 8000
const maxRegistryAttempts = 3
const retryBackoffMs = 500
const validComponentNameRegex = /^[a-z0-9][a-z0-9-]*$/i
const documentationOnlyComponents: Components = [
  {
    label: 'data-table',
    dependencies: 'Documentation guide (uses table and TanStack Table)'
  },
  {
    label: 'date-picker',
    dependencies: 'Documentation guide (uses calendar and popover)'
  },
  {
    label: 'toast',
    dependencies: 'Deprecated documentation (use sonner instead)'
  },
  {
    label: 'typography',
    dependencies: 'Documentation redirects to Typeset'
  }
]

const sanitizeComponentNames = (components: string[]): string[] => {
  const normalizedComponents = components.map((component) => component.trim())
  const filteredComponents = normalizedComponents.filter(
    (component) => component.length > 0
  )

  if (filteredComponents.length === 0) {
    throw new Error('No valid component names were provided.')
  }

  const invalidComponents = filteredComponents.filter(
    (component) => !validComponentNameRegex.test(component)
  )
  if (invalidComponents.length > 0) {
    throw new Error(
      `Invalid component name(s): ${invalidComponents.join(', ')}.`
    )
  }

  return filteredComponents
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const isRegistryUiItem = (value: unknown): value is RegistryItem => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Partial<RegistryItem>
  return item.type === 'registry:ui' && typeof item.name === 'string'
}

const getShadcnRunner = (
  packageManager: PackageManager
): ExecutableCommand => {
  if (packageManager === 'bun') {
    return { command: 'bunx', args: ['--bun', 'shadcn@latest'] }
  }

  if (packageManager === 'pnpm') {
    return { command: 'pnpm', args: ['dlx', 'shadcn@latest'] }
  }

  if (packageManager === 'yarn') {
    return { command: 'yarn', args: ['dlx', 'shadcn@latest'] }
  }

  return { command: 'npx', args: ['--yes', 'shadcn@latest'] }
}

const buildShadcnCommand = (
  packageManager: PackageManager,
  args: string[]
): ExecutableCommand => {
  const runner = getShadcnRunner(packageManager)
  return {
    command: runner.command,
    args: [...runner.args, ...args]
  }
}

export const getRegistry = async (): Promise<Components | null> => {
  let lastError: unknown = null

  for (let attempt = 0; attempt < maxRegistryAttempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, registryRequestTimeoutMs)

    try {
      const res = await fetch(registryUrl, {
        signal: controller.signal,
        headers: {
          accept: 'application/json'
        }
      })

      if (!res.ok) {
        throw new Error(
          `Registry request failed with status ${res.status} ${res.statusText}`
        )
      }

      const data = (await res.json()) as unknown
      if (!Array.isArray(data)) {
        throw new Error('Registry response is not an array.')
      }

      const components = data.filter(isRegistryUiItem).map((component) => ({
        label: component.name,
        dependencies: `dependencies: ${
          component.dependencies?.join(' ') || 'no dependency'
        }`
      }))

      if (components.length === 0) {
        throw new Error('Registry response contains no UI components.')
      }

      return components
    } catch (error) {
      lastError = error

      const hasRetry = attempt < maxRegistryAttempts - 1
      if (hasRetry) {
        await delay(retryBackoffMs * (attempt + 1))
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  console.error('Failed to fetch shadcn/ui registry.', lastError)
  return null
}

export const getInstallCmd = async (
  components: string[],
  cwd?: vscode.Uri
): Promise<ExecutableCommand> => {
  const packageManager = await detectPackageManager(cwd)
  const safeComponents = sanitizeComponentNames(components)

  return buildShadcnCommand(packageManager, [
    'add',
    ...safeComponents,
    '--yes'
  ])
}

export const getInitCmd = async (
  options: InitOptions = {},
  cwd?: vscode.Uri
) => {
  const packageManager = await detectPackageManager(cwd)
  const componentLibrary = options.componentLibrary ?? 'base'
  const preset = options.preset ?? 'nova'
  const initArgs = ['init', '--base', componentLibrary, '--preset', preset]

  if (options.reinstall) {
    initArgs.push('--force', '--reinstall')
  }

  initArgs.push('--yes')
  return buildShadcnCommand(packageManager, initArgs)
}

export const getDocumentationComponents = (
  registryComponents: Components
): Components => {
  const componentsByName = new Map(
    registryComponents.map((component) => [component.label, component])
  )

  for (const component of documentationOnlyComponents) {
    componentsByName.set(component.label, component)
  }

  return [...componentsByName.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  )
}

export const getComponentDocLink = (component: string) => {
  if (component === 'typography') {
    return `${shadCnDocUrl}/typeset`
  }

  return `${shadCnDocUrl}/components/${component}`
}
