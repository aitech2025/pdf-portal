# Requirements Document

## Introduction

This feature introduces category-based access control for schools on the platform. Currently, school users can browse all approved content regardless of category. The new system allows admins to assign specific categories to each school, and restricts school users to only see and download PDFs that belong to their school's assigned categories. This enables the platform to serve differentiated content to different institutions based on their subscription, grade level, or curriculum needs.

## Glossary

- **School**: A registered educational institution on the platform, identified by a unique school ID.
- **Category**: A top-level content taxonomy node used to classify PDFs (e.g., "Grade 1–5", "Science").
- **SubCategory**: A child node of a Category, providing finer-grained classification of PDFs.
- **PDF**: A content document stored on the platform, tagged with a Category and optionally a SubCategory.
- **School_Category_Assignment**: A record linking a School to a Category, granting that school access to all PDFs within that category.
- **School_User**: A user whose account is associated with a School (i.e., `role` is `school_admin` or `school_user` and `school_id` is set).
- **Admin**: A platform administrator with full management rights over schools, categories, users, and content.
- **Access_Control_Filter**: The server-side logic that restricts PDF query results to only categories assigned to the requesting user's school.
- **Category_Access_API**: The API endpoints responsible for managing and querying school-category assignments.

---

## Requirements

### Requirement 1: School–Category Assignment Management

**User Story:** As an Admin, I want to assign one or more categories to a school, so that I can control which content that school's users are allowed to access.

#### Acceptance Criteria

1. THE Category_Access_API SHALL provide an endpoint to assign a list of categories to a specific school.
2. THE Category_Access_API SHALL provide an endpoint to retrieve the list of categories currently assigned to a specific school.
3. THE Category_Access_API SHALL provide an endpoint to remove a category assignment from a school.
4. WHEN an Admin assigns a category to a school that already has that category assigned, THE Category_Access_API SHALL return a 409 Conflict response without creating a duplicate assignment.
5. WHEN an Admin requests assignment of a category ID that does not exist, THE Category_Access_API SHALL return a 404 Not Found response.
6. WHEN an Admin requests assignment to a school ID that does not exist, THE Category_Access_API SHALL return a 404 Not Found response.
7. THE Category_Access_API SHALL restrict all assignment management endpoints to users with the Admin role.

---

### Requirement 2: PDF Content Filtering for School Users

**User Story:** As a School User, I want to only see PDFs that belong to my school's assigned categories, so that I am not exposed to content outside my institution's access level.

#### Acceptance Criteria

1. WHEN a School_User requests the PDF list endpoint, THE Access_Control_Filter SHALL restrict results to PDFs whose `category_id` matches one of the categories assigned to the user's school.
2. WHEN a School_User requests a specific PDF by ID whose category is not assigned to their school, THE Access_Control_Filter SHALL return a 403 Forbidden response.
3. WHEN a School_User attempts to download a PDF whose category is not assigned to their school, THE Access_Control_Filter SHALL return a 403 Forbidden response.
4. WHILE a school has no category assignments, THE Access_Control_Filter SHALL return an empty result set for all PDF list requests made by School_Users of that school.
5. WHEN an Admin requests the PDF list endpoint, THE Access_Control_Filter SHALL apply no category restriction and return all PDFs.

---

### Requirement 3: Admin UI — Category Assignment Panel

**User Story:** As an Admin, I want a UI panel within the school management interface to assign and remove categories for each school, so that I can manage access without using the API directly.

#### Acceptance Criteria

1. WHEN an Admin opens the school details or management view for a school, THE Admin_UI SHALL display a category assignment panel showing all currently assigned categories for that school.
2. WHEN an Admin selects categories to assign in the panel, THE Admin_UI SHALL call the Category_Access_API to persist the assignments.
3. WHEN an Admin removes a category from the panel, THE Admin_UI SHALL call the Category_Access_API to delete the assignment and update the displayed list.
4. THE Admin_UI SHALL display all available active categories as options for assignment.
5. WHEN the Category_Access_API returns an error during assignment or removal, THE Admin_UI SHALL display a descriptive error message to the Admin.

---

### Requirement 4: School Portal — Filtered Category and Content Display

**User Story:** As a School User, I want the School Portal to only show categories and content that my school has access to, so that the browsing experience reflects my institution's permissions.

#### Acceptance Criteria

1. WHEN a School_User loads the School Portal, THE School_Portal SHALL display only the categories assigned to the user's school.
2. WHEN a School_User browses a category page, THE School_Portal SHALL display only PDFs within that category that are approved and belong to the school's assigned categories.
3. WHEN a School_User's school has no assigned categories, THE School_Portal SHALL display an empty state message indicating no content is currently available.
4. WHEN a School_User searches for content, THE School_Portal SHALL restrict search results to PDFs within the school's assigned categories.

---

### Requirement 5: Data Integrity and Cascading Behavior

**User Story:** As an Admin, I want the system to maintain consistent access control data when schools or categories are modified, so that orphaned assignments do not cause unexpected access.

#### Acceptance Criteria

1. WHEN a Category is deleted from the platform, THE System SHALL remove all School_Category_Assignments referencing that category.
2. WHEN a School is deleted from the platform, THE System SHALL remove all School_Category_Assignments belonging to that school.
3. THE System SHALL enforce referential integrity on School_Category_Assignment records, ensuring each assignment references a valid School and a valid Category.
