import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'

export const Blog: CollectionConfig = {
  slug: 'blog',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'status', 'currentWorkflowStep', 'updatedAt'],
    useAsTitle: 'title',
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
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
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
        { label: 'Published', value: 'published' },
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
        description: 'Assign a workflow to this blog post',
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
