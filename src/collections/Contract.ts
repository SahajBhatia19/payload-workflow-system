import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Contract: CollectionConfig = {
  slug: 'contracts',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['contractName', 'amount', 'status', 'currentWorkflowStep', 'updatedAt'],
    useAsTitle: 'contractName',
    group: 'Content',
    components: {
      views: {
        edit: {
          workflowTab: {
            Component: '@/components/WorkflowTab',
            path: '/workflow',
            tab: {
              label: 'Workflow',
              href: '/workflow',
            },
          },
        },
      },
    },
  },
  fields: [
    {
      name: 'contractName',
      type: 'text',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description: 'Contract value in USD',
      },
    },
    {
      name: 'document',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Upload the contract document',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'In Review', value: 'in_review' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Active', value: 'active' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'workflow',
      type: 'relationship',
      relationTo: 'workflows' as any,
      admin: {
        position: 'sidebar',
        description: 'Assign a workflow to this contract',
      },
    },
    {
      name: 'currentWorkflowStep',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Current step index in the assigned workflow',
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}
