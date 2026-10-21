import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, 
  X, 
  Download, 
  Code, 
  Edit, 
  Play, 
  Undo, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Module {
  id: string;
  name: string;
  type: string;
  editable: boolean;
  description: string;
}

interface TemplatePlaygroundProps {
  template: {
    id: number;
    name: string;
    html_content: string;
    modules?: Module[]; // optional - playground will analyze if missing
  };
  onClose: () => void;
  onSave: (htmlContent: string) => void;
}

const TemplatePlayground: React.FC<TemplatePlaygroundProps> = ({ 
  template, 
  onClose, 
  onSave 
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [moduleContent, setModuleContent] = useState<string>('');
  const [editMode, setEditMode] = useState<'visual' | 'code'>('visual');
  const [showElementsLibrary, setShowElementsLibrary] = useState(true);
  const [compiledTemplate, setCompiledTemplate] = useState<string>('');
  const [showCompiled, setShowCompiled] = useState(false);
  const [currentHtml, setCurrentHtml] = useState(template.html_content);
  const [computedModules, setComputedModules] = useState<Module[]>(template.modules || []);
  const [computedModuleMap, setComputedModuleMap] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([template.html_content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const contentEditableRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingContent = useRef(false);
  const applyEditTimer = useRef<number | null>(null);

  // Update contentEditable when switching to visual mode
  useEffect(() => {
    if (editMode === 'visual' && contentEditableRef.current && moduleContent) {
      // Update when switching to visual mode
      isUpdatingContent.current = true;
      contentEditableRef.current.innerHTML = moduleContent;
      isUpdatingContent.current = false;
    }
  }, [editMode]); // Only trigger on mode change

  // Analyze HTML and build simple modules (header, body parts split by <br>, footer)
  useEffect(() => {
    if (!template.modules || template.modules.length === 0) {
      const modules = analyzeModulesFromHtml(template.html_content);
      setComputedModules(modules);
    } else {
      setComputedModules(template.modules.slice());
    }
  }, [template.html_content]);

  const analyzeModulesFromHtml = (html: string): Module[] => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Simple heuristics: header (first meaningful block), footer (contains unsubscribe/contact/©), body split by <br>

      // Find footer candidate
      const footerCandidates = Array.from(doc.querySelectorAll('footer, div, p')).filter(el => {
        const t = (el.textContent || '').toLowerCase();
        return t.includes('unsubscribe') || t.includes('privacy') || t.includes('copyright') || t.includes('contact');
      });

      const footerEl = footerCandidates.length ? footerCandidates[footerCandidates.length - 1] : null;

      // Header: first element that contains an image or logo or short heading
      const headerCandidates = Array.from(doc.querySelectorAll('header, div, table')).filter(el => {
        const t = (el.textContent || '').toLowerCase();
        return el.querySelector('img') !== null || t.length < 200 && /welcome|hello|dear|hi\b/.test(t);
      });
      const headerEl = headerCandidates.length ? headerCandidates[0] : null;

      // Build body segments: split by <br> inside the main container
      const container = doc.body;
      let innerHtml = container.innerHTML || '';

      // Remove header and footer HTML from innerHtml to isolate body
      if (headerEl) innerHtml = innerHtml.replace(headerEl.outerHTML, '');
      if (footerEl) innerHtml = innerHtml.replace(footerEl.outerHTML, '');

      // Split by <br> (or <br/> variants) and by double newlines
      const parts = innerHtml.split(/<br\s*\/?>|\n\s*\n/gi).map(p => p.trim()).filter(p => p.length > 0);

      const modules: Module[] = [];
      let idCounter = 1;
      if (headerEl) {
        modules.push({ id: `header-${idCounter++}`, name: 'Header', type: 'header', editable: true, description: 'Top of email' });
      }

      if (parts.length === 0) {
        // No splits found — treat whole body as single content module
        modules.push({ id: `body-${idCounter++}`, name: 'Body', type: 'content', editable: true, description: 'Main content' });
      } else {
        for (let idx = 0; idx < parts.length; idx++) {
          modules.push({ id: `line-module-${idx + 1}`, name: `Body part ${idx + 1}`, type: 'content', editable: true, description: `Segment ${idx + 1} from HTML split by <br>` });
        }
      }

      if (footerEl) {
        modules.push({ id: `footer-${idCounter++}`, name: 'Footer', type: 'footer', editable: true, description: 'Bottom of email' });
      }

      // build snippet map for quick access
      const snippetMap: Record<string,string> = {};
      // try to map modules to parts of innerHtml
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        if (m.type === 'header' && headerEl) snippetMap[m.id] = headerEl.outerHTML;
        else if (m.type === 'footer' && footerEl) snippetMap[m.id] = footerEl.outerHTML;
        else {
          // get a portion from parts or fallback to empty
          const partIndex = i - (headerEl ? 1 : 0);
          snippetMap[m.id] = parts[partIndex] || '';
        }
      }
      setComputedModuleMap(snippetMap);

      return modules;
    } catch (e) {
      console.warn('Module analysis failed', e);
      return [];
    }
  };

  const addToHistory = (html: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(html);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentHtml(history[newIndex]);
    }
  };

  const handleModuleSelection = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    
    // Immediately extract and set the module content from computed map or regex
    const currentHtmlContent = currentHtml || template.html_content;
    let fullContent = computedModuleMap[moduleId] || '';
    if (!fullContent) {
      const moduleRegex = new RegExp(`<tr id="${moduleId}"[^>]*>(.*?)</tr>`, 's');
      const match = moduleRegex.exec(currentHtmlContent);
      if (match) fullContent = match[1] || match[0];
    }
    
    if (fullContent) {
      console.log(`\n=== MODULE SELECTION DEBUG ===`);
      console.log(`Selected module: ${moduleId}`);
      console.log(`Extracted content length: ${fullContent.length}`);
      console.log(`Content preview: ${fullContent.substring(0, 200)}...`);
      console.log(`Starts with <td>: ${fullContent.trim().startsWith('<td')}`);
      console.log(`Ends with </td>: ${fullContent.trim().endsWith('</td>')}`);
      
      // For visual editing, we need to extract just the inner content of the <td>
      let contentForEditor = fullContent;
      if (editMode === 'visual') {
        const tdMatch = fullContent.match(/<td[^>]*>(.*?)<\/td>/s);
        if (tdMatch) {
          contentForEditor = tdMatch[1]; // Content inside <td>
          console.log(`Inner content for visual editor: ${contentForEditor.substring(0, 100)}...`);
        }
      }
      
  setModuleContent(fullContent); // Store full content including <td> if present
      console.log(`=== END MODULE SELECTION ===\n`);
      
      // Update visual editor immediately if it's active
      if (editMode === 'visual' && contentEditableRef.current) {
        isUpdatingContent.current = true;
        // preserve inline styles in visual editor
        contentEditableRef.current.innerHTML = contentForEditor;
        isUpdatingContent.current = false;
      }
    }
  };

  // Validate HTML structure to ensure nested table integrity
  const validateAndFixHtmlStructure = (html: string): string => {
    // Check if we have the expected nested table structure
    const tableCount = (html.match(/<table/g) || []).length;
    const trCount = (html.match(/<tr/g) || []).length;
    
    console.log(`Structure validation: ${tableCount} tables, ${trCount} tr elements`);
    
    // The template should have 2 tables and 4 tr elements (1 wrapper + 3 modules)
    if (tableCount !== 2 || trCount !== 4) {
      console.warn(`⚠️ Table structure may be corrupted. Expected: 2 tables, 4 tr. Found: ${tableCount} tables, ${trCount} tr`);
    }
    
    // Ensure all module tr elements are properly closed and in the inner table
    const moduleIds = ['header-module', 'welcome-module', 'footer-module'];
    let fixedHtml = html;
    
    // Find the inner table (should contain the modules)
    const innerTableMatch = fixedHtml.match(/<table[^>]*width="600"[^>]*>(.*?)<\/table>/s);
    if (innerTableMatch) {
      const innerTableContent = innerTableMatch[1];
      const moduleMatches = moduleIds.map(id => {
        const match = innerTableContent.match(new RegExp(`<tr id="${id}"[^>]*>.*?</tr>`, 's'));
        return { id, match, found: !!match };
      });
      
      console.log('Module validation in inner table:');
      moduleMatches.forEach(m => {
        console.log(`  ${m.id}: ${m.found ? '✅' : '❌'}`);
      });
    }
    
    return fixedHtml;
  };

  // Replace module content in-place using DOM parsing to preserve structure and attributes
  const replaceModuleContent = (html: string, moduleId: string, newInnerHtml: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Find tr by id, or fallback to any element with that id
      let target = doc.getElementById(moduleId) as HTMLElement | null;
      if (!target) {
        target = doc.querySelector(`tr[id="${moduleId}"]`) as HTMLElement | null;
      }

      if (!target) {
        console.error(`Module ${moduleId} not found`);
        return html;
      }

      // If module contains a TD, update its innerHTML. Otherwise update the element's innerHTML
      const td = target.querySelector('td');
      if (td) td.innerHTML = newInnerHtml;
      else target.innerHTML = newInnerHtml;

      // serialize back
      return doc.body.innerHTML;
    } catch (e) {
      console.error('DOM replace failed', e);
      return html;
    }
  };

  // ---------- Marker-based extraction and patching (HTML flow similar to MJML approach) ----------
  // Wrap the target module outerHTML with START/END markers so we can send a focused full-html to AI
  const wrapModuleWithMarkers = (html: string, moduleId: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Try to find by id, then by data attribute, then fallback to snippet map
      let target = doc.getElementById(moduleId) as Element | null;
      if (!target) target = doc.querySelector(`[data-module-id="${moduleId}"]`) as Element | null;

      if (!target && computedModuleMap[moduleId]) {
        const snippet = computedModuleMap[moduleId];
        const found = Array.from(doc.querySelectorAll('*')).find(el => (el.outerHTML || '').startsWith(snippet.slice(0, 120)));
        if (found) target = found;
      }

      if (!target) return html; // nothing to wrap

      const outer = target.outerHTML;
      const wrapped = `<!-- START_SELECTED_${moduleId} -->\n${outer}\n<!-- END_SELECTED_${moduleId} -->`;
      const base = doc.body.innerHTML;
      const updated = base.replace(outer, wrapped);
      return updated;
    } catch (err) {
      console.warn('wrapModuleWithMarkers failed', err);
      return html;
    }
  };

  // Extract the selected module snippet (outerHTML) — prefer snippet map then DOM
  const extractSelectedModuleHtml = (moduleId: string): string | null => {
    if (computedModuleMap[moduleId]) return computedModuleMap[moduleId];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml || template.html_content, 'text/html');
      let el = doc.getElementById(moduleId) as Element | null;
      if (!el) el = doc.querySelector(`[data-module-id="${moduleId}"]`) as Element | null;
      if (!el) return null;
      return el.outerHTML;
    } catch (err) {
      return null;
    }
  };

  // When backend/AI returns a modified snippet for the selected module, patch it back into currentHtml
  const patchSelectedModuleHtml = (moduleId: string, modifiedSnippet: string) => {
    // If markers exist, replace between them
    const base = currentHtml || template.html_content;
    const startMarker = `<!-- START_SELECTED_${moduleId} -->`;
    const endMarker = `<!-- END_SELECTED_${moduleId} -->`;

    if (base.includes(startMarker) && base.includes(endMarker)) {
      const regex = new RegExp(`${startMarker}[\s\S]*?${endMarker}`, 'g');
      const replacement = `${startMarker}\n${modifiedSnippet}\n${endMarker}`;
      const updated = base.replace(regex, replacement);
      setCurrentHtml(updated);
      setComputedModuleMap((prev) => ({ ...prev, [moduleId]: modifiedSnippet }));
      setModuleContent(modifiedSnippet);
      addToHistory(updated);
      return updated;
    }

    // Otherwise, try to replace by locating the original snippet or element
    const snippet = computedModuleMap[moduleId];
    if (snippet && snippet.length > 0) {
      const updated = base.replace(snippet, modifiedSnippet);
      setCurrentHtml(updated);
      setComputedModuleMap((prev) => ({ ...prev, [moduleId]: modifiedSnippet }));
      setModuleContent(modifiedSnippet);
      addToHistory(updated);
      return updated;
    }

    // Fallback to DOM replace by id
    const updated = replaceModuleContent(base, moduleId, modifiedSnippet);
    setCurrentHtml(updated);
    setComputedModuleMap((prev) => ({ ...prev, [moduleId]: modifiedSnippet }));
    setModuleContent(modifiedSnippet);
    addToHistory(updated);
    return updated;
  };

  // Parse a simple set of properties from a module HTML snippet (src, href, style, text)
  const parsePropertiesFromHtml = (snippet: string) => {
    const props: Record<string, any> = {};
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(snippet, 'text/html');
      const el = doc.body.firstElementChild;
      if (!el) return props;

      // collect common attributes
      Array.from(el.attributes).forEach(attr => {
        props[attr.name] = attr.value;
      });

      // inner text
      props.text = el.textContent || '';

      // if image inside
      const img = el.querySelector('img');
      if (img) {
        props.img = { src: img.getAttribute('src'), alt: img.getAttribute('alt') };
      }

      // if anchor inside
      const a = el.querySelector('a');
      if (a) props.href = a.getAttribute('href');
    } catch (err) {
      // ignore
    }
    return props;
  };

  // Apply module changes immediately (code mode) or via DOM when saving / debounce
  const handleModuleContentChange = (newContent: string) => {
    const sanitizedContent = sanitizeModuleContent(newContent);
    setModuleContent(sanitizedContent);

    // For code mode (textarea) apply immediately
    if (editMode === 'code' && selectedModuleId) {
      const updatedHtml = replaceModuleContent(currentHtml, selectedModuleId, sanitizedContent);
      const fixed = validateAndFixHtmlStructure(updatedHtml);
      setCurrentHtml(fixed);
      addToHistory(fixed);
    }
  };

  // Sanitize HTML content to prevent structure issues
  const sanitizeModuleContent = (content: string): string => {
    // Remove any stray <tr>, </tr>, <table>, </table>, <tbody>, </tbody> tags that might have been added
    let sanitized = content
      .replace(/<\/?tr[^>]*>/gi, '')
      .replace(/<\/?table[^>]*>/gi, '')
      .replace(/<\/?tbody[^>]*>/gi, '')
      .replace(/<\/?thead[^>]*>/gi, '');
    
    // Clean up excessive whitespace but preserve intentional spacing
    sanitized = sanitized.replace(/\n\s*\n/g, '\n').trim();
    
    // CRITICAL FIX: Ensure content is properly wrapped in <td> tags
    // Check if the content starts with <td> - if not, wrap it
    if (!sanitized.trim().startsWith('<td')) {
      console.log('⚠️ Content not wrapped in <td>, fixing...');
      // Extract style from original td if it exists, or use default
      const defaultTdStyle = 'style="padding: 20px 30px;"';
      sanitized = `<td ${defaultTdStyle}>\n${sanitized}\n</td>`;
    }
    
    // Ensure the content ends with </td>
    if (!sanitized.trim().endsWith('</td>')) {
      console.log('⚠️ Content not properly closed with </td>, fixing...');
      sanitized = sanitized + '\n</td>';
    }
    
    console.log('Content sanitization check:');
    console.log('  Starts with <td>:', sanitized.trim().startsWith('<td'));
    console.log('  Ends with </td>:', sanitized.trim().endsWith('</td>'));
    
    return sanitized;
  };

  // Handle content changes without cursor jumping
  const handleVisualContentChange = () => {
    if (contentEditableRef.current && !isUpdatingContent.current && selectedModuleId) {
      const innerContent = contentEditableRef.current.innerHTML; // keep tags & inline styles
      setModuleContent(innerContent);

      // Debounce applying edits to avoid character-level updates
      if (applyEditTimer.current) window.clearTimeout(applyEditTimer.current);
      applyEditTimer.current = window.setTimeout(() => {
        const updatedHtml = replaceModuleContent(currentHtml, selectedModuleId, innerContent);
        const fixed = validateAndFixHtmlStructure(updatedHtml);
        setCurrentHtml(fixed);
        addToHistory(fixed);
        applyEditTimer.current = null;
      }, 600);
    }
  };

  const handleCodeContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setModuleContent(newContent);
    handleModuleContentChange(newContent);
  };

  const insertElementAtCursor = (elementHtml: string) => {
    if (editMode === 'visual' && contentEditableRef.current) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        contentEditableRef.current.insertAdjacentHTML('beforeend', elementHtml);
      } else {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = elementHtml;
        
        while (tempDiv.firstChild) {
          range.insertNode(tempDiv.firstChild);
        }
        
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      handleVisualContentChange();
    } else if (editMode === 'code' && textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = moduleContent.substring(0, start) + elementHtml + moduleContent.substring(end);
      
      setModuleContent(newContent);
      handleModuleContentChange(newContent);
      
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + elementHtml.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const compileTemplate = () => {
    console.log('\n=== COMPILING TEMPLATE ===');
    // annotate selected module markers if any
    if (selectedModuleId) {
      const wrapped = wrapModuleWithMarkers(currentHtml, selectedModuleId);
      setCurrentHtml(wrapped);
    }
    console.log('Current HTML length:', currentHtml.length);
    
    // Check module order in currentHtml before compilation
    const allTrMatches = [...currentHtml.matchAll(/<tr[^>]*id="([^"]*)"[^>]*>/g)];
    console.log('Module order in currentHtml:');
    allTrMatches.forEach((match, index) => {
      console.log(`  ${index + 1}. ${match[1]} at position ${match.index}`);
    });
    
    // Check if table structure is intact
    const hasTable = currentHtml.includes('<table');
    const hasTBody = currentHtml.includes('<tbody');
    const tableCount = (currentHtml.match(/<table/g) || []).length;
    const tbodyCount = (currentHtml.match(/<tbody/g) || []).length;
    const trCount = (currentHtml.match(/<tr/g) || []).length;
    
    console.log('Table structure check:');
    console.log(`  <table> tags: ${tableCount}`);
    console.log(`  <tbody> tags: ${tbodyCount}`);
    console.log(`  <tr> tags: ${trCount}`);
    console.log(`  Has proper table structure: ${hasTable && hasTBody}`);
    
    // Show a portion of the HTML around each module
    allTrMatches.forEach((match) => {
      const moduleId = match[1];
      const start = Math.max(0, match.index! - 100);
      const end = Math.min(currentHtml.length, match.index! + 200);
      const snippet = currentHtml.substring(start, end);
      console.log(`\nContext around ${moduleId}:`);
      console.log(snippet);
    });
    
    setCompiledTemplate(currentHtml);
    setShowCompiled(true);
    
    console.log('=== COMPILATION COMPLETE ===\n');
  };

  const downloadTemplate = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 15px; vertical-align: top; }
        img { max-width: 100%; height: auto; }
        .header { background-color: #3b82f6; color: white; }
        .footer { background-color: #f8f9fa; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="email-container">
        ${currentHtml}
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_modified.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const elements = {
    text: [
      { name: 'Heading', html: '<h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px; font-weight: bold;">Your Heading Here</h2>' },
      { name: 'Paragraph', html: '<p style="color: #6b7280; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Your paragraph text goes here.</p>' },
      { name: 'Bold Text', html: '<strong style="color: #1f2937; font-weight: bold;">Bold text here</strong>' },
      { name: 'Link', html: '<a href="#" style="color: #3b82f6; text-decoration: underline;">Click here</a>' },
    ],
    content: [
      { name: 'Button', html: '<div style="text-align: center; margin: 25px 0;"><a href="#" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; display: inline-block;">Click Here</a></div>' },
      { name: 'Image', html: '<div style="text-align: center; margin: 20px 0;"><img src="https://via.placeholder.com/400x200" alt="Description" style="max-width: 100%; height: auto; border-radius: 8px;"></div>' },
      { name: 'Divider', html: '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">' },
    ],
    layout: [
      { name: 'Two Columns', html: '<div style="display: flex; gap: 20px;"><div style="flex: 1;"><p>Left column content</p></div><div style="flex: 1;"><p>Right column content</p></div></div>' },
      { name: 'Spacing', html: '<div style="height: 20px;"></div>' },
    ]
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex">
      
      {/* Left Sidebar - Module List */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Template Playground</h3>
              <p className="text-sm text-gray-500 mt-1">{template.name}</p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Modules</h4>
            <div className="space-y-2">
              {(computedModules || []).map((module) => (
                <div key={module.id} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => handleModuleSelection(module.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedModuleId === module.id 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{module.name}</span>
                      {module.editable && (
                        <Edit size={14} className="text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{module.description}</p>
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <button
                onClick={compileTemplate}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                <Play size={16} />
                <span>Compile & Preview</span>
              </button>
              
              <button
                onClick={handleUndo}
                disabled={historyIndex === 0}
                className="w-full btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Undo size={16} />
                <span>Undo</span>
              </button>

              <button
                onClick={downloadTemplate}
                className="w-full btn-secondary flex items-center justify-center space-x-2"
              >
                <Download size={16} />
                <span>Download HTML</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Editor Section */}
          <div className="flex-1 flex flex-col">
            {/* Editor Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h4 className="font-medium text-gray-900">
              {selectedModuleId ? `Editing: ${computedModules.find(m => m.id === selectedModuleId)?.name}` : 'Select a module to edit'}
                </h4>
                
                {selectedModuleId && (
                  <div className="flex items-center space-x-3">
                    {/* Toggle Switch for Edit Mode */}
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${editMode === 'visual' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <Edit size={14} className="inline mr-1" />
                        Visual
                      </span>
                      <button
                        onClick={() => setEditMode(editMode === 'visual' ? 'code' : 'visual')}
                        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          editMode === 'visual' ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                            editMode === 'visual' ? 'translate-x-1' : 'translate-x-7'
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${editMode === 'code' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <Code size={14} className="inline mr-1" />
                        Code
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onSave(currentHtml)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <Save size={16} />
                  <span className="ml-2">Save Template</span>
                </button>

                <button
                    onClick={() => {
                    if (!selectedModuleId) return alert('Select a module first');
                    const snippet = extractSelectedModuleHtml(selectedModuleId);
                    if (!snippet) return alert('Could not extract module HTML');
                    // show parsed props to the user before editing (helpful overview)
                    const props = parsePropertiesFromHtml(snippet);
                    console.log('Parsed module props:', props);
                    // Simple mock-AI flow: let user edit the snippet in a prompt and patch it back
                    const edited = window.prompt('Edit the selected module HTML (mock AI) — parsed props: ' + JSON.stringify(props), snippet);
                    if (edited !== null) {
                      patchSelectedModuleHtml(selectedModuleId, edited);
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <span className="ml-1">AI Edit</span>
                </button>
                
                <button 
                  onClick={onClose} 
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-hidden">
            {showCompiled ? (
              <div className="h-full p-6 overflow-auto bg-gray-50">
                <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Compiled Template Preview</h4>
                    <button
                      onClick={() => setShowCompiled(false)}
                      className="btn-secondary"
                    >
                      Back to Editor
                    </button>
                  </div>
                  <div 
                    className="p-6"
                    dangerouslySetInnerHTML={{ __html: compiledTemplate }}
                  />
                </div>
              </div>
            ) : selectedModuleId ? (
              <div className="h-full p-6 overflow-auto">
                <div className="max-w-4xl mx-auto">
                  {editMode === 'visual' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Visual Editor - Click anywhere to edit
                      </label>
                      <div 
                        ref={contentEditableRef}
                        contentEditable
                        onInput={handleVisualContentChange}
                        className="min-h-96 p-6 border-2 border-dashed border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        style={{
                          lineHeight: '1.6',
                          fontSize: '16px',
                          fontFamily: 'Arial, sans-serif'
                        }}
                        suppressContentEditableWarning={true}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HTML Code Editor
                      </label>
                      <textarea
                        ref={textareaRef}
                        value={moduleContent}
                        onChange={handleCodeContentChange}
                        className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="HTML content..."
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Edit size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Select a module from the left to start editing</p>
                  <p className="text-gray-400 text-sm">Choose any editable module to begin customization</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Elements Library */}
        <div className={`transition-all duration-300 ease-in-out ${showElementsLibrary ? 'w-80' : 'w-0'} bg-gray-50 border-l border-gray-200 overflow-hidden`}>
          <div className="w-80 overflow-y-auto h-full">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Elements Library</h3>
              <p className="text-sm text-gray-500 mt-1">Click to insert at cursor</p>
            </div>

            <div className="p-4 space-y-6">
              {Object.entries(elements).map(([category, items]) => (
                <div key={category}>
                  <h4 className="font-medium text-gray-900 mb-3 capitalize">{category} Elements</h4>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => insertElementAtCursor(item.html)}
                        disabled={!selectedModuleId}
                        className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="font-medium text-sm text-gray-900">{item.name}</div>
                        <div 
                          className="text-xs text-gray-500 mt-1 truncate"
                          dangerouslySetInnerHTML={{ __html: item.html }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quick Actions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => insertElementAtCursor('<br>')}
                    disabled={!selectedModuleId}
                    className="w-full text-left p-2 text-sm bg-white rounded border hover:bg-gray-50 disabled:opacity-50"
                  >
                    Line Break
                  </button>
                  <button
                    onClick={() => insertElementAtCursor('&nbsp;&nbsp;&nbsp;&nbsp;')}
                    disabled={!selectedModuleId}
                    className="w-full text-left p-2 text-sm bg-white rounded border hover:bg-gray-50 disabled:opacity-50"
                  >
                    Add Space
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Toggle Button */}
        <button
          onClick={() => setShowElementsLibrary(!showElementsLibrary)}
          className={`fixed right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-l-0 border-gray-300 rounded-l-lg shadow-lg p-2 transition-all duration-300 hover:bg-gray-50 ${
            showElementsLibrary ? 'translate-x-0' : 'translate-x-0'
          }`}
          style={{ right: showElementsLibrary ? '320px' : '0px' }}
        >
          {showElementsLibrary ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </div>
  );
};

export default TemplatePlayground;