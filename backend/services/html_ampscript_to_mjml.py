
#!/usr/bin/env python3
"""
HTML+AMPscript to MJML Converter
Converts HTML+AMPscript email templates to MJML format

Usage:
    python html_ampscript_to_mjml.py input.html output.mjml
    python html_ampscript_to_mjml.py input.html  # outputs to output.mjml
"""

import re
import sys
from pathlib import Path
try:
    from bs4 import BeautifulSoup, NavigableString, Tag
except ImportError:
    print("❌ Error: BeautifulSoup4 is required.")
    print("Install it with: pip install beautifulsoup4")
    sys.exit(1)


class HTMLToMJMLConverter:
    """Converts HTML structure to MJML"""
    
    def __init__(self):
        self.mjml_parts = []
        self.ampscript_blocks = []
        self.styles = []
        self.inline_styles = []
    
    def convert(self, html_content):
        """Main conversion method"""
        print("Step 1: Extracting AMPscript blocks...")
        # Extract AMPscript blocks first
        self.ampscript_blocks = self.extract_ampscript_blocks(html_content)
        print(f"  Found {len(self.ampscript_blocks)} AMPscript blocks")
        
        print("Step 2: Extracting CSS styles...")
        # Extract CSS styles
        self.styles = self.extract_styles(html_content)
        print(f"  Extracted {len(self.styles)} characters of CSS")
        
        print("Step 3: Cleaning HTML for parsing...")
        # Clean HTML for parsing
        clean_html = self.clean_html_for_parsing(html_content)
        print(f"  Created {len(self.ampscript_placeholders)} placeholders")
        
        print("Step 4: Parsing HTML with BeautifulSoup...")
        # Parse with BeautifulSoup
        try:
            soup = BeautifulSoup(clean_html, 'html.parser')
            print("  Parsing successful")
        except Exception as e:
            print(f"  Parsing error: {e}")
            raise
        
        print("Step 5: Building MJML structure...")
        # Build MJML structure
        mjml_output = self.build_mjml_structure(soup)
        print("  MJML structure built successfully")
        
        return mjml_output
    
    def extract_ampscript_blocks(self, html):
        """Extract AMPscript blocks from HTML"""
        blocks = []
        
        # Find all AMPscript blocks %%[ ... ]%%
        pattern = r'(%%\[[\s\S]*?\]%%)'
        matches = re.finditer(pattern, html)
        
        for match in matches:
            blocks.append(match.group(1))
        
        return blocks
    
    def extract_styles(self, html):
        """Extract CSS styles from HTML"""
        styles = []
        
        # Extract style tags
        style_pattern = r'<style[^>]*>([\s\S]*?)</style>'
        matches = re.findall(style_pattern, html, re.IGNORECASE)
        
        for match in matches:
            styles.append(match.strip())
        
        return '\n'.join(styles)
    
    def clean_html_for_parsing(self, html):
        """Clean HTML content for parsing while preserving AMPscript"""
        # Replace AMPscript blocks with placeholders to preserve them during parsing
        ampscript_placeholders = {}
        counter = 0
        
        def replace_ampscript(match):
            nonlocal counter
            placeholder = f"__AMPSCRIPT_BLOCK_{counter}__"
            ampscript_placeholders[placeholder] = match.group(0)
            counter += 1
            return placeholder
        
        # Replace ALL AMPscript constructs with placeholders
        # This includes inline expressions %%=...=%%, blocks %%[...]%%, and variables {{...}}
        html = re.sub(r'%%=.*?=%%', replace_ampscript, html)
        html = re.sub(r'%%\[[\s\S]*?\]%%', replace_ampscript, html)
        html = re.sub(r'%%\w+%%', replace_ampscript, html)
        html = re.sub(r'\{\{[\w_]+\}\}', replace_ampscript, html)
        
        # Store placeholders for later restoration
        self.ampscript_placeholders = ampscript_placeholders
        
        return html
    
    def restore_ampscript(self, content):
        """Restore AMPscript blocks from placeholders"""
        for placeholder, ampscript in self.ampscript_placeholders.items():
            content = content.replace(placeholder, ampscript)
        return content
    
    def build_mjml_structure(self, soup):
        """Build MJML structure from parsed HTML"""
        mjml_parts = ['<mjml>']
        mjml_parts.append('  <mj-head>')
        
        # Add styles (AMPscript blocks will be inline with content, not in head)
        if self.styles:
            mjml_parts.append('    <mj-style inline="inline">')
            for line in self.styles.split('\n'):
                if line.strip():
                    mjml_parts.append(f'      {line.strip()}')
            mjml_parts.append('    </mj-style>')
            mjml_parts.append('')
        
        # Add default attributes
        mjml_parts.append('    <mj-attributes>')
        mjml_parts.append('      <mj-all font-family="Arial, sans-serif" />')
        mjml_parts.append('      <mj-text font-size="14px" color="#333333" line-height="1.6" />')
        mjml_parts.append('      <mj-button background-color="#3498db" color="#ffffff" border-radius="5px" />')
        mjml_parts.append('    </mj-attributes>')
        mjml_parts.append('  </mj-head>')
        mjml_parts.append('')
        mjml_parts.append('  <mj-body background-color="#f4f4f4">')
        
        # Process body content
        body = soup.find('body') or soup
        body_content = self.convert_body_content(body)
        
        for line in body_content:
            mjml_parts.append(f'    {line}')
        
        mjml_parts.append('  </mj-body>')
        mjml_parts.append('</mjml>')
        
        # Restore AMPscript
        result = '\n'.join(mjml_parts)
        result = self.restore_ampscript(result)
        
        return result
    
    def convert_body_content(self, body):
        """Convert body content to MJML sections"""
        sections = []
        
        # Find top-level structural elements
        for element in body.children:
            if isinstance(element, Tag):
                section_content = self.convert_element_to_section(element)
                if section_content:
                    sections.extend(section_content)
            elif isinstance(element, NavigableString) and element.strip():
                # Handle text content outside tags
                text_content = str(element).strip()
                if text_content and not text_content.startswith('%%['):
                    sections.append('<mj-section background-color="#ffffff" padding="20px">')
                    sections.append('  <mj-column>')
                    sections.append('    <mj-text>')
                    sections.append(f'      {text_content}')
                    sections.append('    </mj-text>')
                    sections.append('  </mj-column>')
                    sections.append('</mj-section>')
        
        return sections
    
    def convert_element_to_section(self, element):
        """Convert an HTML element to MJML section(s)"""
        sections = []
        
        # Handle different element types
        if element.name in ['div', 'section', 'article']:
            sections.extend(self.convert_container_element(element))
        elif element.name == 'table':
            sections.extend(self.convert_table_element(element))
        elif element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']:
            sections.extend(self.convert_text_element(element))
        elif element.name == 'img':
            sections.extend(self.convert_image_element(element))
        elif element.name in ['header', 'footer', 'main']:
            sections.extend(self.convert_semantic_element(element))
        else:
            # Wrap other elements in a text section
            sections.extend(self.convert_generic_element(element))
        
        return sections
    
    def convert_container_element(self, element):
        """Convert div, section, article elements"""
        sections = []
        
        # Extract styling
        bg_color = self.extract_background_color(element)
        padding = self.extract_padding(element)
        
        sections.append(f'<mj-section background-color="{bg_color}" padding="{padding}">')
        
        # Check if this container has table-like structure
        if self.is_table_like_structure(element):
            columns = self.extract_columns_from_container(element)
            for col_content in columns:
                sections.append('  <mj-column>')
                # Keep images inline within text content
                sections.append('    <mj-text>')
                sections.append(f'      {col_content}')
                sections.append('    </mj-text>')
                sections.append('  </mj-column>')
        else:
            sections.append('  <mj-column>')
            content = self.extract_inner_content(element)
            if content.strip():
                # Keep images inline within text content instead of separating them
                sections.append('    <mj-text>')
                sections.append(f'      {content}')
                sections.append('    </mj-text>')
            sections.append('  </mj-column>')
        
        sections.append('</mj-section>')
        return sections
    
    def contains_image(self, content):
        """Check if content contains img tags"""
        return '<img' in content
    
    def separate_images_and_text(self, content):
        """Separate images from text content"""
        soup = BeautifulSoup(content, 'html.parser')
        
        img_tags = []
        for img in soup.find_all('img'):
            img_mjml = self.convert_img_tag(img)
            img_tags.append(img_mjml)
            img.decompose()  # Remove from soup
        
        # Get remaining text content
        text_content = str(soup).strip()
        img_content = '\n    '.join(img_tags) if img_tags else ''
        
        return img_content, text_content
    
    def convert_table_element(self, element):
        """Convert table elements to MJML sections"""
        sections = []
        
        rows = element.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if cells:
                sections.append('<mj-section background-color="#ffffff" padding="10px">')
                
                for cell in cells:
                    sections.append('  <mj-column>')
                    content = self.extract_inner_content(cell)
                    
                    # Check if cell contains an image
                    if cell.find('img'):
                        img = cell.find('img')
                        sections.append(self.convert_img_tag(img))
                    else:
                        sections.append('    <mj-text>')
                        sections.append(f'      {content}')
                        sections.append('    </mj-text>')
                    
                    sections.append('  </mj-column>')
                
                sections.append('</mj-section>')
        
        return sections
    
    def convert_text_element(self, element):
        """Convert text elements (h1-h6, p)"""
        sections = []
        
        font_sizes = {
            'h1': '28px', 'h2': '24px', 'h3': '20px',
            'h4': '18px', 'h5': '16px', 'h6': '14px', 'p': '14px'
        }
        
        font_weight = 'bold' if element.name.startswith('h') else 'normal'
        font_size = font_sizes.get(element.name, '14px')
        
        sections.append('<mj-section background-color="#ffffff" padding="10px">')
        sections.append('  <mj-column>')
        sections.append(f'    <mj-text font-size="{font_size}" font-weight="{font_weight}">')
        
        content = self.extract_inner_content(element)
        sections.append(f'      {content}')
        
        sections.append('    </mj-text>')
        sections.append('  </mj-column>')
        sections.append('</mj-section>')
        
        return sections
    
    def convert_image_element(self, element):
        """Convert img elements"""
        sections = []
        
        sections.append('<mj-section background-color="#ffffff" padding="10px">')
        sections.append('  <mj-column>')
        sections.append(self.convert_img_tag(element))
        sections.append('  </mj-column>')
        sections.append('</mj-section>')
        
        return sections
    
    def convert_img_tag(self, img):
        """Convert img tag to mj-image"""
        src = img.get('src', '')
        alt = img.get('alt', '')
        width = img.get('width', '')
        height = img.get('height', '')
        
        img_tag = '    <mj-image'
        if src:
            img_tag += f' src="{src}"'
        if alt:
            img_tag += f' alt="{alt}"'
        if width:
            img_tag += f' width="{width}px"'
        if height:
            img_tag += f' height="{height}px"'
        img_tag += ' />'
        
        return img_tag
    
    def convert_semantic_element(self, element):
        """Convert semantic HTML5 elements"""
        bg_colors = {
            'header': '#2c3e50',
            'footer': '#34495e',
            'main': '#ffffff'
        }
        
        bg_color = bg_colors.get(element.name, '#ffffff')
        
        sections = []
        sections.append(f'<mj-section background-color="{bg_color}" padding="20px">')
        sections.append('  <mj-column>')
        
        content = self.extract_inner_content(element)
        sections.append('    <mj-text>')
        sections.append(f'      {content}')
        sections.append('    </mj-text>')
        
        sections.append('  </mj-column>')
        sections.append('</mj-section>')
        
        return sections
    
    def convert_generic_element(self, element):
        """Convert other elements as text content"""
        sections = []
        
        sections.append('<mj-section background-color="#ffffff" padding="10px">')
        sections.append('  <mj-column>')
        sections.append('    <mj-text>')
        
        content = str(element)
        sections.append(f'      {content}')
        
        sections.append('    </mj-text>')
        sections.append('  </mj-column>')
        sections.append('</mj-section>')
        
        return sections
    
    def extract_background_color(self, element):
        """Extract background color from element styles"""
        style = element.get('style', '')
        bgcolor = element.get('bgcolor', '')
        
        if bgcolor:
            return bgcolor
        
        bg_match = re.search(r'background-color:\s*([^;]+)', style)
        if bg_match:
            return bg_match.group(1).strip()
        
        return '#ffffff'
    
    def extract_padding(self, element):
        """Extract padding from element styles"""
        style = element.get('style', '')
        
        padding_match = re.search(r'padding:\s*([^;]+)', style)
        if padding_match:
            return padding_match.group(1).strip()
        
        return '20px'
    
    def is_table_like_structure(self, element):
        """Check if element has table-like structure (columns)"""
        # Look for common column patterns
        column_indicators = [
            'column', 'col-', 'grid-', 'flex-item',
            'cell', 'td-', 'float-left', 'float-right'
        ]
        
        class_attr = element.get('class', [])
        if isinstance(class_attr, str):
            class_attr = class_attr.split()
        
        for class_name in class_attr:
            for indicator in column_indicators:
                if indicator in class_name.lower():
                    return True
        
        # Check for direct children that look like columns
        children = [child for child in element.children if isinstance(child, Tag)]
        if len(children) > 1:
            for child in children:
                child_class = child.get('class', [])
                if isinstance(child_class, str):
                    child_class = child_class.split()
                
                for class_name in child_class:
                    for indicator in column_indicators:
                        if indicator in class_name.lower():
                            return True
        
        return False
    
    def extract_columns_from_container(self, element):
        """Extract column content from container"""
        columns = []
        
        # Find direct children that could be columns
        for child in element.children:
            if isinstance(child, Tag):
                content = self.extract_inner_content(child)
                if content.strip():
                    columns.append(content)
        
        return columns if columns else [self.extract_inner_content(element)]
    
    def extract_inner_content(self, element):
        """Extract inner content while preserving some HTML structure"""
        if isinstance(element, NavigableString):
            return str(element)
        
        # Convert some HTML tags to email-friendly versions
        content = str(element)
        
        # Preserve important formatting
        content = re.sub(r'<br\s*/?>', '<br/>', content)
        content = re.sub(r'<hr\s*/?>', '<hr/>', content)
        
        # Convert headings to preserve original styling and structure
        content = re.sub(r'<h([1-6])[^>]*>(.*?)</h[1-6]>', r'<h\1>\2</h\1>', content, flags=re.DOTALL)
        
        # Convert paragraphs to line breaks
        content = re.sub(r'<p[^>]*>(.*?)</p>', r'\1<br/><br/>', content, flags=re.DOTALL)
        
        # Preserve links
        content = re.sub(r'<a\s+([^>]*href="[^"]*"[^>]*)>(.*?)</a>', r'<a \1>\2</a>', content, flags=re.DOTALL)
        
        # Clean up extra whitespace but preserve line breaks
        content = re.sub(r'\n\s*\n', '\n', content)
        content = re.sub(r'>\s+<', '><', content)
        
        # Remove outer tag if it's the element itself
        if element.name:
            pattern = f'<{element.name}[^>]*>(.*)</{element.name}>'
            match = re.match(pattern, content, re.DOTALL)
            if match:
                content = match.group(1)
        
        return content.strip()


def load_file(filepath):
    """Load file content"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()


def save_file(content, filepath):
    """Save content to file"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def main():
    """Main execution"""
    if len(sys.argv) < 2:
        print("Usage: python html_ampscript_to_mjml.py <input.html> [output.mjml]")
        print("\nExample:")
        print("  python html_ampscript_to_mjml.py email_template.html "
              "email_template.mjml")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'output.mjml'
    
    if not Path(input_file).exists():
        print(f"Error: Input file '{input_file}' not found!")
        sys.exit(1)
    
    print("=" * 60)
    print("HTML+AMPscript to MJML Converter")
    print("=" * 60)
    
    print(f"\nLoading: {input_file}")
    html_content = load_file(input_file)
    
    print("Converting to MJML...")
    converter = HTMLToMJMLConverter()
    mjml_content = converter.convert(html_content)
    
    print(f"Saving to: {output_file}")
    save_file(mjml_content, output_file)
    
    print(f"\nSuccess! MJML file created: {output_file}")
    print(f"Input size: {len(html_content)} bytes -> "
          f"Output size: {len(mjml_content)} bytes")
    print("\nNext steps:")
    print("   1. Review the generated MJML file")
    print("   2. Test it at https://mjml.io/try-it-live")
    print("   3. Compile to HTML using: python mjml_renderer.py "
          "output.mjml payload.json final.html")
    print("\nNote: Manual review recommended for complex layouts")


if __name__ == "__main__":
    main()
