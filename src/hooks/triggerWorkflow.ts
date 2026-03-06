/**
 * Trigger Workflow Hook
 *
 * A Payload afterChange hook that automatically starts a workflow
 * when a document is created with a workflow relationship,
 * or evaluates the current step when updated.
 */

import type { CollectionAfterChangeHook } from 'payload'
import { startWorkflow, evaluateStep } from '../services/workflowService'

interface WorkflowStep {
  stepName: string
  stepOrder: number
  assignedRole?: string | null
  stepType: 'approval' | 'review' | 'signoff' | 'comment'
  condition?: unknown
  nextStep?: number | null
}

interface WorkflowDoc {
  id: string
  workflowName: string
  targetCollection: string
  steps: WorkflowStep[]
}

export const triggerWorkflow: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
  collection,
}) => {
  // Avoid infinite loops: skip if this update was triggered by the workflow service
  if (req.context?.skipWorkflowTrigger) {
    return doc
  }

  const workflowId = doc.workflow
    ? typeof doc.workflow === 'object'
      ? doc.workflow.id
      : doc.workflow
    : null

  if (!workflowId) {
    return doc
  }

  const collectionSlug = collection.slug
  const userId: string | undefined = req.user?.id || undefined

  try {
    if (operation === 'create') {
      // Document just created with a workflow — start it
      console.log(
        `[TriggerWorkflow] New document created in "${collectionSlug}" with workflow. Starting workflow...`,
      )

      // Use context flag to prevent recursive hook calls
      req.context = { ...req.context, skipWorkflowTrigger: true }

      await startWorkflow(req.payload, collectionSlug, doc.id, workflowId, userId)

      console.log(
        `[TriggerWorkflow] 📧 Email notification sent to reviewer: New document requires review`,
      )
    } else if (operation === 'update') {
      // Document updated — check if workflow was just assigned
      const previousWorkflowId = previousDoc?.workflow
        ? typeof previousDoc.workflow === 'object'
          ? previousDoc.workflow.id
          : previousDoc.workflow
        : null

      if (!previousWorkflowId && workflowId) {
        // Workflow was just assigned to an existing document
        console.log(
          `[TriggerWorkflow] Workflow assigned to existing document in "${collectionSlug}". Starting workflow...`,
        )

        req.context = { ...req.context, skipWorkflowTrigger: true }

        await startWorkflow(req.payload, collectionSlug, doc.id, workflowId, userId)

        console.log(
          `[TriggerWorkflow] 📧 Email notification sent to reviewer: Document workflow started`,
        )
      } else if (workflowId && doc.currentWorkflowStep !== undefined) {
        // Workflow exists — evaluate the current step
        const workflow = (await req.payload.findByID({
          collection: 'workflows' as any,
          id: workflowId,
        })) as unknown as WorkflowDoc

        if (workflow) {
          const result = await evaluateStep(
            req.payload,
            workflow as any,
            doc.currentWorkflowStep,
            doc as Record<string, unknown>,
          )

          if (result.canProceed && result.step) {
            console.log(
              `[TriggerWorkflow] Step "${result.step.stepName}" conditions met for ${collectionSlug}/${doc.id}`,
            )
          } else if (!result.canProceed && result.reason) {
            console.log(`[TriggerWorkflow] ${result.reason}`)
          }
        }
      }
    }
  } catch (error) {
    console.error(`[TriggerWorkflow] Error processing workflow for ${collectionSlug}/${doc.id}:`, error)
  }

  return doc
}
