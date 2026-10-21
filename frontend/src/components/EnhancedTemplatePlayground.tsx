/**
 * Enhanced Template Playground that works with auto-detected modules
 * Supports multiple HTML structures (table-based, div-based, etc.)
 */

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
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface Module {
  id: string;
  name: string;
  type: string;
  editable: boolean;
  description: string;
  tag?: string;
  selector?: string;
}

interface EnhancedTemplatePlaygroundProps {
  template: {
    id: number;
    name: string;
    html_content: string;
    modules: Module[];
  };
  onClose: () => void;
  onSave: (htmlContent: string) => void;
}

const EnhancedTemplatePlayground: React.FC<EnhancedTemplatePlaygroundProps> = ({ 
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
  const [history, setHistory] = useState<string[]>([template.html_content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [moduleElements, setModuleElements] = useState<Map<string, Element>>(new Map());
  const [computedModules, setComputedModules] = useState<Module[]>(template.modules || []);
  const [computedModuleMap, setComputedModuleMap] = useState<Record<string,string>>({});

  const contentEditableRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingContent = useRef(false);
  const applyEditTimer = useRef<number | null>(null);

  // Initialize by parsing HTML and finding module elements
  useEffect(() => {
    parseAndMapModules();
  }, [template.html_content]);

  // Compute simple modules if none provided
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

      const footerCandidates = Array.from(doc.querySelectorAll('footer, div, p')).filter(el => {
        const t = (el.textContent || '').toLowerCase();
        return t.includes('unsubscribe') || t.includes('privacy') || t.includes('copyright') || t.includes('contact');
      });
      const footerEl = footerCandidates.length ? footerCandidates[footerCandidates.length - 1] : null;

      const headerCandidates = Array.from(doc.querySelectorAll('header, div, table')).filter(el => {
        const t = (el.textContent || '').toLowerCase();
        return el.querySelector('img') !== null || (t.length < 200 && /welcome|hello|dear|hi\b/.test(t));
      });
      const headerEl = headerCandidates.length ? headerCandidates[0] : null;

      let innerHtml = (doc.body && doc.body.innerHTML) || '';
      if (headerEl) innerHtml = innerHtml.replace(headerEl.outerHTML, '');
      if (footerEl) innerHtml = innerHtml.replace(footerEl.outerHTML, '');

      const parts = innerHtml.split(/<br\s*\/?>|\n\s*\n/gi).map(s => s.trim()).filter(s => s.length > 0);

      const modules: Module[] = [];
      let idCounter = 1;
      if (headerEl) modules.push({ id: `header-${idCounter++}`, name: 'Header', type: 'header', editable: true, description: 'Top of email' });
      if (parts.length === 0) modules.push({ id: `body-${idCounter++}`, name: 'Body', type: 'content', editable: true, description: 'Main content' });
      else for (let i = 0; i < parts.length; i++) modules.push({ id: `line-module-${i+1}`, name: `Body part ${i+1}`, type: 'content', editable: true, description: `Segment ${i+1} from HTML split by <br>` });
      if (footerEl) modules.push({ id: `footer-${idCounter++}`, name: 'Footer', type: 'footer', editable: true, description: 'Bottom of email' });

      // annotate elements in a cloned document and build snippet map
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const snippetMap: Record<string,string> = {};

        modules.forEach((m, idx) => {
          // prefer id-based matching
          let el: Element | null = doc.getElementById(m.id);
          if (!el) {
            // for header/footer prefer identified candidates
            if (m.type === 'header' && headerEl) el = Array.from(doc.querySelectorAll('*')).find(e => (e.innerHTML || '').trim() === headerEl.innerHTML.trim()) || null;
            if (m.type === 'footer' && footerEl) el = Array.from(doc.querySelectorAll('*')).find(e => (e.innerHTML || '').trim() === footerEl.innerHTML.trim()) || null;
          }

          if (el) {
            el.setAttribute('data-module-id', m.id);
            snippetMap[m.id] = el.outerHTML;
          } else {
            // fallback: try to find by matching the part text
            const partText = parts[idx - (headerEl ? 1 : 0)];
            if (partText) {
              const found = Array.from(doc.querySelectorAll('*')).find(e => (e.textContent || '').trim().startsWith(partText.substring(0, 20)));
              if (found) {
                found.setAttribute('data-module-id', m.id);
                snippetMap[m.id] = found.outerHTML;
              }
            }
          }
        });

        const annotated = doc.body.innerHTML;
        setCurrentHtml(annotated);
        setComputedModuleMap(snippetMap);
      } catch (err) {
        // ignore annotation errors
        console.warn('Annotation failed', err);
      }

      return modules;
    } catch (e) {
      console.warn('Module analysis failed', e);
      return [];
    }
  };

  const parseAndMapModules = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');
    const elementMap = new Map<string, Element>();

    template.modules.forEach((module, index) => {
      let element: Element | null = null;

      // Try multiple strategies to find the module element
      
      // Strategy 1: Find by ID
      element = doc.getElementById(module.id);

      // Strategy 2: Use selector if available
      if (!element && module.selector) {
        element = doc.querySelector(module.selector);
      }

      // Strategy 3: For line-based modules, find by position and content
      if (!element && module.id.includes('line-module')) {
        const body = doc.querySelector('body') || doc;
        const directChildren = Array.from(body.children).filter(child => 
          child.tagName && 
          child.textContent && 
          child.textContent.trim().length > 15
        );
        
        // Extract position from module ID (e.g., "line-module-1-abc123" -> position 0)
        const positionMatch = module.id.match(/line-module-(\d+)/);
        if (positionMatch) {
          const modulePosition = parseInt(positionMatch[1]) - 1; // Convert to 0-based index
          if (directChildren[modulePosition]) {
            element = directChildren[modulePosition];
          }
        }
      }

      // Strategy 4: Find by tag and content heuristics
      if (!element && module.tag) {
        const elements = Array.from(doc.getElementsByTagName(module.tag));
        
        // For semantic elements, try to match by tag and position
        if (['header', 'main', 'footer', 'section', 'article'].includes(module.tag)) {
          element = elements.find(el => 
            shouldElementBeModule(el, module)
          ) || null;
        } else {
          // For other elements, use content-based matching
          element = elements.find(el => 
            shouldElementBeModule(el, module)
          ) || null;
        }
      }

      // Strategy 5: For div-based modules, find by class patterns
      if (!element && module.id.includes('div-') && module.tag === 'div') {
        const divs = Array.from(doc.getElementsByTagName('div'));
        element = divs.find(div => shouldElementBeModule(div, module)) || null;
      }

      // Strategy 6: Fallback - try to find by module index for structural elements
      if (!element) {
        const allElements = Array.from(doc.querySelectorAll('*')).filter(el => 
          el.textContent && 
          el.textContent.trim().length > 10 &&
          !el.querySelector('*') // Prefer leaf elements
        );
        
        if (allElements[index]) {
          element = allElements[index];
        }
      }

      if (element) {
        elementMap.set(module.id, element);
        console.log(`Mapped module ${module.id} (${module.name}) to element:`, element.tagName, element.textContent?.substring(0, 50));
      } else {
        console.warn(`Could not find element for module: ${module.id} (${module.name})`);
      }
    });

    setModuleElements(elementMap);
    console.log(`Mapped ${elementMap.size} out of ${template.modules.length} modules`);
  };

  // ---------- Marker-based extraction and patching (HTML flow) ----------
  const wrapModuleWithMarkers = (html: string, moduleId: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      let target = doc.getElementById(moduleId) as Element | null;
      if (!target) target = doc.querySelector(`[data-module-id="${moduleId}"]`) as Element | null;

      if (!target && computedModuleMap[moduleId]) {
        const snippet = computedModuleMap[moduleId];
        const found = Array.from(doc.querySelectorAll('*')).find(el => (el.outerHTML || '').startsWith(snippet.slice(0, 120)));
        if (found) target = found;
      }

      if (!target) return html;

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

  const patchSelectedModuleHtml = (moduleId: string, modifiedSnippet: string) => {
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
      parseAndMapModules();
      return updated;
    }

    const snippet = computedModuleMap[moduleId];
    if (snippet && snippet.length > 0) {
      const updated = base.replace(snippet, modifiedSnippet);
      setCurrentHtml(updated);
      setComputedModuleMap((prev) => ({ ...prev, [moduleId]: modifiedSnippet }));
      setModuleContent(modifiedSnippet);
      addToHistory(updated);
      parseAndMapModules();
      return updated;
    }

    const updated = (() => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(base, 'text/html');
        const target = doc.getElementById(moduleId) as Element | null || doc.querySelector(`[data-module-id="${moduleId}"]`) as Element | null;
        if (target) {
          const tempDoc = parser.parseFromString(modifiedSnippet, 'text/html');
          const newEl = tempDoc.body.firstElementChild;
          if (newEl && target.parentNode) {
            const imported = doc.importNode(newEl, true);
            target.parentNode.replaceChild(imported, target);
          }
        }
        return doc.body.innerHTML;
      } catch (err) {
        console.error('patch fallback failed', err);
        return base;
      }
    })();

    setCurrentHtml(updated);
    setComputedModuleMap((prev) => ({ ...prev, [moduleId]: modifiedSnippet }));
    setModuleContent(modifiedSnippet);
    addToHistory(updated);
    parseAndMapModules();
    return updated;
  };

  const parsePropertiesFromHtml = (snippet: string) => {
    const props: Record<string, any> = {};
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(snippet, 'text/html');
      const el = doc.body.firstElementChild;
      if (!el) return props;
      Array.from(el.attributes).forEach(attr => { props[attr.name] = attr.value; });
      props.text = el.textContent || '';
      const img = el.querySelector('img'); if (img) props.img = { src: img.getAttribute('src'), alt: img.getAttribute('alt') };
      const a = el.querySelector('a'); if (a) props.href = a.getAttribute('href');
    } catch (err) {
      // ignore
    }
    return props;
  };

  const shouldElementBeModule = (element: Element, module: Module): boolean => {
    const text = element.textContent?.toLowerCase() || '';
    const innerHTML = element.innerHTML.toLowerCase();
    const tagName = element.tagName.toLowerCase();
    
    // Check if element has meaningful content
    if (text.trim().length < 10) {
      return false;
    }

    // Module type specific matching
    switch (module.type) {
      case 'header':
        return (
          tagName === 'header' ||
          text.includes('logo') || 
          text.includes('brand') || 
          text.includes('company') ||
          innerHTML.includes('<img') ||
          element.querySelector('img') !== null ||
          element.id?.toLowerCase().includes('header') ||
          element.className?.toLowerCase().includes('header')
        );
        
      case 'hero':
        return (
          innerHTML.includes('<img') || 
          text.includes('welcome') || 
          text.includes('introducing') ||
          text.includes('discover') ||
          text.includes('main') ||
          element.querySelector('img') !== null ||
          (text.length > 100 && innerHTML.includes('<a')) // Large content with links
        );
        
      case 'footer':
        return (
          tagName === 'footer' ||
          text.includes('unsubscribe') || 
          text.includes('privacy') || 
          text.includes('contact') ||
          text.includes('copyright') ||
          text.includes('©') ||
          element.id?.toLowerCase().includes('footer') ||
          element.className?.toLowerCase().includes('footer')
        );
        
      case 'content':
        return (
          text.length > 20 && // Substantial content
          (tagName === 'section' || 
           tagName === 'article' || 
           tagName === 'div' || 
           tagName === 'td' ||
           tagName === 'tr')
        );
        
      default:
        // For any other type, check if it has substantial content
        return text.length > 15;
    }
  };

  const handleModuleSelection = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    
    const element = moduleElements.get(moduleId);
    if (element) {
      const fullContent = element.outerHTML;
      console.log(`Selected module: ${moduleId}`);
      console.log(`Element tag: ${element.tagName}`);
      console.log(`Content length: ${fullContent.length}`);
      console.log(`Text content: ${element.textContent?.substring(0, 100)}...`);
      
      // Set the module content to the full HTML
      setModuleContent(fullContent);
      
      // For visual editing, show the inner content
      if (editMode === 'visual' && contentEditableRef.current) {
        isUpdatingContent.current = true;
        
        // Use innerHTML for editing, but fallback to textContent if innerHTML is too complex
        let contentForEditor = element.innerHTML;
        
        // If the innerHTML is very nested or complex, show a simplified version
        const childElementCount = element.querySelectorAll('*').length;
        if (childElementCount > 5) {
          // For complex elements, show structured content
          contentForEditor = formatComplexElementForEditing(element);
        }
        
        contentEditableRef.current.innerHTML = contentForEditor;
        isUpdatingContent.current = false;
      }
      
      // For code editing, show the full outer HTML
      if (editMode === 'code' && textareaRef.current) {
        textareaRef.current.value = fullContent;
      }
    } else {
      console.warn(`Module ${moduleId} not found in element map`);
      setModuleContent('');
    }
  };

  const formatComplexElementForEditing = (element: Element): string => {
    // Create a simplified version for editing complex elements
    const clone = element.cloneNode(true) as Element;
    
    // Extract text content from various child elements
    const textElements: string[] = [];
    
    // Get headings
    const headings = clone.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      const text = h.textContent?.trim();
      if (text) {
        textElements.push(`<${h.tagName.toLowerCase()}>${text}</${h.tagName.toLowerCase()}>`);
      }
    });
    
    // Get paragraphs
    const paragraphs = clone.querySelectorAll('p');
    paragraphs.forEach(p => {
      const text = p.textContent?.trim();
      if (text) {
        textElements.push(`<p>${text}</p>`);
      }
    });
    
    // Get links
    const links = clone.querySelectorAll('a');
    links.forEach(a => {
      const text = a.textContent?.trim();
      const href = a.getAttribute('href');
      if (text) {
        textElements.push(`<a href="${href || '#'}">${text}</a>`);
      }
    });
    
    // Get images
    const images = clone.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt');
      if (src) {
        textElements.push(`<img src="${src}" alt="${alt || ''}" style="max-width: 100%; height: auto;" />`);
      }
    });
    
    // If no structured elements found, use the original innerHTML
    if (textElements.length === 0) {
      return element.innerHTML;
    }
    
    return textElements.join('\n\n');
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
      parseAndMapModules(); // Re-parse after undo
    }
  };

  const handleModuleContentChange = (newContent: string) => {
    if (!selectedModuleId) return;

    const element = moduleElements.get(selectedModuleId);
    if (!element) return;

    // Use DOM parsing and in-place update to avoid moving module positions
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml, 'text/html');

      let targetElement: Element | null = doc.getElementById(selectedModuleId) as Element | null;
      if (!targetElement) targetElement = doc.querySelector(`[data-module-id="${selectedModuleId}"]`) as Element | null;

      // fallback: try matching by original element outerHTML snippet
      if (!targetElement && element) {
        const originalSnippet = (element.outerHTML || '').slice(0, 120);
        const found = Array.from(doc.querySelectorAll('*')).find(el => (el.outerHTML || '').startsWith(originalSnippet));
        if (found) targetElement = found;
      }

      // Fallback: try using the computedModuleMap snippet we saved earlier
      if (!targetElement) {
        const snippet = computedModuleMap[selectedModuleId];
        if (snippet) {
          const foundBySnippet = Array.from(doc.querySelectorAll('*')).find(el => {
            const out = el.outerHTML || '';
            return out === snippet || out.startsWith(snippet.slice(0, 120));
          });
          if (foundBySnippet) targetElement = foundBySnippet;
        }
      }

      if (!targetElement) {
        console.error(`Could not find target element for module: ${selectedModuleId}`);
        return;
      }

      if (editMode === 'visual') {
        // Debounce visual edits to avoid noisy history and moving content
        if (applyEditTimer.current) window.clearTimeout(applyEditTimer.current);
        applyEditTimer.current = window.setTimeout(() => {
          targetElement!.innerHTML = newContent;
          const updatedHtml = doc.body.innerHTML;
          setCurrentHtml(updatedHtml);
          addToHistory(updatedHtml);
          parseAndMapModules();
          applyEditTimer.current = null;
        }, 500);
      } else {
        // Code mode: replace element immediately
        try {
          const tempDoc = parser.parseFromString(newContent, 'text/html');
          const newElement = tempDoc.body.firstElementChild;
          if (newElement && targetElement.parentNode) {
            const importedElement = doc.importNode(newElement, true);
            targetElement.parentNode.replaceChild(importedElement, targetElement);
            const updatedHtml = doc.body.innerHTML;
            setCurrentHtml(updatedHtml);
            addToHistory(updatedHtml);
            setTimeout(parseAndMapModules, 100);
          }
        } catch (err) {
          console.error('Error parsing new content:', err);
        }
      }
    } catch (err) {
      console.error('DOM update failed', err);
    }
  };

  const handleVisualContentChange = () => {
    if (contentEditableRef.current && !isUpdatingContent.current) {
      const newContent = contentEditableRef.current.innerHTML;
      // throttle visual updates by passing through handleModuleContentChange which debounces
      handleModuleContentChange(newContent);
    }
  };

  const handleCodeContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setModuleContent(newContent);
    handleModuleContentChange(newContent);
  };

  const handleEditModeSwitch = (newMode: 'visual' | 'code') => {
    if (newMode === editMode) return;
    
    setEditMode(newMode);
    
    // If we have a selected module, update the content display
    if (selectedModuleId && moduleElements.has(selectedModuleId)) {
      const element = moduleElements.get(selectedModuleId);
      if (element) {
        if (newMode === 'visual') {
          // Switching to visual mode - show innerHTML
          setTimeout(() => {
            if (contentEditableRef.current) {
              isUpdatingContent.current = true;
              const innerHTML = element.innerHTML;
              const formattedContent = element.querySelectorAll('*').length > 5 
                ? formatComplexElementForEditing(element)
                : innerHTML;
              contentEditableRef.current.innerHTML = formattedContent;
              isUpdatingContent.current = false;
            }
          }, 50);
        } else {
          // Switching to code mode - show outerHTML
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.value = element.outerHTML;
              setModuleContent(element.outerHTML);
            }
          }, 50);
        }
      }
    }
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
    // Annotate selected module with markers to support targeted AI edits
    if (selectedModuleId) {
      const wrapped = wrapModuleWithMarkers(currentHtml, selectedModuleId);
      setCompiledTemplate(wrapped);
      setShowCompiled(true);
      return;
    }
    setCompiledTemplate(currentHtml);
    setShowCompiled(true);
  };

  const downloadTemplate = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name}</title>
</head>
<body>
    ${currentHtml}
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

  const refreshModuleMapping = () => {
    parseAndMapModules();
    setSelectedModuleId('');
    setModuleContent('');
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
          <button
            onClick={refreshModuleMapping}
            className="mt-3 flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <RefreshCw size={14} className="mr-1" />
            Refresh Modules
          </button>
        </div>
          
          <div className="p-4">
            <h4 className="font-semibold text-gray-900 mb-4">Auto-Detected Modules</h4>
            <div className="space-y-3">
              {(computedModules || []).map((module) => (
                <div key={module.id} className={`border rounded-lg transition-all duration-200 ${
                  selectedModuleId === module.id 
                    ? 'border-blue-300 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <button
                    onClick={() => handleModuleSelection(module.id)}
                    className={`w-full text-left p-4 rounded-lg transition-colors duration-200 ${
                      selectedModuleId === module.id 
                        ? 'bg-blue-50' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-gray-900">{module.name}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            module.type === 'header' ? 'bg-purple-100 text-purple-700' :
                            module.type === 'hero' ? 'bg-blue-100 text-blue-700' :
                            module.type === 'content' ? 'bg-green-100 text-green-700' :
                            module.type === 'footer' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {module.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{module.description}</p>
                        <div className="text-xs text-gray-400 mt-2 flex items-center space-x-3">
                          <span>Tag: {module.tag || 'auto'}</span>
                          {moduleElements.has(module.id) && (
                            <span className="flex items-center text-green-600">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
                              Mapped
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-3">
                        {module.editable && (
                          <Edit size={14} className={`${selectedModuleId === module.id ? 'text-blue-600' : 'text-gray-400'}`} />
                        )}
                      </div>
                    </div>
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
                  
                  {/* Toggle Switch for Edit Mode - Always visible */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${editMode === 'visual' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <Edit size={14} className="inline mr-1" />
                        Visual
                      </span>
                      <button
                        onClick={() => handleEditModeSwitch(editMode === 'visual' ? 'code' : 'visual')}
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
                      const props = parsePropertiesFromHtml(snippet);
                      console.log('Parsed module props:', props);
                      const edited = window.prompt('Edit the selected module HTML (mock AI) — parsed props: ' + JSON.stringify(props), snippet);
                      if (edited !== null) patchSelectedModuleHtml(selectedModuleId, edited);
                    }}
                    className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <span className="ml-1">AI Edit</span>
                  </button>
                </div>
              </div>
            </div>          {/* Editor Content */}
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
                  <p className="text-gray-400 text-sm">This playground works with auto-detected modules</p>
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

export default EnhancedTemplatePlayground;