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

type OgComponent = {
  type: 'components:ui'
  name: string
  files: string[]
  dependencies?: string[]
  registryDependencies?: string[]
}

type Component = {
  label: string
  dependencies?: string
}

export const shadCnDocUrl = 'https://ui.shadcn.com/docs'

export type Components = Component[]
export type BaseColor = 'neutral' | 'gray' | 'zinc' | 'stone' | 'slate'
const registryUrl = 'https://ui.shadcn.com/r/index.json'
const registryRequestTimeoutMs = 8000
const maxRegistryAttempts = 3
const retryBackoffMs = 500
const validComponentNameRegex = /^[a-z0-9][a-z0-9-]*$/i

const shellEscapeArg = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`

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

      return (data as OgComponent[]).map((component) => ({
        label: component.name,
        dependencies: `dependencies: ${
          component.dependencies
            ? component.dependencies.join(' ')
            : 'no dependency'
        }`
      }))
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

export const getInstallCmd = async (components: string[], cwd?: vscode.Uri) => {
  const packageManager = await detectPackageManager(cwd)
  const safeComponents = sanitizeComponentNames(components)
  const componentStr = safeComponents.map(shellEscapeArg).join(' ')

  if (packageManager === 'bun') {
    return `bunx --bun shadcn@latest add ${componentStr}`
  }

  if (packageManager === 'pnpm') {
    return `pnpm dlx shadcn@latest add ${componentStr}`
  }

  return `npx shadcn@latest add ${componentStr}`
}

export const getInitCmd = async (
  baseColor: BaseColor = 'zinc',
  cwd?: vscode.Uri
) => {
  const packageManager = await detectPackageManager(cwd)
  const baseColorFlag = `--base-color=${baseColor}`

  if (packageManager === 'bun') {
    return `bunx --bun shadcn@latest init ${baseColorFlag}`
  }

  if (packageManager === 'pnpm') {
    return `pnpm dlx shadcn@latest init ${baseColorFlag}`
  }

  return `npx shadcn@latest init ${baseColorFlag}`
}

export const getComponentDocLink = (component: string) => {
  return `${shadCnDocUrl}/components/${component}`
}
