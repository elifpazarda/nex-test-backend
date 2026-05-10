# Frontend Design Brief — AI-Powered QA Platform

> **How to use this document:** This is a complete product specification for designing the frontend UI of a QA test automation platform. The backend API is fully built and ready. Everything you need to know — what the app does, what screens to design, what data appears on each screen, the exact API request/response formats, navigation flow, and user journeys — is documented below. You do not need any external information. Design a modern, clean, professional web application based on these specifications.

---

## 1. Application Overview

This is an **AI-powered test scenario generation platform** for QA engineers and developers. Users create projects, organize test scenarios into groups, and use AI (Claude) to automatically generate comprehensive test scenarios from multiple sources.

### Core Data Hierarchy

```
User
 └── Projects
      └── Scenario Groups (typed: Bug, Feature, Regression, Smoke, etc.)
           └── Test Scenarios (with category, priority, steps, BDD code)
```

### Key Capabilities

- **AI Scenario Generation** from 4 sources: free text, Jira issues, Excel files, PDF documents
- **BDD/Code Conversion**: convert generated scenarios to Cucumber (Gherkin), Playwright, or Cypress test code
- **Export** scenarios as Excel, PDF, JSON, or .feature files (with Jira Xray compatibility)
- **Import** test cases from Excel spreadsheets
- **Jira Integration** via OAuth 2.0 — fetch issues directly and generate scenarios from them

### Authentication

Users register and log in with email + password. The API uses JWT access tokens (short-lived) and refresh tokens (long-lived). The frontend must store both tokens, send the access token as `Authorization: Bearer <token>` on every request, and silently refresh when expired.

---

## 2. Global API Patterns

**Base URL:** `http://localhost:3001/api`

### Success Response Wrapper

Every successful response is wrapped:

```json
{
  "success": true,
  "timestamp": "2026-05-08T15:30:45.000Z",
  "path": "/api/projects",
  "data": { ... }
}
```

### Error Response Wrapper

```json
{
  "success": false,
  "timestamp": "2026-05-08T15:30:45.000Z",
  "path": "/api/auth/login",
  "error": {
    "statusCode": 401,
    "message": "Geçersiz kimlik bilgileri"
  }
}
```

> **Note:** Error messages are in Turkish.

### Pagination

Paginated endpoints accept query params and return:

```
Request:  ?page=1&limit=20
Response: {
  "items": [...],
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

- `page`: min 1, default 1
- `limit`: min 1, max 100, default 20

### Authentication Header

All endpoints marked "Auth: JWT" require:

```
Authorization: Bearer <accessToken>
```

### Rate Limits

- Global: 100 requests / 60 seconds
- Login & Register: 10 requests / 60 seconds
- AI Generation & BDD Conversion: 5 requests / 60 seconds

---

## 3. Data Models

### User

```typescript
{
  id: string;          // "clx1abc..."
  name: string;
  email: string;
  createdAt: string;   // ISO 8601 UTC
}
```

### Project

```typescript
{
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    scenarios: number;
    scenarioGroups: number;
  }
}
```

### Scenario Group

```typescript
{
  id: string;
  name: string;
  type: ScenarioGroupType;  // see enum below
  projectId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    scenarios: number;
  }
}
```

### Test Scenario

```typescript
{
  id: string;
  title: string;
  input: string;           // original source text
  rawOutput: string;       // JSON of generation result
  bddOutput: string;       // JSON of BDD code or empty
  category: string;        // "happy_path" | "edge_case" | "negative"
  priority: string;        // "critical" | "high" | "medium" | "low"
  preconditions: string;
  steps: string[];
  expectedResult: string;
  sourceType: string | null;  // "text" | "jira" | "excel" | "pdf"
  sourceRef: string | null;   // filename or Jira issue key
  projectId: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
}
```

### Jira Connection

```typescript
{
  siteUrl: string;       // "https://yoursite.atlassian.net"
  siteName: string;      // "Your Site"
  connectedAt: string;
  updatedAt: string;
}
```

### Enums & Constants

| Enum | Values |
|------|--------|
| **ScenarioGroupType** | `BUG`, `FEATURE`, `REGRESSION`, `SMOKE`, `INTEGRATION`, `E2E`, `PERFORMANCE`, `OTHER` |
| **Category** | `happy_path`, `edge_case`, `negative` |
| **Priority** | `critical`, `high`, `medium`, `low` |
| **TestFramework** | `cucumber`, `playwright`, `cypress` |
| **ExportFormat** | `excel`, `pdf`, `json`, `feature` |

---

## 4. Screens & Interactions

### 4.1 Login Page

**Purpose:** Existing users sign in with email and password.

**What the user sees:**
- Email input field
- Password input field (min 8 chars)
- "Login" button
- Link to Register page

**API:**

```
POST /api/auth/login
Body: { "email": "user@example.com", "password": "********" }
Response.data: {
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Behavior:**
- On success: store both tokens, redirect to Projects (dashboard)
- On error (401): show "Geçersiz kimlik bilgileri" (invalid credentials)
- Rate limited: 10 attempts per minute

---

### 4.2 Register Page

**Purpose:** New users create an account.

**What the user sees:**
- Name input (2–50 chars)
- Email input
- Password input (8–128 chars)
- "Register" button
- Link to Login page

**API:**

```
POST /api/auth/register
Body: { "name": "Burak", "email": "user@example.com", "password": "********" }
Response.data: {
  "id": "clx...",
  "name": "Burak",
  "email": "user@example.com",
  "createdAt": "2026-05-08T10:00:00.000Z"
}
```

**Behavior:**
- On success: redirect to Login page (registration doesn't return tokens)
- On error (409): "Bu email adresi zaten kayıtlı" (email already exists)

---

### 4.3 Projects List (Dashboard)

**Purpose:** The main landing page after login. Shows all projects the user owns.

**What the user sees:**
- List/grid of project cards, each showing:
  - Project name
  - Description (if any)
  - Scenario group count
  - Total scenario count
  - Created date
- "Create Project" button
- Pagination controls
- User menu (profile info, logout)

**API:**

```
GET /api/projects?page=1&limit=20
Response.data: {
  "items": [
    {
      "id": "clx...",
      "name": "E-Commerce App",
      "description": "Online shopping platform tests",
      "userId": "clx...",
      "createdAt": "2026-05-01T...",
      "updatedAt": "2026-05-08T...",
      "_count": { "scenarios": 42, "scenarioGroups": 5 }
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

**Create Project dialog/modal:**

```
POST /api/projects
Body: { "name": "My Project", "description": "Optional description" }
```

- Name: required, 2–100 chars
- Description: optional, max 500 chars

**User info (for header/menu):**

```
GET /api/auth/me
Response.data: { "id": "...", "name": "Burak", "email": "...", "createdAt": "..." }
```

**Logout:**

```
POST /api/auth/logout
Response.data: { "message": "Çıkış yapıldı" }
```

---

### 4.4 Project Detail — Scenario Groups

**Purpose:** Shows all scenario groups within a project. This is the organizational layer between projects and individual scenarios.

**What the user sees:**
- Project name and description at the top
- Edit/Delete project actions
- List of scenario groups, each showing:
  - Group name
  - Group type (displayed as badge/tag: Bug, Feature, Regression, etc.)
  - Scenario count
- "Create Group" button
- "Generate Scenarios" button (navigates to generation page)
- "Import Excel" button
- Export project button (all scenarios)
- Pagination controls

**API — List groups:**

```
GET /api/scenario-groups/project/:projectId?page=1&limit=20
Response.data: {
  "items": [
    {
      "id": "clx...",
      "name": "Login Feature Tests",
      "type": "FEATURE",
      "projectId": "clx...",
      "createdAt": "...",
      "updatedAt": "...",
      "_count": { "scenarios": 12 }
    }
  ],
  "meta": { ... }
}
```

**API — Create group:**

```
POST /api/scenario-groups
Body: {
  "name": "Login Feature Tests",
  "type": "FEATURE",
  "projectId": "clx..."
}
```

- Type is selected from dropdown: BUG, FEATURE, REGRESSION, SMOKE, INTEGRATION, E2E, PERFORMANCE, OTHER

**API — Update group:**

```
PATCH /api/scenario-groups/:id
Body: { "name": "Updated Name", "type": "BUG" }
```

**API — Delete group:**

```
DELETE /api/scenario-groups/:id
Response.data: { "message": "Senaryo grubu silindi" }
```

> Deleting a group also deletes all scenarios inside it.

**API — Update project:**

```
PATCH /api/projects/:id
Body: { "name": "New Name", "description": "New desc" }
```

**API — Delete project:**

```
DELETE /api/projects/:id
Response.data: { "message": "Proje silindi" }
```

> Deleting a project deletes all groups and scenarios inside it.

---

### 4.5 Scenario Group Detail — Scenarios List

**Purpose:** Shows all test scenarios within a specific group.

**What the user sees:**
- Group name and type badge
- List/table of scenarios, each showing:
  - Title
  - Category badge (happy_path = green, edge_case = yellow, negative = red)
  - Priority badge (critical = red, high = orange, medium = yellow, low = gray)
  - Source type indicator (text, jira, excel, pdf)
  - Created date
- Click a scenario to view its detail
- "Generate Scenarios" button (navigate to generation page with this group pre-selected)
- Export group button
- Pagination controls

**API:**

```
GET /api/scenarios/group/:groupId?page=1&limit=20
Response.data: {
  "items": [
    {
      "id": "clx...",
      "title": "Successful login with valid credentials",
      "input": "...",
      "rawOutput": "...",
      "bddOutput": "...",
      "category": "happy_path",
      "priority": "critical",
      "preconditions": "User has a registered account",
      "steps": [
        "Navigate to login page",
        "Enter valid email",
        "Enter valid password",
        "Click login button"
      ],
      "expectedResult": "User is redirected to dashboard",
      "sourceType": "text",
      "sourceRef": null,
      "projectId": "clx...",
      "groupId": "clx...",
      "createdAt": "...",
      "updatedAt": "...",
      "group": {
        "id": "clx...",
        "name": "Login Feature Tests",
        "type": "FEATURE"
      }
    }
  ],
  "meta": { ... }
}
```

---

### 4.6 Scenario Detail

**Purpose:** View a single test scenario with all its details.

**What the user sees:**
- Title
- Category and priority badges
- Source info (e.g., "Generated from Jira: PROJ-123" or "Generated from text")
- Preconditions section
- Numbered steps list
- Expected result
- BDD/Code output (if converted) — shown in a code block with syntax highlighting
- Delete button
- Export button (single scenario)

**API:**

```
GET /api/scenarios/:id
Response.data: {
  "id": "clx...",
  "title": "...",
  "input": "original user input text...",
  "rawOutput": "{...json...}",
  "bddOutput": "{\"framework\":\"cucumber\",\"language\":\"gherkin\",\"code\":\"Feature: ...\"}",
  "category": "happy_path",
  "priority": "critical",
  "preconditions": "...",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "expectedResult": "...",
  "sourceType": "jira",
  "sourceRef": "PROJ-123",
  "projectId": "clx...",
  "groupId": "clx...",
  "createdAt": "...",
  "updatedAt": "...",
  "project": {
    "id": "clx...",
    "name": "E-Commerce App",
    "description": "...",
    "userId": "clx...",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "group": {
    "id": "clx...",
    "name": "Login Feature Tests",
    "type": "FEATURE"
  }
}
```

**Delete:**

```
DELETE /api/scenarios/:id
Response.data: { "message": "Senaryo silindi" }
```

---

### 4.7 Generate Scenarios

**Purpose:** The core feature. Users provide input from one of 4 sources and AI generates test scenarios. The results are shown for review BEFORE saving.

**What the user sees:**
- Source type selector (tabs or radio): Text | Jira | Excel | PDF
- Project selector (which project this generation belongs to)
- Source-specific input area (see below)
- "Generate" button
- Loading state (AI generation takes several seconds)

#### Source: Free Text

- Large textarea for describing the feature/requirement (10–2000 characters)
- Character counter

```
POST /api/scenarios/generate/text
Body: { "projectId": "clx...", "input": "User can login with email and password..." }
```

#### Source: Jira Issue

- Text input for Jira issue key (e.g., "PROJ-123")
- Requires Jira to be connected (check connection first)

```
POST /api/scenarios/generate/jira
Body: { "projectId": "clx...", "issueKey": "PROJ-123" }
```

#### Source: Excel File

- File upload area (drag & drop or browse)
- Accepts only `.xlsx` files, max 5MB

```
POST /api/scenarios/generate/excel
Content-Type: multipart/form-data
Fields: projectId + file
```

#### Source: PDF File

- File upload area (drag & drop or browse)
- Accepts only `.pdf` files, max 10MB

```
POST /api/scenarios/generate/pdf
Content-Type: multipart/form-data
Fields: projectId + file
```

#### Generation Response (same for all sources)

```json
{
  "scenarios": [
    {
      "id": "TC-001",
      "title": "Successful login with valid credentials",
      "category": "happy_path",
      "priority": "critical",
      "preconditions": "User has a registered account with verified email",
      "steps": [
        "Navigate to login page",
        "Enter valid email address",
        "Enter correct password",
        "Click 'Login' button"
      ],
      "expectedResult": "User is redirected to dashboard and sees welcome message"
    },
    {
      "id": "TC-002",
      "title": "Login with invalid password",
      "category": "negative",
      "priority": "high",
      "preconditions": "User has a registered account",
      "steps": [
        "Navigate to login page",
        "Enter valid email",
        "Enter incorrect password",
        "Click 'Login' button"
      ],
      "expectedResult": "Error message displayed: 'Invalid credentials'"
    }
  ],
  "input": "User can login with email and password...",
  "sourceType": "text",
  "sourceRef": null
}
```

> **Important:** These scenarios are NOT saved yet. They are shown in the review screen.

---

### 4.8 Review & Save Generated Scenarios

**Purpose:** After AI generates scenarios, the user reviews them and decides which ones to save and to which group.

**What the user sees:**
- List of generated scenarios (from the generation response)
- Each scenario card shows: title, category badge, priority badge, preconditions, steps, expected result
- Checkboxes to select/deselect scenarios
- Group selector dropdown (existing groups in the project, or create new group inline)
- "Convert to BDD" button (optional, before saving)
- "Save Selected" button

**Save API:**

```
POST /api/scenarios
Body: {
  "groupId": "clx...",
  "input": "original input text...",
  "sourceType": "text",
  "sourceRef": null,
  "scenarios": [
    {
      "title": "Successful login with valid credentials",
      "category": "happy_path",
      "priority": "critical",
      "preconditions": "User has a registered account",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expectedResult": "User is redirected to dashboard",
      "bdd": {
        "framework": "cucumber",
        "language": "gherkin",
        "code": "Feature: Login\n  Scenario: ..."
      }
    }
  ]
}
Response.data: [ ...saved ScenarioResponse objects... ]
```

- The `bdd` field on each scenario is optional — only present if user converted to BDD before saving

---

### 4.9 BDD / Code Conversion

**Purpose:** Convert test scenarios to executable test code in Cucumber (Gherkin), Playwright, or Cypress format.

**What the user sees:**
- Framework selector: Cucumber (default) | Playwright | Cypress
- List of scenarios to convert (passed from generation or selected from saved)
- "Convert" button
- Loading state
- Results: code block per scenario with syntax highlighting
- Copy code button per result

**API:**

```
POST /api/scenarios/convert-bdd
Body: {
  "projectId": "clx...",
  "framework": "cucumber",
  "scenarios": [
    {
      "id": "TC-001",
      "title": "Successful login",
      "category": "happy_path",
      "priority": "critical",
      "preconditions": "User has an account",
      "steps": ["Navigate to login", "Enter email", "Enter password", "Click login"],
      "expectedResult": "User sees dashboard"
    }
  ]
}
Response.data: {
  "framework": "cucumber",
  "results": [
    {
      "scenarioId": "TC-001",
      "framework": "cucumber",
      "language": "gherkin",
      "code": "Feature: Login\n\n  Scenario: Successful login\n    Given user has an account\n    When user navigates to login page\n    And enters valid email\n    And enters valid password\n    And clicks login button\n    Then user sees the dashboard"
    }
  ]
}
```

**Framework output differences:**
- **Cucumber**: Gherkin `.feature` syntax + TypeScript step definitions
- **Playwright**: TypeScript with `test.describe()`, `test()`, Playwright Locators
- **Cypress**: JavaScript/TypeScript with `describe()`, `it()`, `cy.*` commands

---

### 4.10 Export

**Purpose:** Download scenarios as files in various formats.

**What the user sees:**
- Export button available at 3 levels:
  1. Project level (all scenarios in project)
  2. Group level (all scenarios in a group)
  3. Individual scenario level
- Export dialog with:
  - Format selector: Excel | PDF | JSON | Feature (.feature)
  - Optional: Date range filter (start date, end date)
  - Optional: Xray format toggle (for Excel only — Jira Xray compatible)
- "Download" button

**API (all return file downloads):**

```
GET /api/scenarios/export/all/:projectId?format=excel&startDate=2026-01-01&endDate=2026-12-31&xrayFormat=false
GET /api/scenarios/export/group/:groupId?format=pdf
GET /api/scenarios/export/:id?format=json
```

- Response is a file download (Content-Disposition: attachment)
- Format options: `excel`, `pdf`, `json`, `feature`
- `xrayFormat=true` only applies to Excel — changes columns to Jira Xray import format
- Date filters are optional ISO date strings

---

### 4.11 Import from Excel

**Purpose:** Import existing test cases from an Excel spreadsheet into a scenario group.

**What the user sees:**
- File upload area (.xlsx only, max 5MB)
- Group selector (which group to import into)
- "Save results" checkbox (whether to persist in DB or just preview BDD conversion)
- "Import" button
- Loading state (each row is processed by AI — can take time)
- Results table showing per-row status:
  - Row number, issue key, test summary
  - BDD output (generated)
  - Status: success (with saved ID) or error message

**API:**

```
POST /api/scenarios/import-excel
Content-Type: multipart/form-data
Fields: file + groupId + saveResults (boolean)

Response.data: {
  "totalRows": 15,
  "successCount": 13,
  "failureCount": 2,
  "results": [
    {
      "rowNumber": 1,
      "issueKey": "PROJ-101",
      "testSummary": "Verify login functionality",
      "input": "Test Case: Verify login functionality\n...",
      "bddOutput": "Feature: ...",
      "savedId": "clx..."
    },
    {
      "rowNumber": 5,
      "issueKey": "PROJ-105",
      "testSummary": "Check timeout handling",
      "input": "...",
      "bddOutput": "",
      "error": "AI conversion failed"
    }
  ]
}
```

**Expected Excel columns:** "test summary" (required), "action" (required), "issue key", "description", "data", "result", "test type"

---

### 4.12 Jira Integration Settings

**Purpose:** Connect or disconnect the user's Jira (Atlassian) account via OAuth 2.0.

**What the user sees:**

**When not connected:**
- "Connect Jira" button
- Brief explanation of what the integration enables

**When connected:**
- Connected site info: site name, site URL
- Connection date
- "Disconnect" button

**API — Check connection:**

```
GET /api/jira/connection
Response.data: {
  "siteUrl": "https://myteam.atlassian.net",
  "siteName": "My Team",
  "connectedAt": "2026-05-01T10:00:00.000Z",
  "updatedAt": "2026-05-08T12:00:00.000Z"
}
```

Returns 404 if no connection exists.

**API — Get OAuth URL (to start connection):**

```
GET /api/jira/auth-url
Response.data: {
  "authUrl": "https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=...&scope=read:jira-work+offline_access&..."
}
```

**Behavior:** Frontend opens this URL (either redirect or new window). User authorizes on Atlassian. Atlassian redirects to backend callback. Backend then redirects browser to:
- Success: `{FRONTEND_URL}/jira/callback?success=true`
- Error: `{FRONTEND_URL}/jira/callback?success=false&error=Error+message`

**API — Disconnect:**

```
DELETE /api/jira/connection
Response.data: { "message": "Jira bağlantısı silindi" }
```

---

### 4.13 Jira OAuth Callback Page

**Purpose:** A simple handler page at `/jira/callback` that the browser lands on after Atlassian OAuth redirect.

**What the user sees:**
- If `?success=true`: success message, then redirect to Jira settings or previous page
- If `?success=false&error=...`: error message with option to retry

**Implementation:** Just reads URL query params and shows appropriate feedback. No API call needed.

---

## 5. Token Management (Frontend Auth Logic)

### Storage

Store `accessToken` and `refreshToken` in memory or secure storage (not plain localStorage for production).

### Auto-Refresh

When an API call returns 401:
1. Try refreshing the token:

```
POST /api/auth/refresh
Body: { "refreshToken": "<stored refresh token>" }
Response.data: { "accessToken": "new...", "refreshToken": "new..." }
```

2. If refresh succeeds: retry the original request with new access token
3. If refresh fails (401): redirect to login page (session expired)

### Logout

```
POST /api/auth/logout
```

Clear all stored tokens and redirect to login.

---

## 6. End-to-End User Flows

### Flow 1: New User Onboarding

```
Register → Login → Create Project → Generate Scenarios (from text)
→ Review Generated Scenarios → (Optional: Convert to BDD)
→ Create Scenario Group → Save Scenarios to Group
```

### Flow 2: Jira-Based Generation

```
Settings → Connect Jira (OAuth) → Navigate to Project
→ Generate Scenarios (Jira tab) → Enter issue key (e.g., PROJ-123)
→ AI fetches issue and generates scenarios → Review
→ Convert to Cucumber/Playwright/Cypress → Save to Group
→ Export as .feature file
```

### Flow 3: Batch Import from Excel

```
Navigate to Project → Click "Import Excel"
→ Select Group → Upload .xlsx file → Toggle "Save Results"
→ View per-row results (success/failure) → Done
```

### Flow 4: Export Scenarios

```
Navigate to Project or Group → Click Export
→ Select format (Excel/PDF/JSON/Feature)
→ Optional: set date range, toggle Xray format
→ Download file
```

---

## 7. Navigation Structure

```
/login                              → Login Page
/register                           → Register Page
/projects                           → Projects List (Dashboard)
/projects/:id                       → Project Detail (Scenario Groups)
/projects/:id/generate              → Generate Scenarios (4 source tabs)
/projects/:id/import                → Import from Excel
/scenario-groups/:id                → Group Detail (Scenarios List)
/scenarios/:id                      → Scenario Detail
/settings/jira                      → Jira Integration Settings
/jira/callback                      → OAuth Callback Handler
```

---

## 8. Important UI States

### Loading States
- AI scenario generation (can take 5–15 seconds)
- BDD/code conversion (can take 5–10 seconds)
- Excel import (processes each row through AI — can take 30+ seconds)
- Regular CRUD operations (fast, < 1 second)

### Empty States
- No projects yet → prompt to create first project
- No scenario groups in project → prompt to create first group
- No scenarios in group → prompt to generate or import

### Error States
- Network errors
- Rate limit exceeded (429) — show retry timer
- Jira not connected (when trying to generate from Jira)
- File too large or wrong format
- Session expired (redirect to login)
- Validation errors (field-level, from API response)

### Confirmation Dialogs
- Delete project (cascades to all groups and scenarios)
- Delete scenario group (cascades to all scenarios)
- Delete individual scenario
- Disconnect Jira
