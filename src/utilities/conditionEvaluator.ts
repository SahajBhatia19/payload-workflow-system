/**
 * Condition Evaluator Utility
 *
 * Evaluates JSON-based conditions against document data.
 * Supports operators: equals, not_equals, gt, lt, gte, lte, contains
 *
 * Example condition:
 * { "field": "amount", "operator": "gt", "value": 1000 }
 */

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'
  value: unknown
}

/**
 * Get a nested field value from a document using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Evaluate a single condition against a document
 */
export function evaluateCondition(
  condition: WorkflowCondition,
  document: Record<string, unknown>,
): boolean {
  const fieldValue = getNestedValue(document, condition.field)

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value

    case 'not_equals':
      return fieldValue !== condition.value

    case 'gt':
      return typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue > condition.value
        : false

    case 'lt':
      return typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue < condition.value
        : false

    case 'gte':
      return typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue >= condition.value
        : false

    case 'lte':
      return typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue <= condition.value
        : false

    case 'contains':
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return fieldValue.includes(condition.value)
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value)
      }
      return false

    default:
      console.warn(`[ConditionEvaluator] Unknown operator: ${(condition as WorkflowCondition).operator}`)
      return true // Unknown operators pass by default
  }
}

/**
 * Evaluate multiple conditions (AND logic — all must pass)
 */
export function evaluateConditions(
  conditions: WorkflowCondition | WorkflowCondition[] | null | undefined,
  document: Record<string, unknown>,
): boolean {
  if (!conditions) return true

  const conditionArray = Array.isArray(conditions) ? conditions : [conditions]

  if (conditionArray.length === 0) return true

  return conditionArray.every((condition) => evaluateCondition(condition, document))
}
