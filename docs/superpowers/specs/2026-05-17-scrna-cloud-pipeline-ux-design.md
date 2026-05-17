# Single-cell Cloud Pipeline UX Optimization Design

## Context

The current single-cell cloud pipeline is implemented mainly in:

- `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.vue`
- `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue`
- `apps/web-antdv-next/src/api/pipeline.ts`
- `backend/app/pipeline/service/pipeline_service.py`
- `backend/app/task/tasks/run_pipeline.py`

The first optimization pass focuses on frontend experience. Backend changes should be minimal and only support clearer status, errors, and logs where needed.

## Goals

- Make the cloud pipeline feel like a professional bioinformatics analysis workspace, not a generic admin page.
- Improve the main user path: pipeline home -> create project -> enter detail page -> run steps -> inspect results.
- Serve mixed users: friendly defaults for less experienced users, with advanced parameters folded away for experienced users.
- Keep the visual style clean, high-end, and practical: biotech platform feel plus professional SaaS workspace density.
- Avoid broad brand redesign. Only the cloud pipeline area is in scope.

## Non-goals

- Redesigning the whole BioCloud site or global navigation.
- Reworking the whole backend execution model.
- Moving sample grouping into project creation.
- Adding an explicit global expert-mode switch in the first version.
- Implementing spatial transcriptomics in this pass.

## Chosen Approach

Use a main-path frontend reconstruction.

The current modal-based creation flow will become a dedicated creation/configuration page. The detail page will change from left-side step navigation to a top horizontal stepper with a two-column step workspace.

This gives the strongest professional UX improvement while keeping backend risk controlled.

## Page Architecture

### Cloud Pipeline Home: `/pipeline`

The page becomes a lightweight workspace entry instead of a plain card grid.

It should show:

- A restrained page header for "云流程".
- A primary single-cell RNA-seq flow card.
- Supported input types and expected outputs.
- A compact 6-step mini-flow.
- A clear "创建分析项目" action.
- A lower-priority "空间转录组" coming-soon card.

The page may later show recent projects and running tasks, but first implementation should keep this area simple.

### Create Project Page: `/pipeline/create?type=scrna`

This replaces the current "新建分析项目" modal.

Layout:

- Left side: project form.
- Right side: sticky pipeline summary.
- Bottom of form: cancel and create actions.

Form fields:

- Project name.
- Sample data folder.
- Species.
- Optional description.

The data folder selector should be extracted into its own component instead of keeping the tree selector embedded inside `PipelineList.vue`.

Creation page does not scan or edit sample grouping. After creation, the user is sent to the detail page, where step 1 handles sample scanning and grouping.

### Pipeline Detail Page: `/pipeline/:id`

The detail page uses:

- Header with project name, description, and high-level status.
- Top horizontal 6-step stepper.
- Current step workspace below.

The stepper shows:

- Step number.
- Step label.
- Status: pending, running, completed, error.
- Overall completed count.

The current step workspace uses a two-column layout:

- Left: step parameters and actions.
- Right: result preview.

Logs and help content open in drawers. They should not occupy the primary workspace by default.

## Step Workspace Design

### Left Column: Parameters and Actions

The left column should show what the user needs to do next.

Rules:

- Required/core parameters are visible by default.
- Advanced parameters are grouped in a collapsed "高级参数" section.
- The run button is prominent and local to the current step.
- Re-run is available for completed steps.
- Data loading step keeps sample table editing here after project creation.

For step 1, the user edits sample name and group after sample folders are loaded from the selected data path.

### Right Column: Results

The right column is result-first, even before the step has run.

States:

- Pending: show expected outputs and a short empty state.
- Running: show progress state, recent logs preview, and "查看日志".
- Completed: show metrics, main chart, tables/files.
- Error: show failure summary, recent log excerpt, full logs button, and rerun action.

Completed result layout:

- Top compact metrics strip.
- Main chart preview area.
- Secondary chart selector where multiple charts exist.
- Tables and files section with download/save/reuse actions.

Result priority is:

1. Metrics and key images together.
2. Tables and output files clearly visible.
3. Logs available but not dominant.

## Visual Direction

Use a clean biotech/SaaS workspace style.

Guidelines:

- Light gray page background.
- White working surfaces.
- Fine borders and restrained shadows.
- Blue, cyan, and green accents.
- Clear status colors for pending/running/completed/error.
- Avoid large decorative gradients, floating decorative circles, and marketing-heavy hero sections.
- Prefer dense but readable controls over oversized landing-page composition.

The design should feel serious and trustworthy, while still being easy for less experienced users.

## Data Flow

Existing APIs remain the backbone:

- `POST /api/v1/pipelines`
- `GET /api/v1/pipelines`
- `GET /api/v1/pipelines/:id`
- `PUT /api/v1/pipelines/:id/sample-dict`
- `POST /api/v1/pipelines/:id/steps/:step_index/run`
- `GET /api/v1/pipelines/:id/steps/:step_index/logs`
- Existing result helper endpoints such as dotplot, featureplot, celltypes, and save-h5ad.

Main flow:

1. User opens `/pipeline`.
2. User chooses the single-cell flow and enters `/pipeline/create?type=scrna`.
3. User creates a project.
4. Frontend redirects to `/pipeline/:id`.
5. Detail page loads pipeline state and selects `currentStep`.
6. Step 1 loads sample folders and allows sample name/group editing.
7. User runs steps sequentially.
8. During execution, frontend polls pipeline detail and logs.
9. On completion, the right result panel refreshes.

## Backend Support

Backend work should be limited to support better UX:

- Return clear error messages for project creation and step execution.
- Prevent running a step when prerequisites are incomplete.
- Keep Pipeline and AnalysisTask statuses synchronized:
  - running when any step is running.
  - error or failed when a step fails.
  - completed when all required steps complete.
- Consolidate step log path mapping, because log directory mapping currently exists in more than one place.

The existing execution directory structure and Celery task model should remain unchanged in this pass.

## Error Handling

### Create Project

- Field validation remains immediate on the frontend.
- API errors appear in the page form area.
- Data folder tree loading failure shows a retry action.

### Step Execution

When a step fails:

- Stepper shows an error state.
- Result panel shows a failure summary.
- Recent log lines are visible.
- Full log drawer is one click away.
- Re-run action is available when safe.

### Result Loading

Image, table, and file-loading errors should be local to the result section. A broken chart or table fetch should not break the entire page.

## Components To Extract

Likely frontend component boundaries:

- `PipelineHomeHero` or `PipelineCatalog`.
- `PipelineTypeCard`.
- `PipelineCreatePage`.
- `PipelineDataFolderSelector`.
- `PipelineStepper`.
- `StepWorkspace`.
- `StepParameterPanel`.
- `StepResultPanel`.
- `StepLogDrawer`.
- `StepHelpDrawer`.
- `SampleGroupTable`.

These boundaries keep `PipelineList.vue` and `PipelineDetail.vue` from continuing to grow as monolithic files.

## Testing Strategy

Frontend tests:

- Create page validation.
- Data folder selector loading, lazy loading, and selection.
- Stepper status rendering.
- Step workspace pending/running/completed/error states.
- Result panel empty state, completed chart state, and error state.

Backend tests, if backend support changes are made:

- Cannot run later step before prerequisite completion.
- Failed step updates Pipeline and AnalysisTask status.
- Completed final step updates Pipeline and AnalysisTask status.
- Logs endpoint resolves the same directory mapping used by execution.

Manual validation:

1. Create a single-cell project.
2. Enter detail page.
3. Edit sample names/groups in step 1.
4. Run step 1.
5. Confirm logs stream and final result panel appears.
6. Confirm completed status is visible in the top stepper.

## Implementation Decisions

- Defer recent projects and running-task summaries on `/pipeline`. The first implementation keeps the home page focused on the main single-cell flow entry and a subdued coming-soon card.
- Implement the create project experience as a new route/page component instead of branching inside `PipelineList.vue`.
- Include only small backend support changes in the first implementation plan: clearer errors, prerequisite checks, status synchronization, and consolidated log path mapping. Do not redesign Celery execution or output directories.
