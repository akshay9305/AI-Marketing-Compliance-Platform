"""
Template Analysis Router
Provides endpoints for analyzing and processing HTML templates
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import re
import sys
import os
import sqlite3
from datetime import datetime

# Add the parent directory to the path so we can import from services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from services.template_analyzer import TemplateAnalyzer
except ImportError:
    # Fallback for different import scenarios
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "template_analyzer", 
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "services", "template_analyzer.py")
    )
    template_analyzer_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(template_analyzer_module)
    TemplateAnalyzer = template_analyzer_module.TemplateAnalyzer

router = APIRouter(prefix="/template-analysis")
analyzer = TemplateAnalyzer()


def get_db_conn():
    conn = sqlite3.connect("marketing_compliance.db")
    conn.row_factory = sqlite3.Row
    return conn


class TemplateAnalysisRequest(BaseModel):
    html_content: str
    name: Optional[str] = None
    category: Optional[str] = "Email"
    description: Optional[str] = None


class TemplateAnalysisResponse(BaseModel):
    html_content: str
    modules: List[Dict[str, Any]]
    analysis: Dict[str, Any]
    suggested_template: Dict[str, Any]


@router.post("/analyze", response_model=TemplateAnalysisResponse)
async def analyze_template(request: TemplateAnalysisRequest):
    """
    Analyze HTML template and extract editable modules
    
    Args:
        request: Template analysis request with HTML content
        
    Returns:
        Analyzed template with detected modules
    """
    try:
        # Analyze the template
        analysis_result = analyzer.analyze_template(request.html_content)
        
        # Create suggested template structure
        suggested_template = {
            "name": request.name or "Analyzed Template",
            "category": request.category,
            "description": request.description or f"Template with {len(analysis_result['modules'])} detected modules",
            "html_content": analysis_result['html_content'],
            "modules": analysis_result['modules'],
            "compliance_score": 0  # Would be calculated by compliance service
        }
        
        return TemplateAnalysisResponse(
            html_content=analysis_result['html_content'],
            modules=analysis_result['modules'],
            analysis=analysis_result['analysis'],
            suggested_template=suggested_template
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze template: {str(e)}")


@router.post("/upload-and-analyze")
async def upload_and_analyze_template(
    file: UploadFile = File(...),
    name: Optional[str] = None,
    category: Optional[str] = "Email",
    description: Optional[str] = None
):
    """
    Upload HTML or MJML file and analyze it for modules
    
    Args:
        file: HTML or MJML file upload
        name: Optional template name
        category: Template category
        description: Optional template description
        
    Returns:
        Analyzed template with detected modules
    """
    try:
        # Validate file type
        allowed_extensions = ('.html', '.htm', '.mjml')
        if not file.filename.lower().endswith(allowed_extensions):
            raise HTTPException(
                status_code=400,
                detail="Only HTML and MJML files are supported"
            )
        
        # Read file content
        file_content = await file.read()
        file_content = file_content.decode('utf-8')
        
        # Detect file type
        file_extension = file.filename.lower().split('.')[-1]
        is_mjml = file_extension == 'mjml'
        
        # Use filename as default name if not provided
        template_name = file.filename.replace(
            f'.{file_extension}', ''
        ).replace('_', ' ').title()
        if not name:
            name = template_name
        
        # Analyze the template with file type detection
        analysis_result = analyzer.analyze_template(
            file_content, is_mjml
        )
        
        # Create suggested template structure
        suggested_template = {
            "name": name,
            "category": category,
            "description": description or "Template with detected modules",
            "html_content": analysis_result['html_content'],
            "modules": analysis_result['modules'],
            "attributes": analysis_result.get('attributes', {}),
            "module_attributes": analysis_result.get('module_attributes', {}),
            "schema": analysis_result.get('schema', {}),
            "compliance_score": 0
        }
        
        return {
            "html_content": analysis_result['html_content'],
            "modules": analysis_result['modules'],
            "analysis": analysis_result['analysis'],
            "attributes": analysis_result.get('attributes', {}),
            "module_attributes": analysis_result.get('module_attributes', {}),
            "schema": analysis_result.get('schema', {}),
            "suggested_template": suggested_template
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's UTF-8 encoded.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process uploaded file: {str(e)}")


@router.post("/save-analyzed-template")
async def save_analyzed_template(template_data: Dict[str, Any]):
    """
    Save an analyzed template to the database
    
    Args:
        template_data: Complete template data including modules
        
    Returns:
        Saved template information
    """
    try:
        import sqlite3
        import json
        from datetime import datetime
        
        # Connect to database
        conn = sqlite3.connect("marketing_compliance.db")
        cursor = conn.cursor()
        
        # Insert the template
        cursor.execute("""
            INSERT INTO templates (name, category, description, html_content, schema, module_attributes, modules, compliance_score, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            template_data["name"],
            template_data["category"],
            template_data["description"],
            template_data["html_content"],
            json.dumps(template_data.get("schema", {})),
            json.dumps(template_data.get("module_attributes", {})),
            json.dumps(template_data["modules"]),
            template_data.get("compliance_score", 0),
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        
        template_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": "Template saved successfully to database",
            "template": template_data,
            "id": template_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save template: {str(e)}")


@router.get("/module-types")
async def get_module_types():
    """
    Get available module types for template analysis
    
    Returns:
        List of available module types and their descriptions
    """
    return {
        "module_types": {
            "header": {
                "name": "Header",
                "description": "Header section with branding and navigation",
                "typical_elements": ["logo", "navigation", "branding"]
            },
            "hero": {
                "name": "Hero Section", 
                "description": "Main promotional content and call-to-action",
                "typical_elements": ["images", "headlines", "buttons", "offers"]
            },
            "content": {
                "name": "Content",
                "description": "Primary content area with text and media", 
                "typical_elements": ["text", "images", "links", "descriptions"]
            },
            "footer": {
                "name": "Footer",
                "description": "Footer with legal links and contact information",
                "typical_elements": ["unsubscribe", "privacy", "contact", "legal"]
            },
            "sidebar": {
                "name": "Sidebar",
                "description": "Sidebar content and widgets",
                "typical_elements": ["widgets", "secondary content", "navigation"]
            },
            "navigation": {
                "name": "Navigation",
                "description": "Navigation menu and links",
                "typical_elements": ["menu", "links", "breadcrumbs"]
            }
        }
    }


@router.post("/render-template")
async def render_template_with_modules(request: Dict[str, Any]):
    """
    Render template with selected modules and payload
    
    Args:
        request: Contains template_id, selected_modules, and payload
        
    Returns:
        Rendered HTML content
    """
    try:
        template_id = request.get("template_id")
        selected_modules = request.get("selected_modules", [])
        payload = request.get("payload", {})
        
        if not template_id:
            raise HTTPException(
                status_code=400, detail="template_id is required"
            )
        
        # Fetch template from database
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT html_content, modules FROM templates WHERE id = ?",
            (template_id,)
        )
        row = cur.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        
        html_content = row[0]
        modules_data = row[1]
        
        # If modules_data is stored as string, parse it
        if isinstance(modules_data, str):
            try:
                modules_data = json.loads(modules_data)
            except json.JSONDecodeError:
                modules_data = []
        
        # If html_content has placeholders, we need to reconstruct from original
        # For now, assume html_content is the processed version with placeholders
        # We need to rebuild it with selected modules
        
        # Extract header and footer (always included)
        header_pattern = r'<!--\s*HEADER_START\s*-->.*?<!--\s*HEADER_END\s*-->'
        header_match = re.search(header_pattern, html_content,
                                 re.DOTALL | re.IGNORECASE)
        footer_pattern = r'<!--\s*FOOTER_START\s*-->.*?<!--\s*FOOTER_END\s*-->'
        footer_match = re.search(footer_pattern, html_content,
                                 re.DOTALL | re.IGNORECASE)
        
        rendered_html = ""
        
        # Add header if exists
        if header_match:
            header_html = header_match.group(0)
            styled_header = (
                '<div class="header-container" '
                'style="margin: 20px 0; border: 1px solid #e9ecef; '
                'border-radius: 8px; overflow: hidden;">'
                '<div class="header-bar" '
                'style="background-color: #003580; color: white; '
                'padding: 8px 12px; font-weight: bold; font-size: 14px;">'
                'Header Section</div>'
                '<div class="header-content" style="padding: 15px;">'
                f'{header_html}'
                '</div>'
                '</div>'
            )
            rendered_html += styled_header + "\n"
        
        # Add selected modules - reconstruct from module data
        for module_id in selected_modules:
            # Find module by ID
            module = None
            for m in modules_data:
                if str(m.get('id', '')) == str(module_id):
                    module = m
                    break
            
            if module and 'content' in module:
                # Use the stored module content
                module_content = module['content']
                module_type = module.get('type', 'unknown')
                module_name = module.get('name', module_type)
                
                # Add visual segmentation for preview
                # Use different colors for different module types
                color_map = {
                    'hero': '#1668E3',     # Expedia blue
                    'content': '#191E3B',  # Expedia dark blue
                    'promo': '#EFF3F7',    # Expedia light gray
                    'default': '#6c757d'   # Gray
                }
                module_color = color_map.get(module_type, color_map['default'])
                
                segmented_content = (
                    f'<div class="module-container" '
                    f'style="margin: 20px 0; border: 1px solid #e9ecef; '
                    f'border-radius: 8px; overflow: hidden;">'
                    f'<div class="module-header" '
                    f'style="background-color: {module_color}; color: white; '
                    f'padding: 8px 12px; font-weight: bold; font-size: 14px; '
                    f'border-bottom: 1px solid #dee2e6;">'
                    f'{module_name} Module</div>'
                    f'<div class="module-content" style="padding: 15px;">'
                    f'{module_content}'
                    f'</div>'
                    f'</div>'
                )
                
                # Replace variables in module content
                for key, value in payload.items():
                    # Handle both Handlebars and AMPscript syntax
                    pattern1 = r'\{\{\s*' + re.escape(key) + r'\s*\}\}'
                    segmented_content = re.sub(
                        pattern1, str(value), segmented_content
                    )
                    pattern2 = r'%%=v\(@' + re.escape(key) + r'\)=%%'
                    segmented_content = re.sub(
                        pattern2, str(value), segmented_content
                    )
                rendered_html += segmented_content + "\n"
        
        # Add footer if exists
        if footer_match:
            footer_html = footer_match.group(0)
            styled_footer = (
                '<div class="footer-container" '
                'style="margin: 20px 0; border: 1px solid #e9ecef; '
                'border-radius: 8px; overflow: hidden;">'
                '<div class="footer-bar" '
                'style="background-color: #6c757d; color: white; '
                'padding: 8px 12px; font-weight: bold; font-size: 14px;">'
                'Footer Section</div>'
                '<div class="footer-content" style="padding: 15px;">'
                f'{footer_html}'
                '</div>'
                '</div>'
            )
            rendered_html += styled_footer
        
        return {"rendered_html": rendered_html}
        
    except Exception as e:
        error_msg = f"Failed to render template: {str(e)}"
        raise HTTPException(status_code=400, detail=error_msg)
