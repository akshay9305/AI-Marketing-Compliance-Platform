"""
Template Analyzer Service
Automatically detects and extracts editable modules from HTML templates
"""

import re
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup, Tag
import uuid

class TemplateAnalyzer:
    """Service to analyze HTML templates and extract editable modules"""
    
    def __init__(self):
        self.module_patterns = {
            'header': [
                r'header', r'head', r'logo', r'brand', r'nav', r'menu',
                r'top', r'banner'
            ],
            'hero': [
                r'hero', r'banner', r'main', r'featured', r'highlight',
                r'jumbotron', r'primary', r'intro'
            ],
            'content': [
                r'content', r'body', r'main', r'article', r'text',
                r'description', r'info', r'details'
            ],
            'footer': [
                r'footer', r'bottom', r'end', r'legal', r'contact',
                r'unsubscribe', r'copyright'
            ],
            'sidebar': [
                r'sidebar', r'side', r'aside', r'widget'
            ],
            'navigation': [
                r'nav', r'menu', r'links', r'navigation'
            ]
        }
    
    def analyze_template(self, content: str, is_mjml: bool = False) -> Dict[str, Any]:
        """
        Analyze template with comment-based module markers
        
        Args:
            content: Template content (HTML or MJML)
            is_mjml: Whether the content is MJML format
            
        Returns:
            Dictionary containing analyzed template data
        """
        # Extract modules based on comment markers
        modules = self._extract_modules_from_comments(content)
        
        # Extract attributes (variables) per module and globally
        module_attributes = self._extract_module_attributes(content, modules, is_mjml)
        global_attributes = self._extract_attributes(content, is_mjml)
        
        # Create JSON schema from global attributes (for backward compatibility)
        schema = self._create_json_schema(global_attributes)
        
        # Keep header and footer static, replace module content with placeholders
        processed_content = self._process_template_with_modules(content, modules)
        
        return {
            'html_content': processed_content,
            'modules': modules,
            'attributes': global_attributes,  # Keep for backward compatibility
            'module_attributes': module_attributes,  # New: variables per module
            'schema': schema,
            'analysis': {
                'total_modules': len(modules),
                'structure_type': 'comment_based',
                'has_header': 'HEADER_START' in content and 'HEADER_END' in content,
                'has_footer': 'FOOTER_START' in content and 'FOOTER_END' in content,
                'complexity': 'medium' if len(modules) > 2 else 'simple',
                'file_type': 'mjml' if is_mjml else 'html'
            }
        }
    
    def _extract_modules_from_comments(self, content: str) -> List[Dict[str, Any]]:
        """Extract modules based on comment markers"""
        modules = []
        
        # Pattern to match module comments
        module_pattern = r'<!--\s*MODULE_START:(\w+)\s*-->(.*?)<!--\s*MODULE_END:\1\s*-->'
        matches = re.findall(module_pattern, content, re.DOTALL | re.IGNORECASE)
        
        for module_name, module_content in matches:
            # Extract data attributes from the content
            data_attrs = self._extract_data_attributes(module_content)
            
            module = {
                'id': str(uuid.uuid4()),
                'name': data_attrs.get('module-name', module_name.replace('_', ' ').title()),
                'type': data_attrs.get('module-type', module_name.lower()),
                'editable': data_attrs.get('module-editable', 'true').lower() == 'true',
                'description': data_attrs.get('module-description', f'Editable {module_name.lower()} section'),
                'tag': data_attrs.get('module-tag', 'div'),
                'selector': f'[data-module-id="{str(uuid.uuid4())}"]',
                'content': module_content.strip(),
                'attributes': data_attrs
            }
            modules.append(module)
        
        return modules
    
    def _extract_data_attributes(self, content: str) -> Dict[str, str]:
        """Extract data attributes from HTML/MJML content"""
        attrs = {}
        
        # Find all data-module-* attributes
        attr_pattern = r'data-module-([a-z-]+)="([^"]*)"'
        matches = re.findall(attr_pattern, content, re.IGNORECASE)
        
        for attr_name, attr_value in matches:
            attrs[attr_name] = attr_value
        
        return attrs
    
    def _extract_attributes(self, content: str, is_mjml: bool) -> Dict[str, Any]:
        """Extract template variables/attributes with smart field type
        detection"""
        attributes = {}
        
        # Extract variables based on template type
        if is_mjml:
            # Handlebars-style variables: {{variable}}
            var_pattern = r'\{\{(\w+)\}\}'
        else:
            # AMPscript-style variables: %%=v(@variable)=%%
            var_pattern = r'%%=v\(@(\w+)\)=%%'
        
        matches = re.findall(var_pattern, content)
        
        for var in matches:
            if var not in attributes:
                # Smart field type detection based on variable name
                field_type = self._detect_field_type(var, content)
                
                attributes[var] = {
                    'type': 'string',
                    'fieldType': field_type,
                    'default': self._get_default_value(field_type),
                    'description': self._get_field_description(var, field_type)
                }
        
        return attributes
    
    def _detect_field_type(self, var_name: str, context: str = "") -> str:
        """Detect the appropriate field type based on variable name and
        context"""
        var_lower = var_name.lower()
        
        # Color detection
        color_keywords = ['color', 'bg', 'background', 'foreground',
                          'text_color']
        if any(keyword in var_lower for keyword in color_keywords):
            return 'color'
        
        # URL/Link detection
        url_keywords = ['url', 'link', 'href', 'cta_url', 'button_link']
        if any(keyword in var_lower for keyword in url_keywords):
            return 'url'
        
        # Image detection
        image_keywords = ['image', 'img', 'photo', 'picture', 'logo',
                          'icon']
        if any(keyword in var_lower for keyword in image_keywords):
            return 'image'
        
        # Rich text detection (HTML content)
        richtext_keywords = ['html', 'richtext', 'content_html',
                             'body_html']
        if any(keyword in var_lower for keyword in richtext_keywords):
            return 'richtext'
        
        # Text area detection (longer content)
        textarea_keywords = ['description', 'content', 'text',
                             'message', 'body']
        if any(keyword in var_lower for keyword in textarea_keywords):
            # Check if this variable appears in a larger text block
            if context and len(context) > 200:
                return 'textarea'
            return 'textarea'
        
        # Default to text input
        return 'text'
    
    def _get_default_value(self, field_type: str) -> str:
        """Get appropriate default value for field type"""
        defaults = {
            'color': '#E03A3E',  # Mars red
            'url': 'https://www.mars.com',
            'image': 'https://via.placeholder.com/300x200?text=Mars',
            'textarea': 'Book your products with Mars today!',
            'richtext': '<p>Enjoy with <strong>Mars</strong> chocolates.</p>',
            'text': 'Mars'
        }
        return defaults.get(field_type, '')
    
    def _get_field_description(self, var_name: str, field_type: str) -> str:
        """Generate descriptive text for the field"""
        base_desc = var_name.replace('_', ' ').title()
        
        type_hints = {
            'color': 'Choose a color',
            'url': 'Enter a valid URL',
            'image': 'Enter image URL or upload',
            'textarea': 'Enter longer text content',
            'richtext': 'Rich text with formatting (HTML allowed)',
            'text': 'Enter text content'
        }
        
        hint = type_hints.get(field_type, 'Enter value')
        return f"{base_desc} - {hint}"
    
    def _extract_module_attributes(self, content: str,
                                   modules: List[Dict[str, Any]],
                                   is_mjml: bool) -> Dict[str, Dict[str, Any]]:
        """Extract variables per module"""
        module_attributes = {}
        
        for module in modules:
            module_type = module['type']
            # Find the module content
            module_pattern = (
                f'<!--\\s*MODULE_START:{module_type}\\s*-->'
                f'(.*?)'
                f'<!--\\s*MODULE_END:{module_type}\\s*-->'
            )
            match = re.search(module_pattern, content,
                              re.DOTALL | re.IGNORECASE)
            
            if match:
                module_content = match.group(1)
                # Extract variables from this module's content
                attributes = self._extract_attributes(module_content, is_mjml)
                module_attributes[module['id']] = {
                    'module_type': module_type,
                    'module_name': module['name'],
                    'attributes': attributes
                }
        
        return module_attributes
    
    def _process_template_with_modules(self, content: str,
                                       modules: List[Dict[str, Any]]) -> str:
        """Process template to keep header/footer static and replace
        modules with placeholders"""
        processed_content = content
        
        # Replace module content with placeholders
        for module in modules:
            module_name = module['type']
            placeholder = f'<!-- MODULE_PLACEHOLDER:{module_name} -->'
            
            # Find the module content and replace it
            module_pattern = (
                f'<!--\\s*MODULE_START:{module_name}\\s*-->.*?'
                f'<!--\\s*MODULE_END:{module_name}\\s*-->'
            )
            processed_content = re.sub(
                module_pattern, placeholder, processed_content,
                flags=re.DOTALL | re.IGNORECASE
            )
        
        return processed_content
    
    def _create_json_schema(self, attributes: Dict[str, Any]
                            ) -> Dict[str, Any]:
        """Create a JSON schema from extracted attributes"""
        if not attributes:
            return {}
        
        properties = {}
        required = []
        
        for attr_name, attr_info in attributes.items():
            properties[attr_name] = {
                'type': attr_info.get('type', 'string'),
                'title': attr_name.replace('_', ' ').title(),
                'description': attr_info.get('description',
                                             f'{attr_name} field'),
                'default': attr_info.get('default', '')
            }
            # Make all attributes required for now
            required.append(attr_name)
        
        schema = {
            '$schema': 'http://json-schema.org/draft-07/schema#',
            'type': 'object',
            'title': 'Template Variables',
            'description': 'Variables extracted from the email template',
            'properties': properties,
            'required': required
        }
        
        return schema
