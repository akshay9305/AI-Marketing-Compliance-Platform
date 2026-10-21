from pathlib import Path
p = Path('services/mjml_ampscript_renderer.py')
print('exists', p.exists())
text = p.read_text(encoding='utf-8')
print('len', len(text))
print(text[:1000])
