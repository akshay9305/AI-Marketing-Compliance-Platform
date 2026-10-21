# Expedia AI CoE — Marketing Compliance Platform

An AI-assisted platform for reviewing, validating, editing, and rendering marketing content—especially email templates—before publication.

> **Project note:** This repository contains a working codebase, but its actual production readiness, security, test coverage, and deployment status must be verified. Do not describe a feature as production-ready unless you have tested it.

## 1. Problem and solution

Marketing teams create email and social content across campaigns, markets, and languages. Manual reviews can be slow and inconsistent, while template changes can accidentally break layout or dynamic content.

This platform brings several tasks into one workflow:

1. Upload or select a marketing template.
2. Analyze its editable modules and variables.
3. Validate content and calls to action (CTAs).
4. Compare localized versions.
5. Render HTML/MJML templates with dynamic data.
6. Use AI assistance to generate or rewrite content.
7. Review the result before publishing.

AI output is an aid, not a final compliance decision. Human review and approved business rules remain important.

## 2. Main capabilities

- **Template management:** create, retrieve, update, and delete templates.
- **Content validation:** flag potential content/compliance issues and provide feedback.
- **CTA validation:** inspect calls to action and links.
- **Social content generation:** generate platform-oriented content and validate it.
- **Locale comparison:** compare content across market/language versions.
- **Template analysis:** identify modules, variables, and editable areas in HTML.
- **HTML/MJML/AMPscript processing:** render templates with dynamic values and support migration workflows.
- **Visual validation:** compare rendered outputs to identify layout changes.
- **Authentication:** registration/login-related API routes are present; security configuration needs review before deployment.

## 3. Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React, TypeScript, Vite | User interface and workflow |
| Styling/UI | Tailwind CSS, Headless UI, Lucide React | Layout and UI components |
| Charts | Recharts | Data visualization |
| Backend | Python, FastAPI, Uvicorn | REST API and application orchestration |
| Validation models | Pydantic | Request/response validation |
| AI integration | OpenAI-compatible LLM proxy/client | Generation and AI-assisted review |
| Template processing | HTML, MJML, AMPscript-style rendering | Dynamic marketing template output |
| Storage | SQLite database file is present | Local/persisted application data; confirm schema and deployment suitability |
| Visual comparison | Playwright, OpenCV, scikit-image, Pillow | Browser rendering and image comparison |

## 4. Architecture at a glance

```text
Marketing user
    |
    v
React + TypeScript frontend
    |
    | HTTP / JSON
    v
FastAPI application (backend/main.py)
    |
    +--> Routers: API endpoints and request handling
    |
    +--> Services: validation, generation, rendering, analysis
    |
    +--> Models: request/data structures
    |
    +--> SQLite / template files / configuration
    |
    +--> LLM provider (when configured)
```

**Design principle:** keep HTTP routing in `routers/`, business logic in `services/`, and request/data schemas in `models/`. Keep credentials outside source control.

## 5. Repository map

```text
Expedia-AICoE/
├── README.md
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── models/
│   ├── routers/
│   ├── services/
│   ├── templates/
│   │   └── schemas/
│   └── config/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── components/
        └── pages/
```

### Where to look first

- `backend/main.py` — app setup and router registration.
- `backend/config.py` — configuration loading; check how environment variables are resolved.
- `backend/routers/` — API endpoints.
- `backend/services/` — core business logic.
- `backend/models/` — Pydantic/data models.
- `backend/templates/` — sample HTML templates.
- `backend/templates/schemas/` — JSON schemas for supported templates.
- `frontend/src/App.tsx` — frontend routes and top-level composition.
- `frontend/src/pages/` — screen-level UI.
- `frontend/src/components/` — reusable UI and workflow components.
- `backend.md`, `frontend.md` — additional existing component documentation.

## 6. Local setup

### Requirements

- Python version compatible with the pinned backend dependencies (Python 3.10+ is a sensible starting point).
- Node.js and npm.
- Git.
- Optional, depending on the workflow: MJML CLI and Playwright browser binaries.

### Backend — Windows PowerShell

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Review the example configuration and set credentials through local environment variables or a private local config file. **Never commit real API keys.** Confirm the configuration names expected by `backend/config.py` before starting.

The repository's existing frontend documentation suggests this backend command; verify it against your local configuration:

```powershell
$env:APP_CONFIG = "development.env"
$env:APP_CONFIG_PATH = "config"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If the application expects `APP_CONFIG=development` rather than `development.env`, use the value required by `config.py`. Do not guess—inspect the configuration loader.

### Frontend

Open a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Use the local URL printed by Vite. The configured port can vary; check `frontend/vite.config.ts` rather than assuming a port.

### API documentation

When the backend is running, FastAPI commonly exposes interactive API documentation at:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/openapi.json`

These paths depend on the application configuration.

## 7. Main API areas

Confirm exact paths and payloads in `backend/main.py`, router files, or `/docs`; endpoint names can change.

| API area | Likely responsibility | Code location |
|---|---|---|
| Templates | Template CRUD, validation, render, rewrite, schema | `routers/templates.py` |
| Content validation | Validate marketing copy and report issues | `routers/content_validation.py` |
| CTA validation | Check CTA-related content/links | `routers/cta_validation.py` |
| Social media | Generate and validate platform-specific posts | `routers/social_media.py` |
| Locale comparison | Compare translated/localized versions | `routers/locale_comparison.py` |
| Template analysis | Extract editable modules and variables | `routers/template_analysis.py` |
| Authentication | Register/login/current-user/logout workflows | `routers/auth.py` |
| Development/migration | Render, migrate, or visually compare templates | `routers/dev_migration.py` |

## 8. Typical end-to-end user journey

1. **Choose/upload a template.** Start from an existing template or provide HTML.
2. **Analyze structure.** Identify editable modules, links, and dynamic variables.
3. **Edit content.** Change copy or module values in the UI.
4. **Validate.** Run content and CTA checks; inspect each issue and its explanation.
5. **Compare locales.** Check that localized variants remain consistent where required.
6. **Render.** Supply sample data for dynamic placeholders and render the output.
7. **Compare visuals.** Review before/after renders for unintended layout changes.
8. **Approve manually.** Confirm business rules, links, legal copy, accessibility, and final rendering before publication.

## 9. Testing and quality gates

Before calling the repository ready for a demo or deployment:

```powershell
# Frontend type-check + production build
cd frontend
npm ci
npm run build
npm run lint
```

Backend smoke check:

```powershell
cd backend
python -m compileall .
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Then test the important API workflows using `/docs` or an API client. The commands above are basic checks, not substitutes for automated unit/integration tests.

Minimum test scenarios:
- Valid and invalid content inputs.
- Missing or malformed CTA URLs.
- Missing template variables and empty payloads.
- Valid and invalid locale pairs.
- LLM timeout, unavailable provider, and malformed response.
- HTML with malformed markup and AMPscript-style variables.
- Visual rendering differences and missing browser binaries.
- Unauthorized access to protected endpoints.
- Persistence across application restarts.

## 10. Known review items before publishing

- Remove secrets, real environment files, private certificates, logs, local databases, build outputs, and nested Git metadata from public distribution unless deliberately required.
- Rotate any API key that was ever committed or shared. Deleting it from the latest file is not enough; revoke it at the provider.
- Verify authentication, password hashing, session/token handling, authorization, CORS, and rate limiting.
- Confirm that AI output is validated and does not bypass business compliance rules.
- Add automated tests and a documented test command.
- Document exact environment variables and provide safe example values only.
- Verify frontend API base URL, backend CORS policy, and error handling.
- Decide whether SQLite is suitable for the target deployment and provide backup/migration guidance.
- Add license, contribution guidelines, support contact, and deployment instructions if this is intended for a shared/public repository.

## 11. Business value and success measures

Potential outcomes to measure—not claims to make without evidence:

- Time required to review a campaign.
- Number of compliance issues caught before publication.
- Rate of broken links or invalid CTAs.
- Number of manual template fixes after rendering.
- Time required to create localized variants.
- Percentage of templates passing validation on first review.

Establish a baseline, run a pilot, and compare results before stating a percentage improvement.

## 12. One-minute project explanation

“I worked on an AI-assisted marketing compliance platform that brings template analysis, content and CTA validation, localization comparison, and HTML/MJML rendering into one workflow. The frontend is built with React and TypeScript, while FastAPI exposes backend endpoints. The backend separates route handling from business logic using routers and services, and integrates with an LLM provider for AI-assisted tasks. A typical flow is to analyze a template, edit its modules, validate copy and links, render it with sample data, and review visual changes before approval. The key business goal is to reduce manual review effort and catch issues earlier, while keeping final compliance approval under human control.”

Adapt “I worked on” to your real contribution. Do not claim ownership of components you did not personally build.
