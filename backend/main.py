from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import logging
from datetime import datetime
import uvicorn
import platform
import asyncio

# Fix for Windows: use ProactorEventLoop for Playwright support
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(
        asyncio.WindowsProactorEventLoopPolicy()
    )

# Import routers (these modules exist under backend/routers)
from routers import social_media, template_analysis, auth
from routers import templates as templates_router
from routers import dev_migration

# Import validation feature routers (now properly integrated)
from routers import (
    content_validation,
    cta_validation,
    locale_comparison
)

LOG = logging.getLogger("marketing_compliance")

app = FastAPI(title="Marketing Compliance API")

# Simple CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DB_PATH = "marketing_compliance.db"


def get_db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db_and_seed():
    conn = get_db_conn()
    cur = conn.cursor()
    # Create templates table if missing
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            category TEXT,
            description TEXT,
            status TEXT DEFAULT 'Business',
            html_content TEXT,
            schema TEXT,
            modules TEXT,
            module_attributes TEXT,
            compliance_score INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    conn.commit()

    # Seed a couple of safe sample templates if table is empty
    cur.execute("SELECT COUNT(1) as cnt FROM templates")
    row = cur.fetchone()
    count = row["cnt"] if row else 0
    if count == 0:
        now = datetime.utcnow().isoformat()
        # Helper to load template HTML from files in backend/templates
        
        def load_template_html(filename: str) -> str:
            try:
                with open(f"templates/{filename}", "r", encoding="utf-8") as f:

                    return f.read()
            except Exception:
                return ""

        def load_template_schema(filename: str) -> str:
            try:
                schema_path = f"templates/schemas/{filename}"
                with open(schema_path, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                return ""

    # Prebuilt marketing email templates with placeholders for
    # dynamic attributes
        prebuilt_templates = [
            (
                "Welcome Email - {{company_name}}",
                "email",
                "Welcome new users with a personalized greeting and"
                " onboarding steps.",
                load_template_html("welcome.html"),
                load_template_schema("welcome.json"),
                "[]",
                100,
                now,
                now,
            ),
            (
                "Spring Promotion - {{company_name}}",
                "email",
                "A promotional email announcing seasonal discount"
                " with an offer code.",
                load_template_html("spring_promo.html"),
                load_template_schema("spring_promo.json"),
                "[]",
                95,
                now,
                now,
            ),
            (
                "Abandoned Cart Reminder",
                "email",
                "Remind customers about items left in their cart with a"
                " personalized list and CTA.",
                load_template_html("abandoned_cart.html"),
                load_template_schema("abandoned_cart.json"),
                "[]",
                90,
                now,
                now,
            ),
            (
                "Monthly Newsletter - {{company_name}}",
                "email",
                "A newsletter template with sections for highlights, articles,"
                " and social links.",
                load_template_html("newsletter.html"),
                load_template_schema("newsletter.json"),
                "[]",
                92,
                now,
                now,
            ),
            (
                "Referral Invite",
                "email",
                "Invite friends and reward both the referrer and the referred"
                " with a unique referral link.",
                load_template_html("referral.html"),
                load_template_schema("referral.json"),
                "[]",
                88,
                now,
                now,
            ),
            #(
            #    "Expedia — Member Exclusive",
            #    "email",
            #     (
            #         "Professional Expedia-style marketing template showcasing "
            #         "member savings and featured destinations."
             #    ),
             #    load_template_html("expedia_marketing_template.html"),
             #    load_template_schema("expedia_marketing_schema.json"),
             #    "[]",
            #     93,
             #    now,
             #    now,
            # ),
            (
                "Mars Chocolate Marketing - en-US",
                "email",
                (
                    "Mars chocolate holiday marketing email with product "
                    "promotions, CTAs, and social links (English US)."
                ),
                load_template_html("mars_chocolate_enus.html"),
                load_template_schema("mars_chocolate_enus.json"),
                "[]",
                91,
                now,
                now,
            ),
            (
                "Mars Chocolate Marketing - fr-FR",
                "email",
                (
                    "Mars chocolate holiday marketing email with product "
                    "promotions, CTAs, and social links (French)."
                ),
                load_template_html("mars_chocolate_enfr.html"),
                load_template_schema("mars_chocolate_enfr.json"),
                "[]",
                91,
                now,
                now,
            ),
        ]

        insert_sql = (
            "INSERT INTO templates (name, category, description, "
            "html_content, schema, modules, compliance_score, created_at, "
            "updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )

        for tpl in prebuilt_templates:
            cur.execute(insert_sql, tpl)
        conn.commit()

    # Create revisions table for template history
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS template_revisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            html_content TEXT,
            created_at TEXT
        )
        """
    )
    conn.commit()

    # Migration: ensure `status` column exists on templates (for older DBs)
    try:
        cur.execute("PRAGMA table_info(templates)")
        cols = [r[1] for r in cur.fetchall()]
        if 'status' not in cols:
            cur.execute(
                "ALTER TABLE templates ADD COLUMN status TEXT "
                "DEFAULT 'Business'"
            )
            conn.commit()
    except Exception:
        # best-effort: ignore migration failures
        pass

    conn.close()


@app.on_event("startup")
def startup_event():
    LOG.info("Initializing DB and seeding sample data (if needed)")
    init_db_and_seed()


# Include routers
app.include_router(templates_router.router, prefix="/api")
app.include_router(social_media.router, prefix="/api")
app.include_router(template_analysis.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(dev_migration.router)

# Include validation feature routers
app.include_router(
    content_validation.router,
    prefix="/api/content-validation",
    tags=["content-validation"]
)
app.include_router(
    cta_validation.router,
    prefix="/api/cta-validation",
    tags=["cta-validation"]
)
app.include_router(
    locale_comparison.router,
    prefix="/api/locale-comparison",
    tags=["locale-comparison"]
)


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
