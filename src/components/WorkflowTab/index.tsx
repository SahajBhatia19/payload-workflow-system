'use client'

/**
 * WorkflowTab — Admin UI Component
 *
 * Displays workflow status, approval history, and action buttons
 * within the Payload admin panel for documents with assigned workflows.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

interface WorkflowStep {
  stepName: string
  stepOrder: number
  stepType: string
  assignedRole?: string
}

interface LogEntry {
  id: string
  action: string
  comment?: string
  timestamp: string
  user?: { name?: string; email?: string } | string
  stepId: number
}

interface WorkflowStatus {
  documentId: string
  collection: string
  status: string
  workflow: {
    id: string
    name: string
    targetCollection: string
    totalSteps: number
  } | null
  currentStep: WorkflowStep | null
  completedSteps: WorkflowStep[]
  pendingSteps: WorkflowStep[]
  logs: LogEntry[]
}

const WorkflowTab: React.FC = () => {
  const { id, collectionSlug } = useDocumentInfo()
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!id || !collectionSlug) return

    try {
      setLoading(true)
      const res = await fetch(
        `/api/workflows/status/${id}?collection=${collectionSlug}`,
      )
      const data = await res.json()

      if (data.success) {
        setWorkflowStatus(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch workflow status')
      }
    } catch (err) {
      setError('Failed to connect to workflow API')
    } finally {
      setLoading(false)
    }
  }, [id, collectionSlug])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!workflowStatus?.workflow || !id || !collectionSlug) return

    try {
      setActionLoading(true)
      const res = await fetch('/api/workflows/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: id,
          collection: collectionSlug,
          workflowId: workflowStatus.workflow.id,
          action,
          comment: comment || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setComment('')
        await fetchStatus()
      } else {
        setError(data.error || 'Action failed')
      }
    } catch (err) {
      setError('Failed to perform action')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading workflow status...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    )
  }

  if (!workflowStatus?.workflow) {
    return (
      <div style={styles.container}>
        <div style={styles.noWorkflow}>
          <h3 style={styles.heading}>No Workflow Assigned</h3>
          <p>Assign a workflow to this document to enable the approval process.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>
        Workflow: {workflowStatus.workflow.name}
      </h3>

      {/* Status Badge */}
      <div style={styles.statusRow}>
        <span style={styles.label}>Document Status:</span>
        <span
          style={{
            ...styles.badge,
            backgroundColor: getStatusColor(workflowStatus.status),
          }}
        >
          {workflowStatus.status.toUpperCase().replace('_', ' ')}
        </span>
      </div>

      {/* Current Step */}
      {workflowStatus.currentStep && (
        <div style={styles.section}>
          <h4 style={styles.subHeading}>Current Step</h4>
          <div style={styles.stepCard}>
            <strong>{workflowStatus.currentStep.stepName}</strong>
            <span style={styles.stepMeta}>
              Type: {workflowStatus.currentStep.stepType} | Role:{' '}
              {workflowStatus.currentStep.assignedRole || 'Any'}
            </span>
          </div>
        </div>
      )}

      {/* Progress */}
      <div style={styles.section}>
        <h4 style={styles.subHeading}>Progress</h4>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${
                workflowStatus.workflow.totalSteps > 0
                  ? ((workflowStatus.completedSteps.length /
                      workflowStatus.workflow.totalSteps) *
                      100)
                  : 0
              }%`,
            }}
          />
        </div>
        <span style={styles.progressText}>
          {workflowStatus.completedSteps.length} of{' '}
          {workflowStatus.workflow.totalSteps} steps completed
        </span>
      </div>

      {/* Action Buttons */}
      {workflowStatus.currentStep &&
        workflowStatus.status !== 'approved' &&
        workflowStatus.status !== 'rejected' && (
          <div style={styles.section}>
            <h4 style={styles.subHeading}>Actions</h4>
            <textarea
              style={styles.commentBox}
              placeholder="Add a comment (optional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div style={styles.buttonRow}>
              <button
                style={{ ...styles.button, ...styles.approveButton }}
                onClick={() => handleAction('approved')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : '✓ Approve'}
              </button>
              <button
                style={{ ...styles.button, ...styles.rejectButton }}
                onClick={() => handleAction('rejected')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : '✗ Reject'}
              </button>
            </div>
          </div>
        )}

      {/* Approval History / Logs */}
      <div style={styles.section}>
        <h4 style={styles.subHeading}>Approval History</h4>
        {workflowStatus.logs.length === 0 ? (
          <p style={styles.noLogs}>No activity recorded yet.</p>
        ) : (
          <div style={styles.logList}>
            {workflowStatus.logs.map((log, index) => (
              <div key={log.id || index} style={styles.logEntry}>
                <div style={styles.logHeader}>
                  <span
                    style={{
                      ...styles.logAction,
                      color: getActionColor(log.action),
                    }}
                  >
                    {log.action.toUpperCase()}
                  </span>
                  <span style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {log.comment && (
                  <p style={styles.logComment}>{log.comment}</p>
                )}
                <span style={styles.logStep}>Step: {log.stepId}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Steps */}
      {workflowStatus.pendingSteps.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.subHeading}>Upcoming Steps</h4>
          {workflowStatus.pendingSteps.map((step, i) => (
            <div key={i} style={styles.pendingStep}>
              <span>{step.stepName}</span>
              <span style={styles.stepMeta}>{step.stepType}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: '#6b7280',
    in_review: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    published: '#3b82f6',
    active: '#10b981',
  }
  return colors[status] || '#6b7280'
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    approved: '#10b981',
    rejected: '#ef4444',
    commented: '#3b82f6',
    started: '#8b5cf6',
    skipped: '#6b7280',
  }
  return colors[action] || '#6b7280'
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loading: {
    color: '#6b7280',
    padding: '40px',
    textAlign: 'center' as const,
  },
  error: {
    color: '#ef4444',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  noWorkflow: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6b7280',
  },
  heading: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#111827',
  },
  subHeading: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#374151',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  label: {
    fontSize: '14px',
    color: '#6b7280',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
  },
  section: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  stepCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  stepMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden' as const,
    marginBottom: '4px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '12px',
    color: '#6b7280',
  },
  commentBox: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    marginBottom: '12px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    padding: '8px 20px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  logEntry: {
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  logAction: {
    fontWeight: 600,
    fontSize: '12px',
  },
  logTime: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  logComment: {
    fontSize: '13px',
    color: '#374151',
    margin: '4px 0',
  },
  logStep: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  noLogs: {
    color: '#9ca3af',
    fontSize: '13px',
  },
  pendingStep: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    marginBottom: '4px',
    fontSize: '14px',
  },
}

export default WorkflowTab
