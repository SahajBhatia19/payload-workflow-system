/**
 * Workflow Seed Script
 *
 * Creates demo users, a sample workflow, and a blog post to demonstrate
 * the workflow management system.
 *
 * Usage: npx tsx src/endpoints/seed/workflow-seed.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import { getPayload } from 'payload'
import config from '@payload-config'

async function seed() {
  console.log('🌱 Starting workflow seed...\n')

  const payload = await getPayload({ config })

  // ── 1. Create Users ──────────────────────────────────────────────────
  console.log('Creating users...')

  const adminUser = await payload.create({
    collection: 'users',
    data: {
      name: 'Admin User',
      email: 'admin2@example.com',
      password: 'admin123',
      role: 'admin',
    } as any,
  })
  console.log(`  ✓ Admin User created (${adminUser.id})`)

  const reviewerUser = await payload.create({
    collection: 'users',
    data: {
      name: 'Reviewer User',
      email: 'reviewer@example.com',
      password: 'reviewer123',
      role: 'reviewer',
    } as any,
  })
  console.log(`  ✓ Reviewer User created (${reviewerUser.id})`)

  const managerUser = await payload.create({
    collection: 'users',
    data: {
      name: 'Manager User',
      email: 'manager@example.com',
      password: 'manager123',
      role: 'manager',
    } as any,
  })
  console.log(`  ✓ Manager User created (${managerUser.id})`)

  // ── 2. Create Blog Approval Workflow ─────────────────────────────────
  console.log('\nCreating workflows...')

  const blogWorkflow = await payload.create({
    collection: 'workflows' as any,
    data: {
      workflowName: 'Blog Approval Workflow',
      targetCollection: 'blog',
      steps: [
        {
          stepName: 'Content Review',
          stepOrder: 0,
          assignedRole: 'reviewer',
          assignedUser: reviewerUser.id,
          stepType: 'review',
          condition: null,
          nextStep: 1,
        },
        {
          stepName: 'Manager Approval',
          stepOrder: 1,
          assignedRole: 'manager',
          assignedUser: managerUser.id,
          stepType: 'approval',
          condition: null,
          nextStep: 2,
        },
        {
          stepName: 'Final Sign Off',
          stepOrder: 2,
          assignedRole: 'admin',
          assignedUser: adminUser.id,
          stepType: 'signoff',
          condition: null,
          nextStep: null,
        },
      ],
    },
  })
  console.log(`  ✓ Blog Approval Workflow created (${blogWorkflow.id})`)

  // ── 3. Create Contract Approval Workflow ─────────────────────────────
  const contractWorkflow = await payload.create({
    collection: 'workflows' as any,
    data: {
      workflowName: 'Contract Approval Workflow',
      targetCollection: 'contracts',
      steps: [
        {
          stepName: 'Legal Review',
          stepOrder: 0,
          assignedRole: 'reviewer',
          stepType: 'review',
          condition: null,
          nextStep: 1,
        },
        {
          stepName: 'Financial Approval',
          stepOrder: 1,
          assignedRole: 'manager',
          stepType: 'approval',
          condition: { field: 'amount', operator: 'gt', value: 0 },
          nextStep: 2,
        },
        {
          stepName: 'Executive Sign Off',
          stepOrder: 2,
          assignedRole: 'admin',
          stepType: 'signoff',
          condition: null,
          nextStep: null,
        },
      ],
    },
  })
  console.log(`  ✓ Contract Approval Workflow created (${contractWorkflow.id})`)

  // ── 4. Create a sample Blog post ─────────────────────────────────────
  console.log('\nCreating sample documents...')

  const blogPost = await payload.create({
    collection: 'blog' as any,
    data: {
      title: 'Getting Started with Payload CMS',
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'This is a sample blog post that demonstrates the workflow management system. When a workflow is assigned, it will go through review, approval, and sign-off stages.',
                },
              ],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      status: 'draft',
      workflow: blogWorkflow.id,
    },
  })
  console.log(`  ✓ Sample Blog post created (${blogPost.id})`)

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50))
  console.log('🎉 Seed completed successfully!\n')
  console.log('Demo Credentials:')
  console.log('  Admin:    admin@example.com / admin123')
  console.log('  Reviewer: reviewer@example.com / reviewer123')
  console.log('  Manager:  manager@example.com / manager123')
  console.log('\nWorkflows Created:')
  console.log(`  Blog Approval Workflow (ID: ${blogWorkflow.id})`)
  console.log(`  Contract Approval Workflow (ID: ${contractWorkflow.id})`)
  console.log('\nSample Documents:')
  console.log(`  Blog Post: "${blogPost.title}" (ID: ${blogPost.id})`)
  console.log('═'.repeat(50) + '\n')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
