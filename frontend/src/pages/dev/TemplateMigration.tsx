import { useState } from 'react';

const TemplateMigration = () => {
  const [htmlFileContent, setHtmlFileContent] = useState<string>('');
  // sanitized preview-safe HTML derived from uploaded file (used for immediate preview)
  const [htmlPreviewSafe, setHtmlPreviewSafe] = useState<string>('');
  const [schemaText, setSchemaText] = useState<string>('');
  // compiled HTML produced from the ORIGINAL uploaded HTML + payload
  const [originalCompiledHtml, setOriginalCompiledHtml] = useState<string>('');
  const [migrateMode, setMigrateMode] = useState(false);
  // the migrated MJML (original migrated source) — do NOT overwrite this when compiling
  const [migratedMjml, setMigratedMjml] = useState<string>('');
  // compiled HTML produced from the migrated MJML + payload
  const [migratedCompiledHtml, setMigratedCompiledHtml] = useState<string>('');
  const [schemaCollapsed, setSchemaCollapsed] = useState<boolean>(false);
  // preview toggles for each side
  const [originalViewMode, setOriginalViewMode] = useState<'code' | 'preview'>('preview');
  const [migratedViewMode, setMigratedViewMode] = useState<'code' | 'preview'>('preview');
  // Visual validation state
  const [visualValidationResults, setVisualValidationResults] = useState<any>(null);
  const [isValidatingVisual, setIsValidatingVisual] = useState(false);

  const readFileAsText = (file: File, cb: (txt: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result || ''));
    reader.readAsText(file);
  };

  const handleHtmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    readFileAsText(f, (txt) => {
      // Sanitize BEFORE setting to state to prevent any malformed URIs from being stored
      try {
        const sanitized = sanitizeHtmlForPreview(txt);
        setHtmlFileContent(sanitized);
        setHtmlPreviewSafe(sanitized);
        // Clear any previous render outputs when new file is uploaded
        setOriginalCompiledHtml('');
        setMigrateMode(false);
        setMigratedMjml('');
        setMigratedCompiledHtml('');
        
        // Log if sanitization occurred
        if (sanitized !== txt) {
          console.log('Template uploaded and sanitized - removed local file paths and malformed URIs');
        } else {
          console.log('Template uploaded successfully');
        }
      } catch (error) {
        console.error('Error processing template:', error);
        alert('Error processing template file. Please check the console for details.');
      }
    });
  };

  const sanitizeHtmlForPreview = (html: string) => {
    if (!html) return html;

    // Use regex-based replacement to handle all malformed URIs before DOM parsing
    // This prevents Vite from encountering malformed URIs in the first place
    let sanitized = html;

    // Replace file:// URLs (case-insensitive)
    sanitized = sanitized.replace(/(src|href|xlink:href|data-src|data-href)\s*=\s*(['"])file:\/\/[^"']*\2/gi, '$1=$2#$2');
    
    // Replace Windows absolute paths (C:\, D:\, etc.) - handle both single and escaped backslashes
    sanitized = sanitized.replace(/(src|href|xlink:href|data-src|data-href)\s*=\s*(['"])[A-Za-z]:[\\\/][^"']*\2/gi, '$1=$2#$2');
    
    // Replace UNC paths (\\server\share or \\\\server\\share)
    sanitized = sanitized.replace(/(src|href|xlink:href|data-src|data-href)\s*=\s*(['"])\\\\[^"']*\2/gi, '$1=$2#$2');
    
    // Replace any path containing backslashes (escaped or not)
    sanitized = sanitized.replace(/(src|href|xlink:href|data-src|data-href)\s*=\s*(['"])[^"']*\\+[^"']*\2/gi, '$1=$2#$2');
    
    // Replace URLs with percent-encoded backslashes (%5C)
    sanitized = sanitized.replace(/(src|href|xlink:href|data-src|data-href)\s*=\s*(['"])[^"']*%5[Cc][^"']*\2/gi, '$1=$2#$2');
    
    // Replace any URL that might cause decodeURI to fail
    // Test each potential URL and replace if it would throw
    sanitized = sanitized.replace(/(src|href|xlink:href|data-src|data-href)\s*=\s*(['"])([^"']+)\2/gi, (match, attr, quote, url) => {
      try {
        // Try to decode the URL - if it fails, it's malformed
        decodeURI(url);
        // Also check if it contains problematic characters
        if (url.includes('\\') || url.toLowerCase().startsWith('file:') || /^[a-z]:/i.test(url)) {
          return `${attr}=${quote}#${quote}`;
        }
        return match;
      } catch (e) {
        // If decodeURI throws, replace with safe value
        return `${attr}=${quote}#${quote}`;
      }
    });
    
    // Now use DOMParser for additional sanitization and validation
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'text/html');

      // Double-check and sanitize any remaining problematic attributes
      const attrs = ['src', 'href', 'xlink:href', 'data-src', 'data-href'];
      attrs.forEach((attr) => {
        const nodes = doc.querySelectorAll('[' + attr + ']');
        nodes.forEach((n) => {
          try {
            const val = n.getAttribute(attr) || '';
            if (!val || val === '#') return;
            
            const low = val.toLowerCase();

            // Check for any remaining file:// or local paths
            if (low.startsWith('file:') || /^[a-z]:[\\\/]/i.test(val) || val.startsWith('\\\\') || val.includes('\\')) {
              n.setAttribute(attr, '#');
            } else {
              // Try decoding; if it throws, the URI is malformed
              try {
                decodeURI(val);
              } catch (e) {
                n.setAttribute(attr, '#');
              }
            }
          } catch (e) {
            // If anything fails, replace with safe value
            try { n.setAttribute(attr, '#'); } catch (_) {}
          }
        });
      });

      return doc.documentElement?.outerHTML || sanitized;
    } catch (e) {
      // If DOM parsing fails, return the regex-sanitized version
      return sanitized;
    }
  };

  // rendering is now performed by the Render with Payload button which calls the backend

  const handleMigrate = async () => {
    if (!htmlFileContent) {
      alert('Please upload an HTML file to migrate.');
      return;
    }
    setMigrateMode(true);
    try {
      const form = new FormData();
      const blob = new Blob([htmlFileContent], { type: 'text/html' });
      form.append('file', blob, 'uploaded.html');
      form.append('schema', schemaText || '');

      const resp = await fetch('/api/dev/migrate', { method: 'POST', body: form });
      if (!resp.ok) {
        const txt = await resp.text();
        alert('Migration failed: ' + resp.status + '\n' + txt);
        return;
      }
      const mjml = await resp.text();
      // store original migrated MJML separately
  setMigratedMjml(mjml);
  // clear any previous compiled MJML HTML (user must click Render with Payload for MJML)
  setMigratedCompiledHtml('');
  setMigratedViewMode('code');
    } catch (e) {
      alert('Migration error: ' + e);
    }
  };

  const handleRenderMjmlWithPayload = async () => {
    if (!migratedMjml || migratedMjml.trim().length === 0) {
      alert('No MJML available to render. Please run Migrate first.');
      return;
    }
    try {
      // send mjmlPreview as a file to the render_mjml endpoint
      const form = new FormData();
      const blob = new Blob([migratedMjml], { type: 'text/plain' });
      form.append('file', blob, 'template.mjml');
      // use schemaText as payload JSON
      form.append('payload', schemaText || '{}');

      const resp = await fetch('/api/dev/render_mjml', { method: 'POST', body: form });
      if (!resp.ok) {
        const txt = await resp.text();
        alert('MJML render failed: ' + resp.status + '\n' + txt);
        return;
      }
  const html = await resp.text();
  // keep the migrated MJML source intact and store compiled HTML separately
  // sanitize before injecting to avoid file:// or Windows path URIs that break Vite
  setMigratedCompiledHtml(sanitizeHtmlForPreview(html));
  setMigratedViewMode('preview');
    } catch (e) {
      alert('MJML render error: ' + e);
    }
  };

  const handleRenderOriginalHtmlWithPayload = async () => {
    if (!schemaText || schemaText.trim().length === 0) {
      alert('Please provide the schema before rendering.');
      return;
    }
    if (!htmlFileContent) {
      alert('Please upload an HTML file first.');
      return;
    }

    try {
      const form = new FormData();
      const blob = new Blob([htmlFileContent], { type: 'text/html' });
      form.append('file', blob, 'uploaded.html');
      form.append('payload', schemaText || '{}');

      const resp = await fetch('/api/dev/render', {
        method: 'POST',
        body: form,
      });
      if (!resp.ok) {
        const txt = await resp.text();
        alert('Render failed: ' + resp.status + '\n' + txt);
        return;
      }
      const body = await resp.text();
  setOriginalCompiledHtml(sanitizeHtmlForPreview(body));
  setOriginalViewMode('preview');
    } catch (e) {
      alert('Render error: ' + e);
    }
  };

  const handleValidateVisualRendering = async () => {
    if (!originalCompiledHtml) {
      alert('Please render the original HTML first.');
      return;
    }
    if (!migratedCompiledHtml) {
      alert('Please render the migrated MJML first.');
      return;
    }

    setIsValidatingVisual(true);
    try {
      const form = new FormData();
      form.append('original_html', originalCompiledHtml);
      form.append('migrated_html', migratedCompiledHtml);

      const resp = await fetch('/api/dev/validate-visual', {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        alert('Visual validation failed: ' + resp.status + '\n' + txt);
        return;
      }

      const results = await resp.json();
      setVisualValidationResults(results);
    } catch (e) {
      alert('Visual validation error: ' + e);
    } finally {
      setIsValidatingVisual(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Template Migration</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
            <h2 className="font-semibold mb-3">Upload HTML & Ampscript</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">HTML file</label>
                <input type="file" accept=".html,.htm" onChange={handleHtmlUpload} className="mt-1" />
              </div>

              <div className="flex space-x-3">
                <button onClick={handleRenderOriginalHtmlWithPayload} className="px-4 py-2 bg-blue-600 text-white rounded-md">Render with Payload</button>
                <button onClick={handleMigrate} className="px-4 py-2 bg-green-600 text-white rounded-md">Migrate</button>
              </div>
            </div>
          </div>

          {/* When not migrated yet, show quick HTML preview area */}
          {!migrateMode && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="font-semibold mb-3">HTML Preview</h2>
              <div className="border rounded-md overflow-auto h-96 p-4 bg-gray-50">
                <div dangerouslySetInnerHTML={{ __html: originalCompiledHtml || htmlPreviewSafe || '' }} />
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-2 border border-gray-200">
            <div className="flex items-center justify-between px-4 py-2">
              <h2 className="font-semibold">Schema Editor</h2>
              <button onClick={() => setSchemaCollapsed(!schemaCollapsed)} className="text-sm px-2 py-1 bg-gray-100 rounded">
                {schemaCollapsed ? 'Show' : 'Collapse'}
              </button>
            </div>
            {!schemaCollapsed && (
              <div className="p-4">
                <textarea value={schemaText} onChange={(e) => setSchemaText(e.target.value)} className="w-full h-96 border rounded-md p-2 font-mono text-sm" />
              </div>
            )}
          </div>
        </div>
      </div>

      {migrateMode && (
        <div className="mt-6 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Migration Result</h2>
          <div className="flex space-x-4">
            {/* Original HTML side */}
            <div className="flex-1 border rounded-md p-3 h-96 overflow-auto flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Original HTML + AMPScript</h3>
                <div className="flex items-center space-x-2">
                  <button onClick={handleRenderOriginalHtmlWithPayload} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">Render with Payload</button>
                  <div className="ml-2 inline-flex items-center bg-gray-100 rounded-md p-1">
                    <label className={`px-3 py-1 rounded-md cursor-pointer ${originalViewMode === 'code' ? 'bg-white shadow' : 'text-gray-600'}`}>
                      <input type="radio" name="originalView" value="code" checked={originalViewMode === 'code'} onChange={() => setOriginalViewMode('code')} className="hidden" />
                      Code
                    </label>
                    <label className={`px-3 py-1 rounded-md cursor-pointer ${originalViewMode === 'preview' ? 'bg-white shadow' : 'text-gray-600'}`}>
                      <input type="radio" name="originalView" value="preview" checked={originalViewMode === 'preview'} onChange={() => setOriginalViewMode('preview')} className="hidden" />
                      Preview
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {originalViewMode === 'code' ? (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Source (will be used for rendering)</h4>
                    <pre className="whitespace-pre-wrap text-sm">{htmlFileContent}</pre>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Compiled HTML (with payload)</h4>
                    <div className="border rounded-md overflow-auto h-72 p-2 bg-gray-50" dangerouslySetInnerHTML={{ __html: originalCompiledHtml || '<div class="text-sm text-gray-500">No compiled output yet. Click Render with Payload.</div>' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Migrated MJML side */}
            <div className="flex-1 border rounded-md p-3 h-96 overflow-auto flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">MJML + AMPScript</h3>
                <div className="flex items-center space-x-2">
                  <button onClick={handleRenderMjmlWithPayload} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">Render with Payload</button>
                  <div className="ml-2 inline-flex items-center bg-gray-100 rounded-md p-1">
                    <label className={`px-3 py-1 rounded-md cursor-pointer ${migratedViewMode === 'code' ? 'bg-white shadow' : 'text-gray-600'}`}>
                      <input type="radio" name="migratedView" value="code" checked={migratedViewMode === 'code'} onChange={() => setMigratedViewMode('code')} className="hidden" />
                      Code
                    </label>
                    <label className={`px-3 py-1 rounded-md cursor-pointer ${migratedViewMode === 'preview' ? 'bg-white shadow' : 'text-gray-600'}`}>
                      <input type="radio" name="migratedView" value="preview" checked={migratedViewMode === 'preview'} onChange={() => setMigratedViewMode('preview')} className="hidden" />
                      Preview
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {migratedViewMode === 'code' ? (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Migrated MJML Source</h4>
                    <pre className="whitespace-pre-wrap text-sm">{migratedMjml}</pre>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Compiled HTML (with payload)</h4>
                    <div className="border rounded-md overflow-auto h-72 p-2 bg-gray-50" dangerouslySetInnerHTML={{ __html: migratedCompiledHtml || '<div class="text-sm text-gray-500">No compiled output yet. Click Render with Payload.</div>' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visual Validation Button and Results */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={handleValidateVisualRendering}
              disabled={isValidatingVisual}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              {isValidatingVisual ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Validate Visual Rendering</span>
                </>
              )}
            </button>
          </div>

          {/* Visual Validation Results */}
          {visualValidationResults && (
            <div className="mt-6 bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Visual Comparison Results</h3>
                <div className={`px-4 py-2 rounded-lg text-white font-medium ${
                  visualValidationResults.pass ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  {visualValidationResults.pass ? '✓ PASS' : '⚠ Review'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* SSIM Score */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                  <div className="text-sm text-gray-600 mb-1">SSIM Score</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {(visualValidationResults.ssim_score * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    Structural Similarity
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${visualValidationResults.ssim_score * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Color Score */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-green-100">
                  <div className="text-sm text-gray-600 mb-1">Color Score</div>
                  <div className="text-3xl font-bold text-green-600">
                    {(visualValidationResults.color_score * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    Color Distribution
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${visualValidationResults.color_score * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Alignment Score */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-orange-50 to-orange-100">
                  <div className="text-sm text-gray-600 mb-1">Alignment Score</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {(visualValidationResults.alignment_score * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    Layout & Positioning
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{ width: `${visualValidationResults.alignment_score * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Overall Score */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                  <div className="text-sm text-gray-600 mb-1">Overall Score</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {(visualValidationResults.overall_score * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    Weighted Average
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${visualValidationResults.overall_score * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  <strong>Interpretation:</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• <strong>SSIM:</strong> How structurally similar the layouts are (0-1)</li>
                  <li>• <strong>Color:</strong> How similar the color distributions are (0-1)</li>
                  <li>• <strong>Alignment:</strong> How well edges and layouts align (0-1)</li>
                  <li>• <strong>Pass Threshold:</strong> Overall score must be ≥ 0.85</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TemplateMigration;
