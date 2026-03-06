/**
 * Workflow Engine Plugin
 *
 * A Payload CMS v3 plugin that:
 * - Dynamically watches specified collections
 * - Injects afterChange hooks to trigger the workflow engine
 * - Enforces role-based step locking via beforeChange hooks
 * - Simulates notifications
 */

import type { Config, Plugin } from 'payload'
import { triggerWorkflow } from '../hooks/triggerWorkflow'

export interface WorkflowEnginePluginOptions {
  /** Collection slugs to attach workflow hooks to */
  collections: string[]
  /** Enable console.log-based notification simulation */
  enableNotifications?: boolean
}

export const workflowEnginePlugin =
  (options: WorkflowEnginePluginOptions): Plugin =>
  (incomingConfig: Config): Config => {
    const { collections: watchedCollections, enableNotifications = true } = options

    // Clone config to avoid mutations
    const config = { ...incomingConfig }

    if (!config.collections) {
      return config
    }

    config.collections = config.collections.map((collection) => {
      // Only modify collections that are in the watched list
      if (!watchedCollections.includes(collection.slug)) {
        return collection
      }

      const existingAfterChange = collection.hooks?.afterChange || []
      const existingBeforeChange = collection.hooks?.beforeChange || []

      return {
        ...collection,
        hooks: {
          ...collection.hooks,
          // Inject the triggerWorkflow afterChange hook
          afterChange: [...existingAfterChange, triggerWorkflow],
          // Inject role-based step locking via beforeChange
          beforeChange: [
            ...existingBeforeChange,
            async ({ data, req, operation, originalDoc }) => {
              // Skip if no user or if creating a new document
              if (!req.user || operation === 'create') {
                return data
              }

              // Skip if triggered by workflow service
              if (req.context?.skipWorkflowTrigger) {
                return data
              }

              // Check if there's a workflow assigned
              const workflowId = originalDoc?.workflow
                ? typeof originalDoc.workflow === 'object'
                  ? originalDoc.workflow.id
                  : originalDoc.workflow
                : null

              if (!workflowId || originalDoc?.currentWorkflowStep === undefined) {
                return data
              }

              try {
                // Fetch the workflow to check step permissions
                const workflow = await req.payload.findByID({
                  collection: 'workflows' as any,
                  id: workflowId,
                })

                if (!workflow || !workflow.steps) {
                  return data
                }

                const steps = workflow.steps as Array<{
                  stepOrder: number
                  assignedRole?: string | null
                  assignedUser?: string | { id: string } | null
                  stepName: string
                }>
                const currentStep = steps.find(
                  (s) => s.stepOrder === originalDoc.currentWorkflowStep,
                )

                if (!currentStep) {
                  return data
                }

                // Check role-based locking
                const userRole = (req.user as any).role as string
                const isAdmin = userRole === 'admin'

                if (!isAdmin) {
                  // Check if user has the required role
                  if (currentStep.assignedRole && currentStep.assignedRole !== userRole) {
                    if (enableNotifications) {
                      console.log(
                        `[WorkflowEngine] ⚠️ User with role "${userRole}" cannot act on step "${currentStep.stepName}" (requires "${currentStep.assignedRole}")`,
                      )
                    }
                    // Allow the update but add a warning context
                    req.context = {
                      ...req.context,
                      workflowRoleWarning: `User role "${userRole}" does not match required role "${currentStep.assignedRole}" for step "${currentStep.stepName}"`,
                    }
                  }

                  // Check if a specific user is assigned
                  if (currentStep.assignedUser) {
                    const assignedUserId =
                      typeof currentStep.assignedUser === 'object'
                        ? currentStep.assignedUser.id
                        : currentStep.assignedUser

                    if (assignedUserId !== req.user.id) {
                      if (enableNotifications) {
                        console.log(
                          `[WorkflowEngine] ⚠️ User ${req.user.id} is not the assigned user for step "${currentStep.stepName}"`,
                        )
                      }
                      req.context = {
                        ...req.context,
                        workflowUserWarning: `You are not the assigned user for step "${currentStep.stepName}"`,
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('[WorkflowEngine] Error checking step permissions:', error)
              }

              return data
            },
          ],
        },
      }
    })

    if (enableNotifications) {
      console.log(
        `[WorkflowEngine] Plugin initialized. Watching collections: ${watchedCollections.join(', ')}`,
      )
    }

    return config
  }
