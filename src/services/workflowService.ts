/**
 * Workflow Service
 *
 * Core engine that manages workflow lifecycle:
 * - Starting workflows on documents
 * - Evaluating step conditions
 * - Moving to next steps
 * - Recording immutable audit logs
 */

import type { BasePayload } from 'payload'
import { evaluateConditions, type WorkflowCondition } from '../utilities/conditionEvaluator'

// Use generic types to avoid dependency on generated types
interface WorkflowStep {
  stepName: string
  stepOrder: number
  assignedRole?: string | null
  assignedUser?: string | { id: string } | null
  stepType: 'approval' | 'review' | 'signoff' | 'comment'
  condition?: WorkflowCondition | WorkflowCondition[] | null
  nextStep?: number | null
  id?: string
}

interface WorkflowDoc {
  id: string
  workflowName: string
  targetCollection: string
  steps: WorkflowStep[]
}

interface LogEntry {
  workflowId: string
  documentId: string
  collection: string
  stepId: number
  user?: string | null
  action: 'approved' | 'rejected' | 'commented' | 'skipped' | 'started'
  comment?: string
  timestamp: string
}

/**
 * Record an immutable log entry
 */
export async function recordLog(payload: BasePayload, data: LogEntry): Promise<void> {
  try {
    await payload.create({
      collection: 'workflow-logs' as any,
      data: {
        workflowId: data.workflowId,
        documentId: data.documentId,
        collection: data.collection,
        stepId: data.stepId,
        user: data.user || null,
        action: data.action,
        comment: data.comment || '',
        timestamp: data.timestamp || new Date().toISOString(),
      },
    })
    console.log(
      `[WorkflowService] Log recorded: ${data.action} on step ${data.stepId} for ${data.collection}/${data.documentId}`,
    )
  } catch (error) {
    console.error('[WorkflowService] Failed to record log:', error)
  }
}

/**
 * Start a workflow on a document
 */
export async function startWorkflow(
  payload: BasePayload,
  collectionSlug: string,
  documentId: string,
  workflowId: string,
  userId?: string,
): Promise<void> {
  try {
    // Fetch the workflow definition
    const workflow = (await payload.findByID({
      collection: 'workflows' as any,
      id: workflowId,
    })) as unknown as WorkflowDoc

    if (!workflow || !workflow.steps || workflow.steps.length === 0) {
      console.warn(`[WorkflowService] Workflow ${workflowId} not found or has no steps`)
      return
    }

    // Sort steps by stepOrder
    const sortedSteps = [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder)
    const firstStep = sortedSteps[0]

    // Update the document to set initial workflow state
    await payload.update({
      collection: collectionSlug as any,
      id: documentId,
      data: {
        currentWorkflowStep: firstStep.stepOrder,
        status: 'in_review',
      } as any,
    })

    // Record the workflow start log
    await recordLog(payload, {
      workflowId: workflow.id,
      documentId,
      collection: collectionSlug,
      stepId: firstStep.stepOrder,
      user: userId || null,
      action: 'started',
      comment: `Workflow "${workflow.workflowName}" started at step "${firstStep.stepName}"`,
      timestamp: new Date().toISOString(),
    })

    // Simulate notification
    const assignee = firstStep.assignedRole || 'assigned user'
    console.log(
      `[WorkflowService] 📧 Email notification sent to ${assignee}: New ${firstStep.stepType} required for ${collectionSlug}/${documentId} — Step: "${firstStep.stepName}"`,
    )
  } catch (error) {
    console.error('[WorkflowService] Failed to start workflow:', error)
    throw error
  }
}

/**
 * Evaluate a workflow step's conditions against a document
 */
export async function evaluateStep(
  payload: BasePayload,
  workflow: WorkflowDoc,
  stepIndex: number,
  document: Record<string, unknown>,
): Promise<{ canProceed: boolean; step: WorkflowStep | null; reason?: string }> {
  const sortedSteps = [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder)
  const step = sortedSteps.find((s) => s.stepOrder === stepIndex)

  if (!step) {
    return { canProceed: false, step: null, reason: `Step with order ${stepIndex} not found` }
  }

  // Evaluate conditions if present
  if (step.condition) {
    const conditionMet = evaluateConditions(
      step.condition as WorkflowCondition | WorkflowCondition[],
      document,
    )
    if (!conditionMet) {
      return {
        canProceed: false,
        step,
        reason: `Condition not met for step "${step.stepName}"`,
      }
    }
  }

  return { canProceed: true, step }
}

/**
 * Move to the next step in the workflow
 */
export async function moveToNextStep(
  payload: BasePayload,
  collectionSlug: string,
  documentId: string,
  workflowId: string,
  currentStepOrder: number,
  action: 'approved' | 'rejected',
  userId?: string,
  comment?: string,
): Promise<{ completed: boolean; nextStep?: WorkflowStep; rejected?: boolean }> {
  try {
    // Fetch workflow
    const workflow = (await payload.findByID({
      collection: 'workflows' as any,
      id: workflowId,
    })) as unknown as WorkflowDoc

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    const sortedSteps = [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder)
    const currentStep = sortedSteps.find((s) => s.stepOrder === currentStepOrder)

    if (!currentStep) {
      throw new Error(`Step ${currentStepOrder} not found in workflow`)
    }

    // Record the action log
    await recordLog(payload, {
      workflowId: workflow.id,
      documentId,
      collection: collectionSlug,
      stepId: currentStepOrder,
      user: userId || null,
      action,
      comment: comment || `Step "${currentStep.stepName}" ${action}`,
      timestamp: new Date().toISOString(),
    })

    // If rejected, update status and stop
    if (action === 'rejected') {
      await payload.update({
        collection: collectionSlug as any,
        id: documentId,
        data: {
          status: 'rejected',
        } as any,
      })
      console.log(
        `[WorkflowService] 📧 Email notification sent: Document ${documentId} rejected at step "${currentStep.stepName}"`,
      )
      return { completed: false, rejected: true }
    }

    // Determine the next step
    let nextStepOrder: number | undefined
    if (currentStep.nextStep != null) {
      // Explicit next step defined
      nextStepOrder = currentStep.nextStep
    } else {
      // Find next sequential step
      const currentIndex = sortedSteps.findIndex((s) => s.stepOrder === currentStepOrder)
      if (currentIndex < sortedSteps.length - 1) {
        nextStepOrder = sortedSteps[currentIndex + 1].stepOrder
      }
    }

    if (nextStepOrder !== undefined) {
      const nextStep = sortedSteps.find((s) => s.stepOrder === nextStepOrder)
      if (nextStep) {
        // Move to next step
        await payload.update({
          collection: collectionSlug as any,
          id: documentId,
          data: {
            currentWorkflowStep: nextStep.stepOrder,
          } as any,
        })

        // Simulate notification for next step assignee
        const assignee = nextStep.assignedRole || 'assigned user'
        console.log(
          `[WorkflowService] 📧 Email notification sent to ${assignee}: ${nextStep.stepType} required for ${collectionSlug}/${documentId} — Step: "${nextStep.stepName}"`,
        )

        return { completed: false, nextStep }
      }
    }

    // No next step — workflow is complete
    await payload.update({
      collection: collectionSlug as any,
      id: documentId,
      data: {
        status: 'approved',
      } as any,
    })

    console.log(
      `[WorkflowService] ✅ Workflow "${workflow.workflowName}" completed for ${collectionSlug}/${documentId}`,
    )

    return { completed: true }
  } catch (error) {
    console.error('[WorkflowService] Failed to move to next step:', error)
    throw error
  }
}

/**
 * Get the full workflow status for a document
 */
export async function getWorkflowStatus(
  payload: BasePayload,
  collectionSlug: string,
  documentId: string,
): Promise<{
  document: Record<string, unknown> | null
  workflow: WorkflowDoc | null
  currentStep: WorkflowStep | null
  completedSteps: WorkflowStep[]
  pendingSteps: WorkflowStep[]
  logs: unknown[]
}> {
  try {
    // Fetch the document
    const document = (await payload.findByID({
      collection: collectionSlug as any,
      id: documentId,
    })) as Record<string, unknown>

    if (!document || !document.workflow) {
      return {
        document,
        workflow: null,
        currentStep: null,
        completedSteps: [],
        pendingSteps: [],
        logs: [],
      }
    }

    // Fetch workflow
    const workflowId =
      typeof document.workflow === 'object'
        ? (document.workflow as { id: string }).id
        : (document.workflow as string)

    const workflow = (await payload.findByID({
      collection: 'workflows' as any,
      id: workflowId,
    })) as unknown as WorkflowDoc

    // Fetch logs
    const logsResult = await payload.find({
      collection: 'workflow-logs' as any,
      where: {
        documentId: { equals: documentId },
        collection: { equals: collectionSlug },
      },
      sort: 'timestamp',
      limit: 100,
    })

    const sortedSteps = workflow ? [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder) : []
    const currentStepOrder = (document.currentWorkflowStep as number) || 0

    const currentStep = sortedSteps.find((s) => s.stepOrder === currentStepOrder) || null
    const completedSteps = sortedSteps.filter((s) => s.stepOrder < currentStepOrder)
    const pendingSteps = sortedSteps.filter((s) => s.stepOrder > currentStepOrder)

    return {
      document,
      workflow,
      currentStep,
      completedSteps,
      pendingSteps,
      logs: logsResult.docs,
    }
  } catch (error) {
    console.error('[WorkflowService] Failed to get workflow status:', error)
    throw error
  }
}
