import sys
from pathlib import Path

# ensure backend folder is on sys.path so 'services' package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services import mjml_ampscript_renderer as mj
print('Imported module file:', getattr(mj, '__file__', None))
print('Module dir:', [n for n in dir(mj) if not n.startswith('__')])

template = 'tmp_test/template.mjml'
payload = 'tmp_test/payload.json'
output = 'tmp_test/output_from_import.html'

print('Template exists?', Path(template).exists())
print('Payload exists?', Path(payload).exists())

try:
    mjml_content = mj.load_file(template)
    print('Loaded mjml length', len(mjml_content))
    payload_data = mj.load_payload(payload)
    print('Payload keys:', payload_data.keys())
    proc = mj.AMPScriptProcessor(payload_data)
    processed = proc.process(mjml_content)
    print('Processed length', len(processed))
    html = mj.compile_mjml_to_html(processed)
    print('Compiled length', len(html))
    mj.save_file(html, output)
    print('Wrote output', output)
except Exception as e:
    import traceback
    traceback.print_exc()
    print('Exception:', e)
