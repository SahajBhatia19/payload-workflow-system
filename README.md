# Dynamic Workflow Management System

A modular, scalable workflow management system built with **Payload CMS v3**, **Next.js 15**, **TypeScript**, and **MongoDB**.

Users can create, assign, and track multi-stage approval workflows for any collection (Blog, Contract, etc.) with unlimited steps, role-based assignments, conditional branching, and immutable audit logs.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Collections](#collections)
- [Workflow Engine](#workflow-engine)
- [REST APIs](#rest-apis)
- [Admin UI](#admin-ui)
- [Seed Data & Demo Credentials](#seed-data--demo-credentials)
- [Sample Workflows](#sample-workflows)
- [Deployment](#deployment)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Payload Admin UI                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Blog Editor  │  │Contract Editor│  │ Workflow Tab   │  │
│  │ + Workflow   │  │ + Workflow    │  │ (Approve/Reject│  │
│  │   Tab        │  │   Tab         │  │  + History)    │  │
│  └──────┬───────┘  └──────┬────────┘  └───────┬────────┘  │
│         │                 │                   │           │
│  ┌──────▼─────────────────▼───────────────────▼────────┐  │
│  │              Workflow Engine Plugin                   │  │
│  │  • Watches collections dynamically                   │  │
│  │  • Injects afterChange + beforeChange hooks          │  │
│  │  • Enforces role-based step locking                  │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │              Workflow Service                        │  │
│  │  • startWorkflow()    • evaluateStep()              │  │
│  │  • moveToNextStep()   • recordLog()                 │  │
│  │  • getWorkflowStatus()                              │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Condition Evaluator                        │  │
│  │  • equals, not_equals, gt, lt, gte, lte, contains   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               REST API Routes                        │  │
│  │  POST /api/workflows/trigger                        │  │
│  │  GET  /api/workflows/status/:docId                  │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │ MongoDB │
                    └─────────┘
```

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Payload CMS | 3.79.0 | Headless CMS framework |
| Next.js | 15.4.x | Full-stack React framework |
| TypeScript | 5.7.x | Type safety |
| MongoDB | via Mongoose adapter | Database |
| React | 19.x | Admin UI components |

---

## Project Structure

```
src/
├── access/                      # Access control functions
│   ├── anyone.ts                # Public access
│   ├── authenticated.ts         # Authenticated users only
│   └── authenticatedOrPublished.ts
├── collections/                 # Payload CMS collection definitions
│   ├── Blog.ts                  # Blog posts with workflow integration
│   ├── Contract.ts              # Contracts with workflow integration
│   ├── Workflows.ts             # Workflow definitions with steps
│   ├── WorkflowLogs.ts          # Immutable audit logs
│   ├── Users/                   # Users with role field
│   ├── Pages/                   # CMS pages (existing)
│   ├── Posts/                   # Blog posts (existing)
│   ├── Categories.ts            # Categories (existing)
│   └── Media.ts                 # Media uploads (existing)
├── services/
│   └── workflowService.ts       # Core workflow engine logic
├── hooks/
│   └── triggerWorkflow.ts       # afterChange hook for auto-triggering
├── plugins/
│   ├── workflowEngine.ts        # Payload plugin for dynamic hook injection
│   └── index.ts                 # Plugin registry
├── utilities/
│   └── conditionEvaluator.ts    # JSON condition evaluation engine
├── components/
│   └── WorkflowTab/
│       └── index.tsx            # Admin UI workflow panel
├── app/(payload)/api/workflows/
│   ├── trigger/route.ts         # POST endpoint
│   └── status/[docId]/route.ts  # GET endpoint
├── endpoints/seed/
│   └── workflow-seed.ts         # Seed script for demo data
└── payload.config.ts            # Main Payload configuration
```

### Folder Purpose

| Folder | Purpose |
|---|---|
| `collections/` | Payload collection schemas — defines fields, access control, and admin UI overrides |
| `services/` | Business logic layer — the workflow engine core |
| `hooks/` | Payload lifecycle hooks — triggered on document create/update |
| `plugins/` | Payload plugins — dynamically inject hooks into watched collections |
| `utilities/` | Pure utility functions — condition evaluation for workflow steps |
| `components/` | React components for Payload admin UI customization |
| `app/(payload)/api/` | Next.js API routes — REST endpoints for workflow operations |
| `endpoints/seed/` | Database seeding scripts |

---

## Setup Instructions

### Prerequisites

- Node.js >= 20.9.0
- MongoDB (local or Atlas)
- pnpm (recommended) or npm

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd payload-cms-project
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```env
DATABASE_URL=mongodb://127.0.0.1/payload-cms-project
PAYLOAD_SECRET=your-secret-key-here
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000/admin` to access the admin panel.

### 4. Seed Demo Data (Optional)

```bash
pnpm seed:workflow
```

This creates demo users, workflows, and a sample blog post.

---

## Collections

### Users

Extended with a `role` field for workflow step assignments.

| Field | Type | Description |
|---|---|---|
| name | text | User's display name |
| email | email | Login email (built-in) |
| role | select | `admin` \| `reviewer` \| `manager` \| `user` |

### Blog

| Field | Type | Description |
|---|---|---|
| title | text | Blog post title |
| content | richText | Post content (Lexical editor) |
| status | select | `draft` \| `in_review` \| `approved` \| `rejected` \| `published` |
| workflow | relationship | Linked workflow definition |
| currentWorkflowStep | number | Current step index (auto-managed) |

### Contract

| Field | Type | Description |
|---|---|---|
| contractName | text | Contract title |
| amount | number | Contract value in USD |
| document | upload | Contract file (via Media) |
| status | select | `draft` \| `in_review` \| `approved` \| `rejected` \| `active` |
| workflow | relationship | Linked workflow definition |
| currentWorkflowStep | number | Current step index (auto-managed) |

### Workflows

| Field | Type | Description |
|---|---|---|
| workflowName | text | Unique workflow name |
| targetCollection | text | Collection slug this workflow applies to |
| steps | array | Ordered list of workflow steps |

Each **step** contains:

| Field | Type | Description |
|---|---|---|
| stepName | text | Human-readable step name |
| stepOrder | number | Execution order (0-indexed) |
| assignedRole | select | Role required for this step |
| assignedUser | relationship | Optionally assign a specific user |
| stepType | select | `approval` \| `review` \| `signoff` \| `comment` |
| condition | json | Optional condition to evaluate before proceeding |
| nextStep | number | Explicit next step (or sequential by default) |

### WorkflowLogs (Immutable)

| Field | Type | Description |
|---|---|---|
| workflowId | relationship | Parent workflow |
| documentId | text | Target document ID |
| collection | text | Target collection slug |
| stepId | number | Step order when action occurred |
| user | relationship | User who performed the action |
| action | select | `approved` \| `rejected` \| `commented` \| `skipped` \| `started` |
| comment | textarea | Optional comment |
| timestamp | date | When the action occurred |

> **Immutable**: Update and Delete are blocked via access control.

---

## Workflow Engine

### Service Functions

| Function | Description |
|---|---|
| `startWorkflow()` | Initialize workflow on a document, set first step, record log |
| `evaluateStep()` | Check step conditions against document data |
| `moveToNextStep()` | Advance workflow (or reject), record log, send notifications |
| `recordLog()` | Create immutable audit log entry |
| `getWorkflowStatus()` | Return full workflow state for a document |

### Condition Evaluator

Supports JSON-based conditions with operators:

```json
{ "field": "amount", "operator": "gt", "value": 1000 }
```

| Operator | Description |
|---|---|
| `equals` | Exact match |
| `not_equals` | Not equal |
| `gt` / `lt` | Greater/less than |
| `gte` / `lte` | Greater/less than or equal |
| `contains` | String/array contains value |

---

## REST APIs

### POST `/api/workflows/trigger`

Start or advance a workflow on a document.

**Request Body:**

```json
{
  "documentId": "abc123",
  "collection": "blog",
  "workflowId": "wf456",
  "action": "approved",
  "comment": "Looks good!"
}
```

- Omit `action` to start a workflow
- Set `action` to `"approved"` or `"rejected"` to advance

**Response:**

```json
{
  "success": true,
  "message": "Moved to next step",
  "result": { "completed": false, "nextStep": { "stepName": "Manager Approval" } },
  "document": { ... }
}
```

### GET `/api/workflows/status/:docId?collection=blog`

Get full workflow status for a document.

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "abc123",
    "collection": "blog",
    "status": "in_review",
    "workflow": {
      "id": "wf456",
      "name": "Blog Approval Workflow",
      "totalSteps": 3
    },
    "currentStep": {
      "stepName": "Content Review",
      "stepOrder": 0,
      "stepType": "review",
      "assignedRole": "reviewer"
    },
    "completedSteps": [],
    "pendingSteps": [
      { "stepName": "Manager Approval", "stepOrder": 1 },
      { "stepName": "Final Sign Off", "stepOrder": 2 }
    ],
    "logs": [ ... ]
  }
}
```

---

## Admin UI

The **Workflow Tab** appears on Blog and Contract edit pages and shows:

- **Current Step** — name, type, and assigned role
- **Progress Bar** — visual progress through workflow stages
- **Approve / Reject Buttons** — with optional comment input
- **Approval History** — timestamped log of all actions taken
- **Upcoming Steps** — remaining steps in the workflow

---

## Seed Data & Demo Credentials

Run `pnpm seed:workflow` to create:

### Users

| Name | Email | Password | Role |
|---|---|---|---|
| Admin User | admin@example.com | admin123 | admin |
| Reviewer User | reviewer@example.com | reviewer123 | reviewer |
| Manager User | manager@example.com | manager123 | manager |

### Workflows

1. **Blog Approval Workflow** (3 steps): Content Review → Manager Approval → Final Sign Off
2. **Contract Approval Workflow** (3 steps): Legal Review → Financial Approval → Executive Sign Off

### Sample Documents

- One blog post titled "Getting Started with Payload CMS" linked to the Blog Approval Workflow

---

## Sample Workflows

### Blog Approval Flow

```
Draft → [Reviewer: Content Review] → [Manager: Approval] → [Admin: Sign Off] → Approved
                                              ↓ (reject)
                                          Rejected
```

### Contract Approval Flow (with conditions)

```
Draft → [Reviewer: Legal Review] → [Manager: Financial Approval (amount > 0)] → [Admin: Executive Sign Off] → Active
```

---

## Deployment

### Deploy to Vercel + MongoDB Atlas

#### 1. Set Up MongoDB Atlas

1. Create an account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster (M0)
3. Add a database user with read/write access
4. Whitelist `0.0.0.0/0` for network access (or use Vercel's IP range)
5. Copy the connection string: `mongodb+srv://user:pass@cluster.mongodb.net/payload-cms-project`

#### 2. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Set **Framework Preset** to `Next.js`
4. Add environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your MongoDB Atlas connection string |
| `PAYLOAD_SECRET` | A secure random string |
| `NEXT_PUBLIC_SERVER_URL` | Your Vercel deployment URL |
| `CRON_SECRET` | A secret for cron job authentication |

5. Deploy

#### 3. Post-Deployment

- Visit `https://your-app.vercel.app/admin` to access the admin panel
- Create your first admin user
- Run the seed script locally pointed at the Atlas DB to populate demo data

---

## License

MIT
