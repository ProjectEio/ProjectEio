// ============================================================
// Core runtime — working paths, version info, global state
// ============================================================

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ---- Version ----
export const VERSION = '0.0.1'
export const VERSION_NAME = 'ProjectEio'

// ---- Paths ----
// Resolve project root (packages/server/src/core/ -> project root)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** project root: E:/Naka/ProjectEio */
export const PROJECT_ROOT = resolve(__dirname, '..', '..', '..', '..')

/** server package root */
export const SERVER_ROOT = resolve(PROJECT_ROOT, 'packages', 'server')

/** plugins package root */
export const PLUGINS_ROOT = resolve(PROJECT_ROOT, 'packages', 'plugins')

/** runtime data directory (logs, caches, temp) */
export const DATA_DIR = resolve(PROJECT_ROOT, 'data')

/** logs directory */
export const LOG_DIR = resolve(DATA_DIR, 'logs')

/** node configs directory */
export const CONFIG_DIR = resolve(DATA_DIR, 'config')

// ---- Runtime config ----
export interface RuntimeConfig {
  /** server listening port */
  port: number
  /** mock server port */
  mockPort: number
  /** working mode */
  mode: 'development' | 'production'
  /** log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export const defaultConfig: RuntimeConfig = {
  port: Number(process.env['PORT']) || 3001,
  mockPort: Number(process.env['MOCK_PORT']) || 3099,
  mode: (process.env['NODE_ENV'] as any) || 'development',
  logLevel: (process.env['LOG_LEVEL'] as any) || 'info',
}

let activeConfig: RuntimeConfig = { ...defaultConfig }

export function getConfig(): RuntimeConfig {
  return activeConfig
}

export function updateConfig(partial: Partial<RuntimeConfig>): RuntimeConfig {
  activeConfig = { ...activeConfig, ...partial }
  return activeConfig
}

// ---- Logger (minimal; main logger managed by main script) ----
export function logger(level: RuntimeConfig['logLevel'], ...args: unknown[]) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 }
  if (levels[level] >= levels[activeConfig.logLevel]) {
    const prefix = `[${level.toUpperCase()}]`
    if (level === 'error' || level === 'warn') {
      console.error(prefix, ...args)
    } else {
      console.log(prefix, ...args)
    }
  }
}