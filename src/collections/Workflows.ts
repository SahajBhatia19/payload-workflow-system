import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Workflows: CollectionConfig = {
  slug: 'workflows',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['workflowName', 'targetCollection', 'updatedAt'],
    useAsTitle: 'workflowName',
    group: 'Workflow System',
  },
  fields: [
    {
      name: 'workflowName',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'targetCollection',
      type: 'text',
      required: true,
      admin: {
        description:
          'The slug of the collection this workflow applies to (e.g. "blog", "contracts"). Must match a registered collection slug.',
      },
    },
    {
      name: 'steps',
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        description: 'Define the ordered steps of this workflow',
      },
      fields: [
        {
          name: 'stepName',
          type: 'text',
          required: true,
        },
        {
          name: 'stepOrder',
          type: 'number',
          required: true,
          admin: {
            description: 'Order of execution (0-indexed)',
          },
        },
        {
          name: 'assignedRole',
          type: 'select',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Reviewer', value: 'reviewer' },
            { label: 'Manager', value: 'manager' },
            { label: 'User', value: 'user' },
          ],
          admin: {
            description: 'Role required to complete this step',
          },
        },
        {
          name: 'assignedUser',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'Optionally assign a specific user to this step',
          },
        },
        {
          name: 'stepType',
          type: 'select',
          required: true,
          options: [
            { label: 'Approval', value: 'approval' },
            { label: 'Review', value: 'review' },
            { label: 'Sign Off', value: 'signoff' },
            { label: 'Comment', value: 'comment' },
          ],
        },
        {
          name: 'condition',
          type: 'json',
          admin: {
            description:
              'Optional JSON condition to evaluate before this step can proceed. Example: {"field": "amount", "operator": "gt", "value": 1000}',
          },
        },
        {
          name: 'nextStep',
          type: 'number',
          admin: {
            description:
              'The stepOrder of the next step to move to after completion. Leave empty to proceed sequentially.',
          },
        },
      ],
    },
  ],
  timestamps: true,
}
