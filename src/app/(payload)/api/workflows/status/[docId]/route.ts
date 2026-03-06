/**
 * GET /api/workflows/status/:docId?collection=<slug>
 *
 * Returns full workflow status for a document including:
 * - workflow config
 * - current step
 * - completed steps
 * - pending steps
 * - audit logs
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getWorkflowStatus } from '@/services/workflowService'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { docId } = await params
    const collection = req.nextUrl.searchParams.get('collection')

    if (!collection) {
      return NextResponse.json(
        { error: 'Missing required query parameter: collection' },
        { status: 400 },
      )
    }

    if (!docId) {
      return NextResponse.json(
        { error: 'Missing document ID in URL path' },
        { status: 400 },
      )
    }

    const status = await getWorkflowStatus(payload, collection, docId)

    if (!status.document) {
      return NextResponse.json(
        { error: `Document not found in collection "${collection}" with id "${docId}"` },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: docId,
        collection,
        status: (status.document as any).status || 'unknown',
        workflow: status.workflow
          ? {
              id: status.workflow.id,
              name: status.workflow.workflowName,
              targetCollection: status.workflow.targetCollection,
              totalSteps: status.workflow.steps?.length || 0,
            }
          : null,
        currentStep: status.currentStep
          ? {
              stepName: status.currentStep.stepName,
              stepOrder: status.currentStep.stepOrder,
              stepType: status.currentStep.stepType,
              assignedRole: status.currentStep.assignedRole,
            }
          : null,
        completedSteps: status.completedSteps.map((s) => ({
          stepName: s.stepName,
          stepOrder: s.stepOrder,
          stepType: s.stepType,
        })),
        pendingSteps: status.pendingSteps.map((s) => ({
          stepName: s.stepName,
          stepOrder: s.stepOrder,
          stepType: s.stepType,
        })),
        logs: status.logs,
      },
    })
  } catch (error) {
    console.error('[API /workflows/status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    )
  }
}
