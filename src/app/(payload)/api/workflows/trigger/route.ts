/**
 * POST /api/workflows/trigger
 *
 * Manually trigger or advance a workflow on a document.
 *
 * Body:
 * {
 *   documentId: string,
 *   collection: string,
 *   workflowId: string,
 *   action?: 'approved' | 'rejected',
 *   comment?: string
 * }
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { startWorkflow, moveToNextStep } from '@/services/workflowService'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await req.json()

    const { documentId, collection, workflowId, action, comment } = body

    if (!documentId || !collection || !workflowId) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, collection, workflowId' },
        { status: 400 },
      )
    }

    // Fetch the document to check current state
    let document: any
    try {
      document = await payload.findByID({
        collection: collection as any,
        id: documentId,
      })
    } catch {
      return NextResponse.json(
        { error: `Document not found in collection "${collection}" with id "${documentId}"` },
        { status: 404 },
      )
    }

    // If no action specified, start the workflow
    if (!action) {
      await startWorkflow(payload, collection, documentId, workflowId)

      // Re-fetch the updated document
      const updatedDoc = await payload.findByID({
        collection: collection as any,
        id: documentId,
      })

      return NextResponse.json({
        success: true,
        message: 'Workflow started successfully',
        document: updatedDoc,
      })
    }

    // If action is specified, move to next step
    if (action === 'approved' || action === 'rejected') {
      const currentStep = document.currentWorkflowStep ?? 0

      const result = await moveToNextStep(
        payload,
        collection,
        documentId,
        workflowId,
        currentStep,
        action,
        undefined,
        comment,
      )

      const updatedDoc = await payload.findByID({
        collection: collection as any,
        id: documentId,
      })

      return NextResponse.json({
        success: true,
        message: result.completed
          ? 'Workflow completed'
          : result.rejected
            ? 'Document rejected'
            : 'Moved to next step',
        result,
        document: updatedDoc,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Must be "approved" or "rejected".' }, { status: 400 })
  } catch (error) {
    console.error('[API /workflows/trigger] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    )
  }
}
