// Logger that writes to console and store
import { store } from '../core/store'
import { getConfig, logger as baseLogger } from '../core/runtime'
import type { LogEntry } from '../core/types'

const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const

function shouldEmit(level: LogEntry['level']): boolean {
  const cfg = getConfig()
  return levels[level] >= levels[cfg.logLevel]
}

function write(level: LogEntry['level'], source: string, msg: string, data?: unknown): void {
  const entry: LogEntry = { ts: Date.now(), level, source, msg }
  if (data !== undefined) entry.data = data
  try {
    store.logs.append(entry)
  } catch (_e) {
    // store not ready
  }
  if (shouldEmit(level)) {
    if (data !== undefined) baseLogger(level, `[${source}]`, msg, data)
    else baseLogger(level, `[${source}]`, msg)
  }
}

export const log = {
  debug(source: string, msg: string, data?: unknown) { write('debug', source, msg, data) },
  info(source: string, msg: string, data?: unknown) { write('info', source, msg, data) },
  warn(source: string, msg: string, data?: unknown) { write('warn', source, msg, data) },
  error(source: string, msg: string, data?: unknown) { write('error', source, msg, data) },
}
