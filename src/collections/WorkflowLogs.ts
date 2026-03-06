import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const WorkflowLogs: CollectionConfig = {
  slug: 'workflow-logs',
  access: {
    create: authenticated,
    // Logs are immutable — no updates or deletes allowed
    delete: () => false,
    read: authenticated,
    update: () => false,
  },
  admin: {
    defaultColumns: ['collection', 'documentId', 'action', 'user', 'timestamp'],
    group: 'Workflow System',
  },
  fields: [
    {
      name: 'workflowId',
      type: 'relationship',
      relationTo: 'workflows' as any,
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'documentId',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description: 'The ID of the document this log entry belongs to',
      },
    },
    {
      name: 'collection',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description: 'The collection slug of the document',
      },
    },
    {
      name: 'stepId',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
        description: 'The step order index when this action was taken',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Commented', value: 'commented' },
        { label: 'Skipped', value: 'skipped' },
        { label: 'Started', value: 'started' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'comment',
      type: 'textarea',
      admin: {
        readOnly: true,
        description: 'Optional comment provided during the action',
      },
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  timestamps: true,
}
