from fastapi import APIRouter, HTTPException
from typing import List
import json
import sqlite3
from models.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateSummary,
    ValidationResult,
    FullTemplate,
    RewriteRequest,
    RewriteResponse,
)
from services import content_validation
from fastapi import status
from datetime import datetime

router = APIRouter(prefix="/templates", tags=["templates"])


def get_db_conn():
    conn = sqlite3.connect("marketing_compliance.db")
    conn.row_factory = sqlite3.Row
    return conn


@router.get("", response_model=List[TemplateSummary])
def list_templates():
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, category, description, status, "
        "compliance_score, created_at "
        "FROM templates ORDER BY id DESC"
    )
    rows = cur.fetchall()
    conn.close()
    results = []
    for r in rows:
        results.append(
            TemplateSummary(
                id=r["id"],
                name=r["name"],
                category=r["category"],
                description=r["description"],
                compliance_score=r["compliance_score"] or 0,
                created_at=r["created_at"],
                status=(r['status'] if 'status' in r.keys() else 'Business'),
            )
        )
    print(f"DEBUG: Returning {len(results)} templates from /api/templates")
    return results


@router.post("", response_model=TemplateSummary,
             status_code=status.HTTP_201_CREATED)
def create_template(payload: TemplateCreate):
    conn = get_db_conn()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        (
            "INSERT INTO templates (name, category, description, status, "
            "html_content, modules, compliance_score, created_at, "
            "updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ),
        (
            payload.name,
            payload.category,
            payload.description,
            getattr(payload, 'status', 'Business'),
            payload.html_content,
            str(payload.modules),
            payload.compliance_score or 0,
            now,
            now,
        ),
    )
    conn.commit()
    template_id = cur.lastrowid
    conn.close()
    return TemplateSummary(
        id=template_id,
        name=payload.name,
        category=payload.category,
        description=payload.description,
        compliance_score=payload.compliance_score or 0,
        created_at=now,
    )


@router.get("/sample/corrected")
def get_corrected_sample():
    """Get a sample corrected HTML template for AI-Resolve demo"""
    try:
        # Read the corrected HTML file
        with open("../extra/expedia_marketing_template_corrected.html", "r", encoding="utf-8") as f:
            corrected_html = f.read()

        return {
            "html_content": corrected_html,
            "compliance_score": 93,
            "message": "AI-corrected template with improved compliance"
        }
    except FileNotFoundError:
        # Fallback if file doesn't exist
        return {
            "html_content": "<html><body><h1>Sample Corrected Template</h1><p>This is a corrected version with improved compliance.</p></body></html>",
            "compliance_score": 93,
            "message": "Fallback corrected template"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading corrected template: {str(e)}")


@router.get("/{template_id}", response_model=FullTemplate)
def get_template(template_id: int):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, category, description, status, "
        "html_content, schema, modules, compliance_score, created_at "
        "FROM templates WHERE id = ?",
        (template_id,),
    )
    r = cur.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Template not found")
    # Try to parse modules field (stored as stringified list) back to JSON
    modules_val = []
    try:
        raw_modules = r["modules"] if "modules" in r.keys() else '[]'
        if raw_modules:
            import json
            try:
                modules_val = json.loads(raw_modules)
            except Exception:
                # fallback: try eval as last resort
                try:
                    modules_val = eval(raw_modules)
                except Exception:
                    modules_val = []
    except Exception:
        modules_val = []

    return FullTemplate(
        id=r["id"],
        name=r["name"],
        category=r["category"],
        description=r["description"],
        status=(r['status'] if 'status' in r.keys() else 'Business'),
        compliance_score=r["compliance_score"] or 0,
        created_at=r["created_at"],
        html_content=r["html_content"] if "html_content" in r.keys() else '',
        modules=modules_val,
        module_attributes=None,
        schema=None if "schema" not in r.keys() else (
            (lambda s: __import__('json').loads(s) if s else None)(r['schema'])
        ),
    )


@router.put("/{template_id}", response_model=TemplateSummary)
def update_template(template_id: int, payload: TemplateUpdate):
    conn = get_db_conn()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "UPDATE templates SET html_content = ?, modules = ?, updated_at = ? "
        "WHERE id = ?",
        (payload.html_content, str(payload.modules), now, template_id),
    )
    conn.commit()
    cur.execute(
        "SELECT id, name, category, description, compliance_score, created_at "
        "FROM templates WHERE id = ?",
        (template_id,),
    )
    r = cur.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateSummary(
        id=r["id"],
        name=r["name"],
        category=r["category"],
        description=r["description"],
        compliance_score=r["compliance_score"] or 0,
        created_at=r["created_at"],
    )


@router.put("/{template_id}/schema", response_model=TemplateSummary)
def update_template_schema(template_id: int, payload: dict):
    """Update only the schema JSON for a template."""
    import json
    conn = get_db_conn()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    # store the schema as a JSON string
    try:
        schema_text = json.dumps(payload)
    except Exception:
        schema_text = str(payload)

    cur.execute(
        "UPDATE templates SET schema = ?, updated_at = ? WHERE id = ?",
        (schema_text, now, template_id),
    )
    conn.commit()

    cur.execute(
        "SELECT id, name, category, description, compliance_score, created_at "
        "FROM templates WHERE id = ?",
        (template_id,),
    )
    r = cur.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateSummary(
        id=r["id"],
        name=r["name"],
        category=r["category"],
        description=r["description"],
        compliance_score=r["compliance_score"] or 0,
        created_at=r["created_at"],
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM templates WHERE id = ?", (template_id,))
    conn.commit()
    conn.close()
    return None


@router.post("/{template_id}/validate", response_model=ValidationResult)
async def validate_template(template_id: int):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, html_content, category FROM templates WHERE id = ?",
        (template_id,),
    )
    r = cur.fetchone()
    if not r:
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")

    html_content = r["html_content"] if "html_content" in r.keys() else r[2]

    # extract text and call async LLM validator (node-aware when possible)
    issues = []
    try:
        # Determine marketing_type from DB category
        category_val = (
            r["category"]
            if "category" in r.keys() and r["category"] is not None
            else ''
        )
        category_str = (category_val or '').lower()
        if 'social' in category_str:
            marketing_type = 'social_media'
        elif 'affiliate' in category_str:
            marketing_type = 'affiliate'
        elif 'ad' in category_str or 'advert' in category_str:
            marketing_type = 'ads'
        else:
            marketing_type = 'email'

        country = 'US'

        # Try to extract node-level text (data-node-id) from HTML
        nodes = []
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(html_content or '', 'html.parser')
            for el in soup.find_all(attrs={"data-node-id": True}):
                nid = el.attrs.get('data-node-id')
                txt = el.get_text(separator=' ', strip=True)
                nodes.append({"node_id": nid, "text": txt, "html": str(el)})
        except Exception:
            nodes = []

        if nodes:
            issues = await content_validation.validate_with_llm(
                None, country, marketing_type, nodes=nodes
            )
        else:
            # Prefer the agent helper to extract text when no node ids
            try:
                text_content = (
                    content_validation.ContentValidationAgent
                    .read_html_file(html_content or "")
                )
            except Exception:
                # fallback simple strip tags
                import re

                text_content = re.sub(r'<[^>]+>', '', html_content or '')

            issues = await content_validation.validate_with_llm(
                text_content, country, marketing_type
            )
    except Exception:
        # Log and fall back to rule-based checks
        import logging

        logging.getLogger(__name__).exception('LLM validation failed')

        if html_content and 'unsubscribe' not in (html_content or '').lower():
            issues.append({
                'type': 'compliance',
                'severity': 'high',
                'location': 'Footer',
                'issue': 'Missing unsubscribe link',
                'suggestion': (
                    'Add a clear unsubscribe link in the footer to comply '
                    'with CAN-SPAM/CASL'
                ),
                'context': (html_content or '')[:120]
            })

        if html_content and (
            'price' in (html_content or '').lower()
            or '$' in (html_content or '')
        ):
            issues.append({
                'type': 'pricing',
                'severity': 'medium',
                'location': 'Body',
                'issue': 'Price transparency check recommended',
                'suggestion': (
                    'Ensure prices include taxes/fees or clearly '
                    'disclose them'
                ),
                'context': (html_content or '')[:120]
            })

    # simple heuristic score
    score = 100 - min(100, len(issues) * 5)
    now = datetime.utcnow().isoformat()
    cur.execute(
        "UPDATE templates SET compliance_score = ?, updated_at = ? "
        "WHERE id = ?",
        (score, now, template_id),
    )
    conn.commit()
    conn.close()

    return ValidationResult(
        template_id=template_id,
        compliance_score=score,
        validation_results=issues,
    )


@router.post(
    "/{template_id}/fork_for_developer",
    response_model=TemplateSummary,
)
def fork_for_developer(template_id: int, payload: dict = None):
    """Create a developer copy of the template (status='Developer') with the
    provided latest schema. Returns the new template summary.
    Expects optional payload: { schema: { ... } }
    """
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, category, description, html_content, schema "
        "FROM templates WHERE id = ?",
        (template_id,),
    )
    r = cur.fetchone()
    if not r:
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")

    now = datetime.utcnow().isoformat()
    name = (r['name'] or '') + ' (Developer)'
    category = r['category'] if 'category' in r.keys() else 'email'
    description = r['description'] if 'description' in r.keys() else ''
    html_content = r['html_content'] if 'html_content' in r.keys() else ''
    # If caller supplied a schema in payload, prefer it; otherwise reuse
    # the existing schema from the source template.
    schema_text = None
    try:
        if payload and 'schema' in payload and payload['schema'] is not None:
            import json as _json
            if isinstance(payload['schema'], str):
                schema_text = payload['schema']
            else:
                schema_text = _json.dumps(payload['schema'])
    except Exception:
        schema_text = None
    if schema_text is None:
        schema_text = r['schema'] if 'schema' in r.keys() else None

    cur.execute(
        (
            "INSERT INTO templates (name, category, description, status, "
            "html_content, schema, modules, compliance_score, created_at, "
            "updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ),
        (
            name,
            category,
            description,
            'Developer',
            html_content,
            schema_text,
            r['modules'] if 'modules' in r.keys() else '[]',
            r['compliance_score'] if 'compliance_score' in r.keys() else 0,
            now,
            now,
        ),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return TemplateSummary(
        id=new_id,
        name=name,
        category=category,
        description=description,
        compliance_score=(
            r['compliance_score'] if 'compliance_score' in r.keys() else 0
        ),
        created_at=now,
        status='Developer',
    )


@router.post("/{template_id}/assistant-edit")
def assistant_edit_template(template_id: int, payload: dict):
    """Stub endpoint for AI assistant edits.

    Expects payload: { node_id: str, selected_html: str, prompt: str }
    Returns: { modified_html: str }

    This is a simple stub to demonstrate the edit flow. In production this
    should call an LLM, validate and sanitize returned HTML, and enforce
    security checks before applying any changes.
    """
    import logging

    node_id = payload.get('node_id')
    selected_html = payload.get('selected_html', '')
    prompt = payload.get('prompt', '')

    lg = logging.getLogger(__name__)
    lg.debug(
        "assistant-edit called for template=%s node=%s prompt=%s",
        template_id,
        node_id,
        (prompt or '')[:120],
    )

    # Inline sanitizer for snippets: remove scripts, event handlers,
    # javascript: URIs and iframes (conservative).
    def sanitize_snippet(html_text: str) -> str:
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(html_text or '', 'html.parser')
            for tag in soup(['script', 'style']):
                tag.decompose()
            for el in soup.find_all(True):
                attrs = list(el.attrs.keys())
                for a in attrs:
                    if a.lower().startswith('on'):
                        try:
                            del el.attrs[a]
                        except Exception:
                            pass
                    else:
                        val = el.attrs.get(a)
                        if isinstance(val, str):
                            has_js = 'javascript:' in val.lower()
                            if has_js:
                                el.attrs[a] = '#'
            for ifr in soup.find_all('iframe'):
                ifr.decompose()
            return str(soup)
        except Exception:
            return html_text

    # Attempt to use LLM; fall back to simple edits if unavailable
    try:
        agent = content_validation.ContentValidationAgent()
        if not agent.client:
            raise Exception('LLM client not configured')

        system_prompt = (
            'You are an AI assistant that edits an HTML fragment. Return the '
            'edited HTML only (no extra text). Preserve structure and avoid '
            'scripts or unsafe attributes.'
        )

        agent.set_system_message(system_prompt)
        # build a compact user message (split across lines)
        part0 = 'Instruction: ' + (prompt or '')
        part1 = '\n\nHTML:\n'
        user_message = part0 + part1 + (selected_html or '')
        agent.add_message('user', user_message)

        # Request completion
        resp = agent.client.chat.completions.create(
            model=agent.model,
            messages=agent.messages,
            max_tokens=agent.max_tokens,
        )
        reply = resp.choices[0].message.content

        # Strip code fences if present
        if isinstance(reply, str) and reply.startswith('```'):
            try:
                first_newline = reply.find('\n')
                reply = reply[first_newline + 1:]
            except Exception:
                pass
            if reply.endswith('```'):
                reply = reply[:-3]

        sanitized = sanitize_snippet(reply or '')
        if not sanitized or '<' not in sanitized:
            # fallback to original if something went wrong
            sanitized = sanitize_snippet(selected_html or '')

        return {'modified_html': sanitized}
    except Exception as e:
        lg.exception('assistant-edit LLM call failed: %s', e)

        # Last-resort fallback: simple marker-based tweak (previous behavior)
        modified = selected_html
        try:
            if 'share your referral link' in selected_html:
                modified = selected_html.replace(
                    'share your referral link',
                    (
                        '<span data-ai-edited="true" '
                        'style="background:#fffbcc">share your '
                        'referral link and get rewarded</span>'
                    ),
                )
            else:
                modified = selected_html.replace(
                    '</p>',
                    (
                        ' '
                        '<span data-ai-edited="true" '
                        'style="background:#fffbcc">(edited by AI)</span>'
                        '</p>'
                    ),
                )
        except Exception:
            modified = selected_html + '<!-- ai-edit-failed -->'

        return {'modified_html': modified}


@router.post(
    "/{template_id}/ai-compliance-rewrite",
    response_model=RewriteResponse,
)
async def ai_compliance_rewrite(template_id: int, payload: RewriteRequest):
    """Stub endpoint: accepts accepted issues and full_template_html and
    returns a rewritten full HTML.

    Expected payload: { accepted_issues: [...], full_template_html: str,
    rendered_html: str }
    Returns: { modified_full_html: str }
    """
    import logging

    accepted = payload.accepted_issues or []
    # nodes: list of NodeFragment with proposed modifications
    nodes = payload.nodes or []
    # client may provide rendered_html (schema applied) for context
    rendered_html = payload.rendered_html
    save_changes = bool(payload.save)

    # Load current full HTML from DB
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        'SELECT html_content FROM templates WHERE id = ?',
        (template_id,),
    )
    r = cur.fetchone()
    if not r:
        conn.close()
        raise HTTPException(status_code=404, detail='Template not found')
    full_html = r['html_content'] if 'html_content' in r.keys() else ''

    logging.getLogger(__name__).debug(
        'ai-compliance-rewrite called for template=%s accepted=%s save=%s',
        template_id,
        accepted,
        save_changes,
    )

    # Helper: sanitize HTML server-side to remove scripts and unsafe attributes
    def sanitize_html(html_text: str) -> str:
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(html_text or '', 'html.parser')

            # Remove script and style tags
            for tag in soup(['script', 'style']):
                tag.decompose()

            # Remove event handler attributes (on*) and javascript: URIs
            for el in soup.find_all(True):
                # copy list to avoid runtime changes
                attrs = list(el.attrs.keys())
                for a in attrs:
                    if a.lower().startswith('on'):
                        try:
                            del el.attrs[a]
                        except Exception:
                            pass
                    else:
                        val = el.attrs.get(a)
                        if isinstance(val, str):
                            # neutralize javascript: URIs
                            if 'javascript:' in val.lower():
                                el.attrs[a] = '#'

            # Remove meta refresh tags
            for m in soup.find_all('meta'):
                if m.attrs.get('http-equiv', '').lower() == 'refresh':
                    m.decompose()

            # Optionally remove iframes to be conservative
            for ifr in soup.find_all('iframe'):
                ifr.decompose()

            return str(soup)
        except Exception:
            return html_text

    # Prepare LLM call using the ContentValidationAgent pattern
    try:
        # If client provided node fragments, stitch them into the full_html
        from bs4 import BeautifulSoup

        modified_nodes = []
        stitched_html = full_html

        if nodes:
            soup = BeautifulSoup(full_html or '', 'html.parser')
            for frag in nodes:
                nid = frag.get('node_id')
                html_frag = frag.get('html_fragment') or ''
                target = soup.find(attrs={"data-node-id": nid})
                if target:
                    # Parse fragment and replace target
                    try:
                        frag_soup = BeautifulSoup(html_frag, 'html.parser')
                        new_el = (
                            frag_soup.body.decode_contents()
                            if frag_soup.body
                            else str(frag_soup)
                        )
                        # Replace using .replace_with on the original element
                        target.replace_with(
                            BeautifulSoup(new_el, 'html.parser')
                        )
                        modified_nodes.append(
                            {"node_id": nid, "modified_html": html_frag}
                        )
                    except Exception:
                        # If parse/replace fails, skip and continue
                        continue
                else:
                    # Node not found - record as skipped (returned but
                    # not applied)
                    modified_nodes.append(
                        {"node_id": nid, "modified_html": None}
                    )

            stitched_html = str(soup)

        # If no node fragments were provided, attempt an LLM-driven rewrite
        # based on the accepted issues and the stitched HTML. Otherwise the
        # stitched_html already contains node-level replacements.
        rewritten_html = None
        if not nodes:
            try:
                agent = content_validation.ContentValidationAgent()
                # Only call the LLM if a client is configured
                if agent.client:
                    # Give a concise system prompt instructing a full-template
                    # rewrite that only returns HTML (no commentary).
                    sys_msg = (
                        "Rewrite the marketing email HTML to address the"
                        " accepted compliance issues. Return only the HTML"
                        " (no explanations). Make minimal edits and avoid"
                        " adding scripts or unsafe attributes."
                    )
                    agent.set_system_message(sys_msg)
                    user_msg = (
                        "Accepted issues:\n" +
                        (json.dumps(accepted) or '[]') +
                        "\n\nOriginal HTML:\n" + (stitched_html or '')
                    )
                    agent.add_message('user', user_msg)
                    resp = agent.client.chat.completions.create(
                        model=agent.model,
                        messages=agent.messages,
                        max_tokens=agent.max_tokens,
                    )
                    reply = resp.choices[0].message.content
                    # strip code fences if present
                    if isinstance(reply, str) and reply.startswith('```'):
                        try:
                            first_newline = reply.find('\n')
                            reply = reply[first_newline + 1:]
                        except Exception:
                            pass
                        if reply.endswith('```'):
                            reply = reply[:-3]
                    rewritten_html = reply
            except Exception:
                # If LLM fails, continue and fall back to deterministic
                # rule-based edits so the UI can show a visible change when
                # the LLM is not configured (local/dev environments).
                rewritten_html = None

        # If the LLM didn't produce a rewrite, perform simple rule-based
        # deterministic edits for common accepted issues so users can
        # immediately see suggested fixes in development environments.
        if not rewritten_html:
            try:
                # operate on a fresh soup of the stitched HTML
                soup_edit = BeautifulSoup(stitched_html or '', 'html.parser')
                changed_ids = []

                # Helper: try to find an element containing text and replace
                def find_by_text_and_replace(substrs, new_html):
                    for s in substrs:
                        found = soup_edit.find(
                            text=lambda t: t and s.lower() in t.lower()
                        )
                        if found:
                            parent = found.parent
                            # insert new HTML after the parent and mark parent
                            try:
                                new_fragment = BeautifulSoup(
                                    new_html, 'html.parser'
                                )
                                parent.insert_after(new_fragment)
                                nid = parent.attrs.get('data-node-id')
                                if nid:
                                    changed_ids.append(nid)
                                return True
                            except Exception:
                                continue
                    return False

                # For 'Terms apply' issues, add an explicit link to Terms
                if any(
                    'terms' in (it.get('issue') or '').lower()
                    or 'terms' in (it.get('suggestion') or '').lower()
                    for it in accepted
                ):
                    added = find_by_text_and_replace(
                        [
                            'terms apply',
                            'terms and conditions',
                            'terms apply.',
                        ],
                        (
                            '<p>'
                            '<a href="https://example.com/terms" '
                            'data-ai-added="true">Terms &amp; Conditions</a>'
                            '</p>'
                        ),
                    )
                    if not added:
                        # append to footer or body end
                        footer = soup_edit.find('footer') or soup_edit.body
                        footer.append(
                            BeautifulSoup(
                                (
                                    '<p>'
                                    '<a href="https://example.com/terms" '
                                    'data-ai-added="true">'
                                    'Terms &amp; Conditions</a>'
                                    '</p>'
                                ),
                                'html.parser',
                            )
                        )

                # For missing unsubscribe, ensure a link exists in footer
                if any(
                    'unsubscribe' in (
                        (it.get('issue') or '') + (it.get('suggestion') or '')
                    ).lower()
                    for it in accepted
                ):
                    if not soup_edit.find(
                        'a', href=lambda v: v and 'unsubscribe' in v.lower()
                    ):
                        footer = soup_edit.find('footer') or soup_edit.body
                        footer.append(
                            BeautifulSoup(
                                '<p><a href="https://example.com/unsubscribe" '
                                'data-ai-added="true">Unsubscribe</a></p>',
                                'html.parser',
                            )
                        )

                # For business identification missing, append a conservative
                # footer
                if any(
                    'business' in (it.get('issue') or '').lower()
                    or 'business' in (it.get('suggestion') or '').lower()
                    for it in accepted
                ):
                    if not soup_edit.find(
                        text=lambda t: t
                        and 'business' in t.lower()
                        or 'address' in t.lower()
                    ):
                        footer = soup_edit.find('footer') or soup_edit.body
                        footer.append(
                            BeautifulSoup(
                                (
                                    '<p data-ai-added="true">'
                                    'Expedia Group, 555 Example St, '
                                    'Seattle, WA'
                                    '</p>'
                                ),
                                'html.parser',
                            )
                        )

                # If we've made edits, set rewritten_html and record
                # modified_nodes
                rewritten_html = str(soup_edit)
                # If we found changed_ids, include them otherwise keep
                # modified_nodes as-is
                if changed_ids:
                    # merge any recorded modified_nodes with these ids
                    for cid in changed_ids:
                        if not any(
                            mn.get('node_id') == cid for mn in modified_nodes
                        ):
                            modified_nodes.append(
                                {'node_id': cid, 'modified_html': None}
                            )
            except Exception:
                # ignore rule-based fallback failures
                rewritten_html = None

        # Prefer the LLM rewrite when present, otherwise use stitched_html
        source_html_for_sanitize = rewritten_html or stitched_html

        # Sanitize the HTML we will return
        sanitized = sanitize_html(source_html_for_sanitize)

        # Ensure returned HTML is annotated with deterministic data-node-id
        # attributes so the frontend can map elements back to node ids and
        # highlight them. Create a mapping from the original stitched_html
        # so we can detect which node ids changed and populate
        # modified_nodes accordingly.
        try:
            # Build a map of original node_id -> original element HTML
            original_html_by_id = {}
            try:
                orig_soup = BeautifulSoup(stitched_html or '', 'html.parser')
                for oel in orig_soup.find_all(attrs={"data-node-id": True}):
                    oid = oel.attrs.get('data-node-id')
                    try:
                        original_html_by_id[oid] = str(oel)
                    except Exception:
                        original_html_by_id[oid] = oel.get_text(strip=True)
            except Exception:
                original_html_by_id = {}

            soup_out = BeautifulSoup(sanitized or '', 'html.parser')
            # choose a root to annotate (prefer body)
            root = soup_out.body if soup_out.body else soup_out

            # compute starting counter based on any existing node-N ids
            import re as _re
            max_existing = 0
            for el in root.find_all(True):
                nid = el.attrs.get('data-node-id')
                if nid:
                    m = _re.match(r'node-(\d+)$', nid)
                    if m:
                        try:
                            v = int(m.group(1))
                            if v > max_existing:
                                max_existing = v
                        except Exception:
                            pass

            counter = max_existing + 1

            # Helper: normalize text for matching
            def norm_text(t):
                try:
                    return (t or '').strip().lower()[:60]
                except Exception:
                    return ''

            # Build quick reverse map from original text -> node id
            text_to_id = {}
            for oid, html_snip in list(original_html_by_id.items()):
                try:
                    from bs4 import BeautifulSoup as _BS

                    _s = _BS(html_snip or '', 'html.parser')
                    txt = norm_text(_s.get_text(separator=' ', strip=True))
                    if txt:
                        # only record first occurrence for simplicity
                        if txt not in text_to_id:
                            text_to_id[txt] = oid
                except Exception:
                    continue

            # Assign data-node-id where missing, attempting to preserve
            # original node ids by matching on normalized text when
            # possible. Otherwise assign sequential node-N ids.
            for el in root.find_all(True):
                if not el.has_attr('data-node-id'):
                    # try to find matching original id by text
                    txt = norm_text(el.get_text(separator=' ', strip=True))
                    matched = text_to_id.get(txt)
                    if matched and matched not in original_html_by_id:
                        # if matched id doesn't exist in original map, ignore
                        matched = None
                    if matched:
                        el.attrs['data-node-id'] = matched
                    else:
                        el.attrs['data-node-id'] = f'node-{counter}'
                        counter += 1

            # Update sanitized to the annotated HTML
            sanitized = str(soup_out)

            # Now compute modified_nodes by comparing original_html_by_id
            # against the annotated output. If an original node_id exists
            # and the element's HTML changed, include it. Also include any
            # new nodes that weren't in the original as modified.
            try:
                # refresh soup_out for queries
                soup_out = BeautifulSoup(sanitized or '', 'html.parser')
                for oid, orig_html in original_html_by_id.items():
                    found = soup_out.find(attrs={'data-node-id': oid})
                    if found:
                        out_html = str(found)
                        if (orig_html or '').strip() != out_html.strip():
                            # record changed node
                            modified_nodes.append(
                                {'node_id': oid, 'modified_html': out_html}
                            )
                    else:
                        # original node removed in output
                        modified_nodes.append({
                            'node_id': oid,
                            'modified_html': None,
                        })

                # Any nodes in output not present in original map are new
                for el in soup_out.find_all(attrs={'data-node-id': True}):
                    nid = el.attrs.get('data-node-id')
                    if nid and nid not in original_html_by_id:
                        modified_nodes.append(
                            {'node_id': nid, 'modified_html': str(el)}
                        )
            except Exception:
                # if diffing fails, keep whatever modified_nodes we had
                pass
        except Exception:
            # If annotation fails, continue with unannotated sanitized HTML
            pass

        # Run pre/post validation (if possible) to detect regressions
        validation_before = []
        validation_after = []
        regressions = False
        try:
            # Determine marketing_type from DB category
            cur = conn.cursor()
            cur.execute(
                'SELECT category FROM templates WHERE id = ?',
                (template_id,),
            )
            rc = cur.fetchone()
            category_val = (
                rc['category'] if rc and 'category' in rc.keys() else ''
            )
            category_str = (category_val or '').lower()
            if 'social' in category_str:
                marketing_type = 'social_media'
            elif 'affiliate' in category_str:
                marketing_type = 'affiliate'
            elif 'ad' in category_str or 'advert' in category_str:
                marketing_type = 'ads'
            else:
                marketing_type = 'email'

            country = 'US'

            # Validate before (use rendered_html if provided)
            if rendered_html:
                text_before = (
                    content_validation.ContentValidationAgent
                    .read_html_file(rendered_html or '')
                )
                validation_before = await content_validation.validate_with_llm(
                    text_before, country, marketing_type
                )

            # Validate after using sanitized HTML
            text_after = (
                content_validation.ContentValidationAgent.read_html_file(
                    sanitized or ''
                )
            )
            validation_after = await content_validation.validate_with_llm(
                text_after, country, marketing_type
            )

            # detect newly added high severity issues
            def high_issues(issues):
                out = []
                for it in (issues or []):
                    sev = (it.get('severity') or '').lower()
                    if sev == 'high':
                        out.append(it)
                return out

            before_high = {
                (it.get('issue') or it.get('rule') or '')
                for it in high_issues(validation_before)
            }
            after_high = {
                (it.get('issue') or it.get('rule') or '')
                for it in high_issues(validation_after)
            }
            new_high = after_high - before_high
            if new_high:
                regressions = True
        except Exception:
            pass

        saved = False
        if save_changes:
            if regressions:
                saved = False
            else:
                cur = conn.cursor()
                cur.execute(
                    'SELECT html_content FROM templates WHERE id = ?',
                    (template_id,),
                )
                r = cur.fetchone()
                current_html = (
                    r['html_content']
                    if r and 'html_content' in r.keys()
                    else ''
                )
                now = datetime.utcnow().isoformat()
                cur.execute(
                    'INSERT INTO template_revisions '
                    '(template_id, html_content, created_at) VALUES (?, ?, ?)',
                    (template_id, current_html or '', now),
                )
                cur.execute(
                    'UPDATE templates SET html_content = ?, '
                    'updated_at = ? WHERE id = ?',
                    (sanitized, now, template_id),
                )
                conn.commit()
                saved = True

        conn.close()

        # Build response
        resp = {
            'modified_nodes': [mn for mn in modified_nodes],
            'modified_full_html': sanitized,
            'validation_before': validation_before,
            'validation_after': validation_after,
            'regressions': regressions,
            'saved': saved,
        }
        return resp

    except Exception as e:
        import logging as _logging

        _lg = _logging.getLogger(__name__)
        _lg.exception('ai-compliance-rewrite failed: %s', e)
        safe = sanitize_html(full_html)
        conn.close()
        return {
            'modified_nodes': [],
            'modified_full_html': safe,
            'validation_before': [],
            'validation_after': [],
            'regressions': False,
            'saved': False,
        }


@router.post('/ai-compliance-rewrite')
def ai_compliance_rewrite_ephemeral(payload: dict):
    """Ephemeral rewrite endpoint that does not require a template id and will
    not persist changes. Accepts same payload as the template-scoped endpoint
    and returns a preview of the rewritten HTML."""
    # Reuse the same implementation by calling the template-scoped function
    # with template_id = None and save=False
    try:
        # call the same logic but avoid any DB save;
        # temporarily wrap into payload
        payload = dict(payload or {})
        payload['save'] = False
        # We can reuse the ai_compliance_rewrite by passing
        # template_id = -1 and ensuring that save=False prevents DB writes.
        # Handle exceptions.
        return ai_compliance_rewrite(-1, payload)
    except Exception as e:
        import logging as _logging

        _lg = _logging.getLogger(__name__)
        _lg.exception('ephemeral ai-compliance-rewrite failed: %s', e)
        return {
            'modified_full_html': payload.get('full_template_html', ''),
            'edits': [],
        }
