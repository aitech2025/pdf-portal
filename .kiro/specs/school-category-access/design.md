# Design Document: School Category Access

## Overview

This feature adds category-based access control to the platform. Currently all school users can browse every approved PDF regardless of category. The new system introduces a `SchoolCategoryAccess` join table that records which categories each school is permitted to access. Backend PDF endpoints enforce this restriction for school-role users, while the admin UI gains a panel to manage assignments and the school portal is updated to show only permitted content.

The design is additive — no existing data is deleted and admin users are completely unaffected by the new filtering logic.

---

## Architecture

```mermaid
graph TD
    A[Admin UI - CategoryAccessPanel] -->|POST/DELETE /api/schools/{id}/categories| B[schools router]
    C[School Portal - SchoolPortalContent] -->|GET /api/pdfs| D[pdfs router]
    C -->|GET /api/schools/{id}/categories| B
    B -->|reads/writes| E[(school_category_access table)]
    D -->|filters by assigned categories| E
    E -->|FK cascade| F[(schools table)]
    E -->|FK cascade| G[(categories table)]
```

The access control filter lives entirely in the backend. The frontend never enforces access — it only uses the API responses to drive display logic.

---

## Components and Interfaces

### Backend

#### `SchoolCategoryAccess` model (`apps/api/app/models/school.py`)

New SQLAlchemy model added to the existing `school.py` file.

```python
class SchoolCategoryAccess(Base):
    __tablename__ = "school_category_access"
    id: Mapped[str]           # PK, gen_id()
    school_id: Mapped[str]    # FK → schools.id, CASCADE DELETE
    category_id: Mapped[str]  # FK → categories.id, CASCADE DELETE
    created: Mapped[DateTime]
    # UniqueConstraint("school_id", "category_id")
```

Relationships added to `School`: `category_access: list[SchoolCategoryAccess]`
Relationships added to `Category`: `school_access: list[SchoolCategoryAccess]`

#### New router: `apps/api/app/routers/school_categories.py`

Mounted at `/api/schools/{school_id}/categories`. All endpoints require `require_admin`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/schools/{school_id}/categories` | List assigned categories for a school |
| `POST` | `/api/schools/{school_id}/categories` | Assign one or more categories (`body: {categoryIds: [str]}`) |
| `DELETE` | `/api/schools/{school_id}/categories/{category_id}` | Remove a single category assignment |

Response shape for GET:
```json
{
  "items": [
    { "id": "...", "categoryId": "...", "categoryName": "...", "categoryType": "...", "isActive": true }
  ]
}
```

#### Modified: `apps/api/app/routers/pdfs.py`

`list_pdfs` and `download_pdf` (and `get_pdf`) gain school-role filtering:

```python
SCHOOL_ROLES = {"school", "school_admin", "school_viewer", "teacher"}

async def _get_school_category_ids(db, school_id) -> list[str]:
    """Return list of category IDs assigned to a school. Empty list if none."""
    ...

# In list_pdfs:
if current_user.role in SCHOOL_ROLES:
    if not current_user.school_id:
        return {"items": [], "totalItems": 0, ...}
    allowed = await _get_school_category_ids(db, current_user.school_id)
    if not allowed:
        return {"items": [], "totalItems": 0, ...}
    q = q.where(PDF.category_id.in_(allowed))

# In get_pdf and download_pdf:
if current_user.role in SCHOOL_ROLES:
    allowed = await _get_school_category_ids(db, current_user.school_id)
    if pdf.category_id not in allowed:
        raise HTTPException(403, "Access denied")
```

#### Modified: `apps/api/app/main.py`

Import and register the new `school_categories` router.

#### Modified: `apps/api/app/models/__init__.py`

Add `SchoolCategoryAccess` to the imports so `Base.metadata.create_all` picks it up.

### Shared API Client

#### Modified: `packages/shared/src/api/schools.js`

Add `schoolCategoryApi` export:

```js
export const schoolCategoryApi = {
  listAssignedCategories: (schoolId) =>
    apiFetch(`/api/schools/${schoolId}/categories`),
  assignCategories: (schoolId, categoryIds) =>
    apiFetch(`/api/schools/${schoolId}/categories`, 'POST', { categoryIds }),
  removeCategory: (schoolId, categoryId) =>
    apiFetch(`/api/schools/${schoolId}/categories/${categoryId}`, 'DELETE'),
};
```

### Web Admin UI

#### New component: `apps/web/src/components/admin/schools/CategoryAccessPanel.jsx`

A self-contained panel that:
- Fetches the school's currently assigned categories via `schoolCategoryApi.listAssignedCategories`
- Fetches all active categories via `categoriesApi.listCategories`
- Renders assigned categories as removable badges
- Renders unassigned categories as a checklist for bulk assignment
- Calls `schoolCategoryApi.assignCategories` / `schoolCategoryApi.removeCategory` on user action
- Shows toast on success/error

Props: `{ schoolId: string }`

#### Modified: `apps/web/src/components/admin/schools/SchoolDetailsModal.jsx`

Add a third tab "Categories" alongside "Overview" and "Users":

```jsx
<TabsTrigger value="categories">
  Categories
  <Badge>{assignedCount}</Badge>
</TabsTrigger>
...
<TabsContent value="categories">
  <CategoryAccessPanel schoolId={schoolId} />
</TabsContent>
```

### Web School Portal

#### Modified: `apps/web/src/pages/school/SchoolPortalContent.jsx`

Replace the current PocketBase-direct category fetch with an API call to `GET /api/schools/{schoolId}/categories` (via `schoolCategoryApi.listAssignedCategories`). The returned list is used directly as the category grid — no client-side grade filtering needed since the server now controls access.

PDF fetching already goes through the backend `/api/pdfs` endpoint (or will after migration from PocketBase direct calls), which applies the server-side filter automatically.

#### Modified: `apps/web/src/pages/school/SchoolPortal.jsx`

Replace the PocketBase `categories` collection call with `schoolCategoryApi.listAssignedCategories(currentUser.schoolId)` for the "Featured Categories" section and the stats count.

---

## Data Models

### `school_category_access` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `VARCHAR(15)` | PK |
| `school_id` | `VARCHAR(15)` | FK → `schools.id` ON DELETE CASCADE, NOT NULL |
| `category_id` | `VARCHAR(15)` | FK → `categories.id` ON DELETE CASCADE, NOT NULL |
| `created` | `TIMESTAMP WITH TIME ZONE` | server default NOW() |

Unique constraint: `(school_id, category_id)`

Index: `(school_id)` — used by every PDF filter query.

### Existing models — no schema changes

`School`, `Category`, `PDF` are unchanged. The new table is purely additive.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Assign-retrieve round trip

*For any* school and any non-empty set of valid category IDs, assigning those categories and then retrieving the school's assigned categories should return a set that contains exactly the assigned category IDs.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Assign-remove round trip

*For any* school and any category that has been assigned to it, removing that category assignment and then retrieving the school's assigned categories should return a set that does not contain the removed category.

**Validates: Requirements 1.3**

---

### Property 3: Duplicate assignment prevention

*For any* school-category pair that already has an active assignment, attempting to assign the same category again should return a 409 Conflict response, and the total count of assignments for that school-category pair should remain exactly 1.

**Validates: Requirements 1.4**

---

### Property 4: Admin-only authorization on assignment endpoints

*For any* user whose role is not `admin` or `platform_admin`, any request to POST or DELETE `/api/schools/{id}/categories` should return a 403 Forbidden response, regardless of the school or category involved.

**Validates: Requirements 1.7**

---

### Property 5: PDF list filtered to assigned categories

*For any* school user whose school has a non-empty set of assigned categories C, every PDF returned by `GET /api/pdfs` should have a `category_id` that is a member of C.

**Validates: Requirements 2.1, 2.4**

---

### Property 6: Unauthorized PDF access and download return 403

*For any* school user and any PDF whose `category_id` is not in the user's school's assigned category set, both `GET /api/pdfs/{id}` and `GET /api/pdfs/{id}/download` should return a 403 Forbidden response.

**Validates: Requirements 2.2, 2.3**

---

### Property 7: Admin users receive unfiltered PDF results

*For any* admin user, the PDF list returned by `GET /api/pdfs` should not be restricted by any school-category assignment — all approved PDFs should be accessible regardless of what categories are assigned to any school.

**Validates: Requirements 2.5**

---

### Property 8: School portal displays only assigned categories

*For any* school with an assigned category set C, the category list rendered in the School Portal should contain exactly the categories in C and no others.

**Validates: Requirements 4.1, 4.3**

---

### Property 9: Category deletion cascades to assignments

*For any* category that has one or more school assignments, deleting that category should result in zero remaining `school_category_access` records referencing that category ID.

**Validates: Requirements 5.1**

---

### Property 10: School deletion cascades to assignments

*For any* school that has one or more category assignments, deleting that school should result in zero remaining `school_category_access` records referencing that school ID.

**Validates: Requirements 5.2**

---

## Error Handling

| Scenario | HTTP Status | Detail |
|----------|-------------|--------|
| School not found in assignment endpoints | 404 | `"School not found"` |
| Category not found during assignment | 404 | `"Category not found: {id}"` |
| Duplicate assignment attempt | 409 | `"Category already assigned to this school"` |
| Non-admin calls assignment endpoints | 403 | `"Insufficient permissions"` |
| School user accesses PDF outside assigned categories | 403 | `"Access denied"` |
| School user with no `school_id` set | Returns empty list / 403 | Treated as no assignments |
| Partial failure in bulk assign (some IDs invalid) | 207 Multi-Status or 404 on first invalid | Return error for the first invalid category ID found |

The frontend `CategoryAccessPanel` catches API errors and displays them via `toast.error(err.message)`. The school portal shows an empty-state card when the assigned category list is empty.

---

## Testing Strategy

### Unit / Example-based tests

- `school_categories` router: test each endpoint with valid inputs, invalid school/category IDs, duplicate assignments, and non-admin callers.
- `pdfs` router: test `list_pdfs`, `get_pdf`, and `download_pdf` with school-role users that have assigned categories, school-role users with no assignments, and admin users.
- `CategoryAccessPanel` component: render with mock data, verify assigned categories display, verify API calls on add/remove actions, verify error toast on API failure.

### Property-based tests

Use **Hypothesis** (Python) for backend properties and **fast-check** (JavaScript) for frontend properties.

Each property test runs a minimum of **100 iterations**.

Tag format: `# Feature: school-category-access, Property {N}: {title}`

| Property | Test file | Library |
|----------|-----------|---------|
| P1 Assign-retrieve round trip | `tests/test_school_categories_props.py` | Hypothesis |
| P2 Assign-remove round trip | `tests/test_school_categories_props.py` | Hypothesis |
| P3 Duplicate prevention | `tests/test_school_categories_props.py` | Hypothesis |
| P4 Admin-only auth | `tests/test_school_categories_props.py` | Hypothesis |
| P5 PDF list filtered | `tests/test_pdf_access_props.py` | Hypothesis |
| P6 Unauthorized PDF 403 | `tests/test_pdf_access_props.py` | Hypothesis |
| P7 Admin unfiltered | `tests/test_pdf_access_props.py` | Hypothesis |
| P8 Portal category filter | `src/__tests__/SchoolPortalContent.props.test.jsx` | fast-check |
| P9 Category cascade | `tests/test_school_categories_props.py` | Hypothesis |
| P10 School cascade | `tests/test_school_categories_props.py` | Hypothesis |

### Integration tests

- End-to-end: create school → assign categories → log in as school user → verify PDF list is filtered → delete category → verify assignment removed.
- Verify `school_category_access` FK constraints prevent orphaned records at the DB level.
