# Marketing Compliance Platform - Backend

A FastAPI-based backend service for marketing content compliance validation, template management, and AI-powered content generation.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Services](#services)
- [Data Models](#data-models)
- [Database](#database)
- [Running the Application](#running-the-application)

---

## Overview

The Marketing Compliance Platform provides a comprehensive backend solution for:

- **Email Template Management** - Create, store, and manage marketing email templates
- **Content Compliance Validation** - AI-powered validation of marketing content against compliance rules
- **Social Media Post Generation** - Generate and validate social media content for multiple platforms
- **Template Analysis** - Automatically detect and extract editable modules from HTML/MJML templates
- **Visual Validation** - Compare visual rendering of templates before and after migrations
- **MJML/AMPscript Processing** - Render templates with dynamic data using AMPscript-style syntax

---

## Features

### Template Management
- CRUD operations for email templates
- Pre-built marketing templates (Welcome, Newsletter, Promotional, etc.)
- Template versioning and revision history
- JSON schema support for template variables

### AI-Powered Content Validation
- LLM-based content analysis for compliance issues
- Node-level validation for granular feedback
- Support for multiple marketing types (email, social media, affiliate, ads)
- AI-powered content rewriting suggestions

### Social Media Generation
- Multi-platform support (Instagram, LinkedIn, Facebook, Twitter)
- Platform-specific character limits and formatting
- Hashtag and CTA link management
- Content compliance scoring

### Template Processing
- HTML to MJML migration
- AMPscript variable processing
- MJML compilation to HTML
- Visual comparison of template renders

---

## Project Structure

```
backend/
├── main.py                     # FastAPI application entry point
├── config.py                   # Application configuration management
├── resource_helper.py          # System resource utilities
├── requirements.txt            # Python dependencies
│
├── config/                     # Environment configuration files
│   ├── development.env
│   └── production.env
│
├── models/                     # Pydantic data models
│   ├── template.py             # Template-related models
│   ├── social_media.py         # Social media models
│   └── user.py                 # User/authentication models
│
├── routers/                    # API route handlers
│   ├── templates.py            # Template CRUD endpoints
│   ├── social_media.py         # Social media generation endpoints
│   ├── template_analysis.py    # Template analysis endpoints
│   ├── auth.py                 # Authentication endpoints
│   └── dev_migration.py        # Development/migration utilities
│
├── services/                   # Business logic services
│   ├── content_validation.py   # LLM-based content validation
│   ├── social_media_generation.py  # AI social media post generation
│   ├── template_analyzer.py    # Template module extraction
│   ├── visual_validator.py     # Visual comparison service
│   ├── mjml_ampscript_renderer.py  # MJML+AMPscript processing
│   ├── html_ampscript_renderer.py  # HTML+AMPscript processing
│   └── html_ampscript_to_mjml.py   # HTML to MJML migration
│
├── templates/                  # Pre-built email templates
│   ├── welcome.html
│   ├── newsletter.html
│   ├── spring_promo.html
│   ├── abandoned_cart.html
│   ├── referral.html
│   ├── expedia_marketing_template.html
│   └── schemas/                # JSON schemas for templates
│
└── logs/                       # Application logs
```

---

## Installation

### Prerequisites

- Python 3.10+
- Node.js (for MJML CLI)
- SQLite (bundled with Python)

### Setup

1. **Clone the repository and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install MJML CLI (optional, for MJML compilation):**
   ```bash
   npm install -g mjml
   ```

5. **Install Playwright browsers (for visual validation):**
   ```bash
   playwright install
   ```

---

## Configuration

### Environment Setup

1. **Create a `.env` file in the backend root:**
   ```env
   APP_CONFIG=development
   APP_CONFIG_PATH=config
   ```

2. **Configure `config/development.env`:**
   ```env
   LOG_LEVEL=DEBUG
   LLM_APP_NAME=your_app_name
   LLM_PASSWORD=your_openai_api_key
   LLM_MODEL=gpt-4o-2024-11-20
   LLM_BASE_URL=https://api.openai.com/v1
   LLM_MAX_TOKENS=10000
   ```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | `DEBUG` |
| `LLM_APP_NAME` | Application name for LLM API | - |
| `LLM_PASSWORD` | OpenAI API key | - |
| `LLM_MODEL` | OpenAI model to use | `gpt-4o-2024-11-20` |
| `LLM_BASE_URL` | OpenAI API base URL | `https://api.openai.com/v1` |
| `LLM_MAX_TOKENS` | Maximum tokens for LLM responses | `10000` |
| `LLM_CERT_PATH` | Path to SSL certificate (optional) | - |

---

## API Reference

### Templates API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | List all templates |
| `POST` | `/api/templates` | Create a new template |
| `GET` | `/api/templates/{id}` | Get template by ID |
| `PUT` | `/api/templates/{id}` | Update template |
| `DELETE` | `/api/templates/{id}` | Delete template |
| `POST` | `/api/templates/{id}/validate` | Validate template content |
| `PUT` | `/api/templates/{id}/schema` | Update template schema |
| `POST` | `/api/templates/{id}/rewrite` | AI-powered content rewrite |
| `POST` | `/api/templates/{id}/render` | Render template with payload |
| `GET` | `/api/templates/sample/corrected` | Get sample corrected template |

### Social Media API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/social-media/generate` | Generate social media post |
| `POST` | `/api/social-media/validate` | Validate social media post |

#### Generate Request Body
```json
{
  "platform": "instagram",
  "prompt": "Create a post about our summer sale"
}
```

#### Generate Response
```json
{
  "platform": "instagram",
  "content": "Generated content...",
  "hashtags": ["#Summer", "#Sale"],
  "ctaLinks": [],
  "images": []
}
```

### Template Analysis API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/template-analysis/analyze` | Analyze HTML template |
| `POST` | `/api/template-analysis/upload-and-analyze` | Upload and analyze template file |
| `POST` | `/api/template-analysis/save` | Save analyzed template |

### Authentication API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/logout` | User logout |
| `GET` | `/api/auth/me` | Get current user info |

### Development/Migration API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/dev/render` | Render HTML+AMPscript with payload |
| `POST` | `/api/dev/migrate` | Convert HTML to MJML |
| `POST` | `/api/dev/render_mjml` | Render MJML+AMPscript to HTML |
| `POST` | `/api/dev/validate-visual` | Visual comparison of two HTML renders |

---

## Services

### Content Validation Service

**File:** `services/content_validation.py`

Provides AI-powered content validation using OpenAI-compatible LLMs.

**Key Features:**
- HTML content parsing and text extraction
- Node-level validation with specific feedback
- Support for multiple marketing content types
- Compliance scoring and issue identification

**Usage:**
```python
from services.content_validation import ContentValidationAgent

agent = ContentValidationAgent()
issues = await agent.validate_content(html_content, country='US', marketing_type='email')
```

### Social Media Generation Service

**File:** `services/social_media_generation.py`

Generates social media posts using AI based on user prompts.

**Key Features:**
- Platform-specific content generation
- Automatic hashtag suggestions
- Fallback generation when AI is unavailable

**Supported Platforms:**
- Instagram (2,200 character limit)
- LinkedIn (3,000 character limit)
- Facebook (63,206 character limit)
- Twitter/X (280 character limit)

### Template Analyzer Service

**File:** `services/template_analyzer.py`

Automatically detects and extracts editable modules from HTML templates.

**Key Features:**
- Comment-based module detection (`<!-- MODULE_START:name -->`)
- Data attribute extraction
- Variable/attribute identification
- JSON schema generation

### Visual Validator Service

**File:** `services/visual_validator.py`

Compares visual rendering of HTML templates for migration validation.

**Metrics:**
- SSIM (Structural Similarity Index)
- Color similarity score
- Alignment/layout similarity
- Overall pass/fail determination

### MJML/AMPscript Renderer

**File:** `services/mjml_ampscript_renderer.py`

Processes MJML templates with AMPscript-style variables and compiles to HTML.

**Supported AMPscript Functions:**
- `AttributeValue()` - Get attribute value
- `Empty()` - Check if value is empty
- `Format()` - Format values
- `DateAdd()`, `Now()` - Date functions
- `Concat()`, `Substring()`, `Replace()` - String functions
- `Uppercase()`, `Lowercase()`, `ProperCase()` - Case functions
- `Add()`, `Subtract()`, `Multiply()`, `Divide()`, `Mod()` - Math functions

---

## Data Models

### Template Models

```python
# Template Summary (list view)
class TemplateSummary:
    id: int
    name: str
    category: str
    description: str | None
    compliance_score: int
    created_at: str | None
    status: str  # 'Business', 'Draft', etc.

# Full Template (detail view)
class FullTemplate(TemplateSummary):
    html_content: str
    modules: List[Any]
    module_attributes: dict | None
    schema: dict | None
```

### Social Media Models

```python
class SocialMediaGenerateRequest:
    platform: str  # instagram, linkedin, facebook, twitter, other
    prompt: str

class SocialMediaPost:
    platform: str
    content: str
    hashtags: List[str]
    ctaLinks: List[dict]
    images: List[str]

class SocialMediaValidationResult:
    compliance_score: int
    issues: List[dict]
    platform_specific: dict
```

---

## Database

The application uses SQLite for data persistence.

### Tables

#### `templates`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `name` | TEXT | Template name |
| `category` | TEXT | Category (email, social, etc.) |
| `description` | TEXT | Template description |
| `status` | TEXT | Status (Business, Draft) |
| `html_content` | TEXT | HTML template content |
| `schema` | TEXT | JSON schema for variables |
| `modules` | TEXT | JSON array of modules |
| `compliance_score` | INTEGER | Compliance score (0-100) |
| `created_at` | TEXT | Creation timestamp |
| `updated_at` | TEXT | Last update timestamp |

#### `template_revisions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `template_id` | INTEGER | Reference to template |
| `html_content` | TEXT | Revision content |
| `created_at` | TEXT | Revision timestamp |

---

## Running the Application

### Development Mode

```bash
# From the backend directory
python main.py
```

Or use the provided PowerShell scripts:

```powershell
# Basic start
.\start-basic.ps1

# Local development with hot reload
.\start-local.ps1
```

The server will start at `http://localhost:8000`

### API Documentation

Once running, access the interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Production Deployment

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Dependencies

### Core Dependencies
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `pydantic-settings` - Configuration management
- `sqlite3` - Database (built-in)

### AI/ML Dependencies
- `openai` - OpenAI API client
- `httpx` - HTTP client

### Template Processing
- `beautifulsoup4` - HTML parsing
- `css-inline` - CSS inlining
- `mjml` (CLI) - MJML compilation

### Visual Validation
- `playwright` - Browser automation
- `scikit-image` - Image comparison
- `opencv-python` - Image processing
- `Pillow` - Image handling
- `numpy` - Numerical operations

### Utilities
- `python-json-logger` - JSON logging
- `psutil` - System resource monitoring
- `python-dotenv` - Environment loading
- `python-multipart` - File uploads

---

## License

Internal use only - Marketing Compliance Platform
