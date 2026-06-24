// ============================================================
// Model Rewrite Plugin — capability-tag / regex multi-scheme rewrite
// ============================================================

import type { PluginDefinition } from './types'

interface RewriteRule {
  id: string
  name: string
  /** Match strategy: 'tag' | 'regex' | 'prefix' */
  matchBy: 'tag' | 'regex' | 'prefix' | 'exact'
  /** Match pattern — tag name, regex string, or literal */
  pattern: string
  /** Rewrite target model name; supports $1..$N for regex capture */
  target: string
  /** Priority in multi-scheme resolution */
  priority: number
  /** Round number for multi-turn rewriting */
  turn?: number
}

/**
 * Model rewrite plugin:
 * - Tag-based rewrite (vision → gpt-4o, tools → claude-3-opus)
 * - Regex-based rewrite (gpt-3.5-* → gpt-4-mini)
 * - Multi-scheme: multiple rulesets tried in priority order
 * - Multi-turn: rewrite can apply across multiple rounds
 */
export function createModelRewritePlugin(): PluginDefinition {
  const rules: RewriteRule[] = []

  function applyRule(model: string, rule: RewriteRule): string | null {
    switch (rule.matchBy) {
      case 'exact':
        return model === rule.pattern ? rule.target : null
      case 'prefix':
        return model.startsWith(rule.pattern) ? rule.target : null
      case 'regex': {
        try {
          const re = new RegExp(rule.pattern)
          return model.match(re) ? model.replace(re, rule.target) : null
        } catch {
          return null
        }
      }
      case 'tag':
        // Tag matching is metadata-driven — handled by the orchestrator
        return null
      default:
        return null
    }
  }

  return {
    name: 'model-rewrite',
    version: '1.0.0',
    description:
      '模型重写 — 基于能力标签/正则的多方案多轮模型名重写',
    handlers: {
      /** Add a rewrite rule */
      addRule: {
        meta: {
          description: 'register a rewrite rule',
          input: {
            matchBy: '"tag"|"regex"|"prefix"|"exact"',
            pattern: 'string',
            target: 'string',
            priority: 'number',
          },
        },
        execute: async (_ctx, params) => {
          const rule = params as Partial<RewriteRule>
          if (rule.matchBy && rule.pattern && rule.target) {
            rules.push({
              id: `rule-${rules.length + 1}`,
              name: rule.name ?? `Rule ${rules.length + 1}`,
              matchBy: rule.matchBy,
              pattern: rule.pattern,
              target: rule.target,
              priority: rule.priority ?? 0,
              turn: rule.turn ?? 0,
            })
            rules.sort((a, b) => b.priority - a.priority)
          }
          return _ctx
        },
      },
      /** Rewrite model name — applies rules in priority order */
      rewrite: {
        meta: {
          description: 'apply rewrite rules to the model name',
          input: {
            turn: 'number (optional) — current multi-turn round',
          },
        },
        execute: async (ctx, params) => {
          const { turn } = (params ?? {}) as { turn?: number }
          const input = ctx['input'] as Record<string, unknown> ?? {}
          const currentModel = String(input['model'] ?? '')

          for (const rule of rules) {
            if (turn !== undefined && rule.turn !== undefined && rule.turn !== turn) continue
            const rewritten = applyRule(currentModel, rule)
            if (rewritten !== null && rewritten !== currentModel) {
              ctx['metadata'] = {
                ...(ctx['metadata'] as object),
                originalModel: currentModel,
                rewrittenModel: rewritten,
                rewriteRule: rule.id,
                rewriteTurn: turn ?? 0,
              }
              input['model'] = rewritten
              break
            }
          }
          return ctx
        },
      },
      /** List all registered rules */
      listRules: {
        meta: { description: 'list all rewrite rules' },
        execute: async (ctx) => {
          ctx['output'] = { content: JSON.stringify(rules, null, 2) }
          return ctx
        },
      },
      /** Clear all rules */
      clearRules: {
        meta: { description: 'remove all rewrite rules' },
        execute: async (ctx) => {
          rules.length = 0
          return ctx
        },
      },
    },
    webui: {
      route: '/webui/model-rewrite',
      label: 'Model Rewrite',
      icon: 'edit',
      iframe: true,
      config: {
        description:
          '模型名重写规则管理 — 标签/正则/前缀/精确匹配，多方案多轮',
        matchOptions: ['tag', 'regex', 'prefix', 'exact'],
      },
    },
  }
}