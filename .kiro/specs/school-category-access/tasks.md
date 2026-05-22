# Implementation Plan: School Category Access

## Overview

Implement category-based access control for schools. The work is split into five sequential phases: (1) backend data model, (2) backend API endpoints, (3) PDF access filtering, (4) shared API client, (5) frontend UI updates.

## Tasks

- [x] 1. Add `SchoolCategoryAccess` SQLAlchemy model
  - Add `SchoolCategoryAccess` class to `apps/api/app/models/school.py` with columns `id`, `school_id` (FK → schools.id CASCADE DELETE), `category_id` (FK → categories.id CASCADE DELETE), `created`, and a `UniqueConstraint("school_id", "category_id")`
  - Add `category_access` relationship to the existing `School` model
  - Add `school_access` relationship to the `Category` model in `apps/api/app/models/category.py`
  - Add `SchoolCategoryAccess` import to `apps/api/app/models/__init__.py` so `Base.metadata.create_all` picks up the new table
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Implement `school_categories` router
  - [x] 2.1 Create `apps/api/app/routers/school_categories.py` with three endpoints mounted at `/api/schools/{school_id}/categories`
    - `GET /api/schools/{school_id}/categories` — query `SchoolCategoryAccess` joined with `Category`, return `{ items: [{id, categoryId, categoryName, categoryType, isActive}] }`
    - `POST /api/schools/{school_id}/categories` — accept `{ categoryIds: [str] }`, validate school exists (404), validate each category exists (404), skip or 409 on duplicates, bulk-insert new assignments
    - `DELETE /api/schools/{school_id}/categories/{category_id}` — delete the matching assignment row, 404 if not found
    - All three endpoints must use `require_admin` dependency
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.2 Write property tests for `school_categories` router
    - Create `apps/api/tests/test_school_categories_props.py` using Hypothesis with an async test client
    - **Property 1: Assign-retrieve round trip** — for any valid set of category IDs, assign then GET returns exactly those IDs. **Validates: Requirements 1.1, 1.2**
    - **Property 2: Assign-remove round trip** — assign a category, remove it, GET no longer contains it. **Validates: Requirements 1.3**
    - **Property 3: Duplicate assignment prevention** — assigning the same category twice returns 409 and count stays 1. **Validates: Requirements 1.4**
    - **Property 4: Admin-only authorization** — non-admin JWT on POST/DELETE returns 403. **Validates: Requirements 1.7**
    - **Property 9: Category deletion cascades** — deleting a category removes its `school_category_access` rows. **Validates: Requirements 5.1**
    - **Property 10: School deletion cascades** — deleting a school removes its `school_category_access` rows. **Validates: Requirements 5.2**

  - [x] 2.3 Register the new router in `apps/api/app/main.py`
    - Import `school_categories` router and add it to the `include_router` loop alongside the existing routers
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Checkpoint — ensure backend model and router are wired correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add PDF access filtering for school-role users
  - [x] 4.1 Add `_get_school_category_ids` helper and school-role filter to `apps/api/app/routers/pdfs.py`
    - Define `SCHOOL_ROLES = {"school", "school_admin", "school_viewer", "teacher"}` constant
    - Implement `async def _get_school_category_ids(db, school_id) -> list[str]` that queries `SchoolCategoryAccess` and returns the list of assigned category IDs (empty list if none)
    - In `list_pdfs`: if `current_user.role in SCHOOL_ROLES`, return empty result when `school_id` is unset or no categories assigned; otherwise add `q.where(PDF.category_id.in_(allowed))`
    - In `get_pdf`: if school-role user, call `_get_school_category_ids` and raise `HTTPException(403)` if `pdf.category_id not in allowed`
    - In `download_pdf`: same 403 guard as `get_pdf`
    - Admin/moderator roles must remain completely unaffected
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Write property tests for PDF access filtering
    - Create `apps/api/tests/test_pdf_access_props.py` using Hypothesis
    - **Property 5: PDF list filtered to assigned categories** — every PDF in the list response for a school user has `category_id` in the school's assigned set. **Validates: Requirements 2.1, 2.4**
    - **Property 6: Unauthorized PDF access returns 403** — GET and download of a PDF outside assigned categories returns 403 for school users. **Validates: Requirements 2.2, 2.3**
    - **Property 7: Admin users receive unfiltered results** — admin JWT returns all PDFs regardless of any school-category assignments. **Validates: Requirements 2.5**

- [x] 5. Checkpoint — ensure PDF filtering tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add `schoolCategoryApi` to the shared API client
  - [x] 6.1 Add `schoolCategoryApi` export to `packages/shared/src/api/schools.js`
    - Append `export const schoolCategoryApi` with three methods: `listAssignedCategories(schoolId)`, `assignCategories(schoolId, categoryIds)`, `removeCategory(schoolId, categoryId)` using the existing `apiFetch` helper
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 6.2 Export `schoolCategoryApi` from `packages/shared/src/api/index.js`
    - Add `export { schoolCategoryApi } from './schools.js'` to the barrel file
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 7. Build `CategoryAccessPanel` admin UI component
  - [x] 7.1 Create `apps/web/src/components/admin/schools/CategoryAccessPanel.jsx`
    - On mount, fetch assigned categories via `schoolCategoryApi.listAssignedCategories(schoolId)` and all active categories via the existing `categoriesApi`
    - Render assigned categories as removable badges; clicking the remove icon calls `schoolCategoryApi.removeCategory` and refreshes the list
    - Render unassigned categories as a checklist; a "Save" / "Assign" button calls `schoolCategoryApi.assignCategories` with the checked IDs and refreshes
    - Show `toast.error` on any API failure per Requirement 3.5
    - Show an empty-state message when no categories are assigned
    - Props: `{ schoolId: string }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.2 Integrate `CategoryAccessPanel` into `SchoolDetailsModal`
    - Add a third `TabsTrigger` with value `"categories"` and a badge showing the assigned count to the existing `TabsList` in `apps/web/src/components/admin/schools/SchoolDetailsModal.jsx`
    - Add the corresponding `TabsContent` that renders `<CategoryAccessPanel schoolId={schoolId} />`
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Update School Portal to use assigned categories
  - [x] 8.1 Update `apps/web/src/pages/school/SchoolPortal.jsx`
    - Replace the PocketBase `categories` collection call with `schoolCategoryApi.listAssignedCategories(currentUser.schoolId)` for the "Featured Categories" grid and the stats count
    - Import `schoolCategoryApi` from the shared package (or directly from `packages/shared/src/api/schools.js`)
    - Map the API response shape `{ items: [{categoryId, categoryName, ...}] }` to the existing card rendering
    - _Requirements: 4.1, 4.3_

  - [x] 8.2 Update `apps/web/src/pages/school/SchoolPortalContent.jsx`
    - Replace the PocketBase grade-filtered `categories` fetch in `fetchCategories` with `schoolCategoryApi.listAssignedCategories(school.id)` (school prop already available)
    - Remove the `gradeFilters` logic — the server now controls which categories are visible
    - Replace the PocketBase `pdfs` fetch in `fetchPdfs` with a call to `GET /api/pdfs` (via `pdfsApi` or `apiFetch`) filtered by `subCategoryId`, so the backend access-control filter applies automatically
    - Show the existing empty-state message when the assigned category list is empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Final checkpoint — ensure all tests pass and feature is fully wired
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The `SCHOOL_ROLES` set in `pdfs.py` should match the roles defined in `auth.py` (`school`, `school_admin`, `school_viewer`, `teacher`)
- The `SchoolCategoryAccess` model uses the same `gen_id()` helper already present in `school.py`
- Property tests require Hypothesis (`pip install hypothesis`) and an async test client (e.g., `httpx.AsyncClient` with the FastAPI app)
