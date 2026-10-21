from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import PlainTextResponse
import subprocess
import sys
import tempfile
import json
from pathlib import Path
import os

# Import visual validator at module level
try:
    from backend.services.visual_validator import compare_html_renders
except ImportError:
    # Fallback for running from different directories
    import importlib.util
    visual_validator_path = (
        Path(__file__).resolve().parents[1]
        / 'services'
        / 'visual_validator.py'
    )
    if visual_validator_path.exists():
        spec = importlib.util.spec_from_file_location(
            'visual_validator', visual_validator_path
        )
        visual_validator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(visual_validator)
        compare_html_renders = visual_validator.compare_html_renders
    else:
        compare_html_renders = None

router = APIRouter()


@router.post('/api/dev/render', response_class=PlainTextResponse)
async def render_html_with_ampscript(
    file: UploadFile = File(...),
    payload: str = Form(...),
    schema: str = Form(None),
):
    """Render uploaded HTML+AMPscript using the html_ampscript_renderer tool.

    Expects multipart/form-data with:
      - file: the uploaded HTML file (may contain AMPScript blocks)
      - payload: a JSON string payload used by the renderer
      - schema: optional schema text (not used by renderer now but accepted)
    """
    # validate payload JSON
    try:
        payload_obj = json.loads(payload or '{}')
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f'Invalid payload JSON: {e}'
        )

    # write uploaded file and payload to temp files and call renderer script
    tmpdir = Path(tempfile.mkdtemp())
    input_path = tmpdir / 'uploaded.html'
    payload_path = tmpdir / 'payload.json'
    output_path = tmpdir / 'rendered_output.html'

    contents = await file.read()
    input_path.write_bytes(contents)
    payload_path.write_text(json.dumps(payload_obj), encoding='utf-8')

    # locate renderer script relative to project
    script_path = (
        Path(__file__).resolve().parents[1]
        / 'services'
        / 'html_ampscript_renderer.py'
    )
    if not script_path.exists():
        raise HTTPException(status_code=500, detail='Renderer script missing')

    # run the renderer as a subprocess
    try:
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        subprocess.run(
            [
                sys.executable,
                str(script_path),
                str(input_path),
                str(payload_path),
                str(output_path),
            ],
            capture_output=True,
            text=True,
            check=True,
            encoding='utf-8',
            env=env,
        )
    except subprocess.CalledProcessError as e:
        # include stderr to assist debugging
        err = getattr(e, 'stderr', None)
        raise HTTPException(status_code=500, detail=f'Renderer error: {err}')

    # read output
    if not output_path.exists():
        raise HTTPException(
            status_code=500, detail='Renderer did not produce output'
        )

    rendered = output_path.read_text(encoding='utf-8')
    return PlainTextResponse(content=rendered, media_type='text/html')


@router.post('/api/dev/migrate', response_class=PlainTextResponse)
async def migrate_html_to_mjml(
    file: UploadFile = File(...),
    schema: str = Form(None),
):
    """Convert uploaded HTML+AMPscript into MJML+AMPscript using the
    html_ampscript_to_mjml.py service. Returns MJML text.
    """
    tmpdir = Path(tempfile.mkdtemp())
    input_path = tmpdir / 'uploaded.html'
    output_path = tmpdir / 'output.mjml'

    contents = await file.read()
    input_path.write_bytes(contents)

    script_path = (
        Path(__file__).resolve().parents[1]
        / 'services'
        / 'html_ampscript_to_mjml.py'
    )
    if not script_path.exists():
        raise HTTPException(status_code=500, detail='Migration script missing')

    try:
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        subprocess.run(
            [
                sys.executable,
                str(script_path),
                str(input_path),
                str(output_path),
            ],
            capture_output=True,
            text=True,
            check=True,
            encoding='utf-8',
            env=env,
        )
    except subprocess.CalledProcessError as e:
        err = getattr(e, 'stderr', None)
        raise HTTPException(status_code=500, detail=f'Migration failed: {err}')

    if not output_path.exists():
        raise HTTPException(
            status_code=500, detail='Migration produced no output'
        )

    mjml = output_path.read_text(encoding='utf-8')
    return PlainTextResponse(content=mjml, media_type='text/plain')


@router.post('/api/dev/render_mjml', response_class=PlainTextResponse)
async def render_mjml_with_payload(
    file: UploadFile = File(...),
    payload: str = Form(...),
):
    """Process MJML+AMPscript with a payload and compile to HTML using
    services/mjml_ampscript_renderer.py. Returns compiled HTML.
    """
    # validate payload JSON
    try:
        payload_obj = json.loads(payload or '{}')
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid payload JSON')

    tmpdir = Path(tempfile.mkdtemp())
    mjml_path = tmpdir / 'template.mjml'
    payload_path = tmpdir / 'payload.json'
    output_path = tmpdir / 'rendered_output.html'

    contents = await file.read()
    mjml_path.write_bytes(contents)
    payload_path.write_text(json.dumps(payload_obj), encoding='utf-8')

    script_path = (
        Path(__file__).resolve().parents[1]
        / 'services'
        / 'mjml_ampscript_renderer.py'
    )
    if not script_path.exists():
        raise HTTPException(status_code=500, detail='MJML renderer missing')

    try:
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        subprocess.run(
            [
                sys.executable,
                str(script_path),
                str(mjml_path),
                str(payload_path),
                str(output_path),
            ],
            capture_output=True,
            text=True,
            check=True,
            encoding='utf-8',
            env=env,
        )
    except subprocess.CalledProcessError as e:
        err = getattr(e, 'stderr', None)
        raise HTTPException(
            status_code=500, detail=f'MJML render failed: {err}'
        )

    if not output_path.exists():
        raise HTTPException(
            status_code=500, detail='MJML renderer produced no output'
        )

    html_out = output_path.read_text(encoding='utf-8')
    return PlainTextResponse(content=html_out, media_type='text/html')


@router.post('/api/dev/validate-visual')
async def validate_visual_rendering(
    original_html: str = Form(...),
    migrated_html: str = Form(...),
):
    """
    Validate and compare visual rendering of original and migrated HTML.

    Uses Playwright to generate screenshots and compares them using:
    - SSIM (Structural Similarity)
    - Color similarity
    - Alignment/layout similarity

    Args:
        original_html: Compiled original HTML content
        migrated_html: Compiled migrated/MJML HTML content

    Returns:
        JSON with comparison scores:
        {
            "ssim_score": float (0-1),
            "color_score": float (0-1),
            "alignment_score": float (0-1),
            "overall_score": float (0-1),
            "pass": bool (True if overall_score >= 0.85)
        }
    """
    try:
        if compare_html_renders is None:
            raise HTTPException(
                status_code=500,
                detail='Visual validator service not available.',
            )

        # Run the visual comparison
        results = await compare_html_renders(
            original_html, migrated_html
        )
        return results

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = f'Visual validation failed: {str(e)}'
        print(f"Error: {error_msg}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=error_msg,
        )
