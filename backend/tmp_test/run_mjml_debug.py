import subprocess
import sys
from pathlib import Path

cmd = [
	sys.executable,
	'services/mjml_ampscript_renderer.py',
	'tmp_test/template.mjml',
	'tmp_test/payload.json',
	'tmp_test/output.html',
]

print('CMD:', cmd)
print('Before: exists output?', Path('tmp_test/output.html').exists())
res = subprocess.run(cmd, capture_output=True, text=True)
print('RC:', res.returncode)
print('STDOUT:\n', res.stdout)
print('STDERR:\n', res.stderr)
print('After: exists output?', Path('tmp_test/output.html').exists())
