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

import fetch from 'node-fetch'
import * as vscode from 'vscode'

import { to } from '.'
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

export const getRegistry = async (): Promise<Components | null> => {
  const reqUrl = 'https://ui.shadcn.com/r/index.json'
  const [res, err] = await to(fetch(reqUrl))

  if (err || !res) {
    console.error('can not get the data')
    return null
  }

  const [data] = await to(res.json())

  if (!data) {
    return null
  }

  const components: Components = (data as OgComponent[]).map((c) => {
    const component: Component = {
      label: c.name,
      dependencies: `dependencies: ${
        c.dependencies ? c.dependencies.join(' ') : 'no dependency'
      }`
    }

    return component
  })

  return components
}

export const getInstallCmd = async (components: string[], cwd?: vscode.Uri) => {
  const packageManager = await detectPackageManager(cwd)
  const componentStr = components.join(' ')

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
