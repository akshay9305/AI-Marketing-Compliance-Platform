#!/usr/bin/env python3
"""
MJML+AMPscript Renderer
Renders MJML+AMPscript templates with JSON payload data

This script:
1. Processes AMPscript with payload data
2. Compiles MJML to HTML
3. Outputs final rendered HTML

Usage:
    python render_mjml_ampscript.py template.mjml payload.json output.html
    python render_mjml_ampscript.py template.mjml payload.json  # outputs to rendered_output.html

Requirements:
    pip install mjml
    OR
    npm install -g mjml (and have 'mjml' command available)
"""

import re
import json
import sys
import subprocess
import tempfile
from datetime import datetime, timedelta
from pathlib import Path


class AMPScriptProcessor:
    """Processes AMPscript within MJML templates"""
    
    def __init__(self, data):
        self.data = data
        self.variables = {}
        self.functions = self._register_functions()
        # Initialize variables from payload
        self._initialize_variables_from_payload()
        
    def _initialize_variables_from_payload(self):
        """Initialize @variables from payload data"""
        for key, value in self.data.items():
            self.variables[f'@{key}'] = value
        
    def process(self, mjml_content):
        """Process AMPscript in MJML and return processed MJML"""
        # Step 0: Replace mustache variables
        mjml_content = self._replace_mustache_variables(mjml_content)
        
        # Step 1: Extract and process AMPscript blocks
        mjml_content = self._process_ampscript_blocks(mjml_content)
        
        # Step 2: Replace variable outputs
        mjml_content = self._replace_variable_outputs(mjml_content)
        
        # Step 3: Replace inline expressions
        mjml_content = self._replace_inline_expressions(mjml_content)
        
        # Step 4: Replace system variables
        mjml_content = self._replace_system_vars(mjml_content)
        
        return mjml_content
    
    def _replace_mustache_variables(self, content):
        """Replace {{VarName}} with payload values"""
        def replace_var(match):
            var_name = match.group(1)
            value = self.data.get(var_name, '')
            return str(value) if value is not None else ''
        
        content = re.sub(r'\{\{(\w+)\}\}', replace_var, content)
        return content
    
    def _register_functions(self):
        """Register AMPscript-like functions"""
        return {
            'AttributeValue': self._attr_value,
            'Empty': self._empty,
            'Format': self._format,
            'DateAdd': self._date_add,
            'Now': self._now,
            'Concat': self._concat,
            'Substring': self._substring,
            'Length': self._length,
            'Uppercase': self._uppercase,
            'Lowercase': self._lowercase,
            'ProperCase': self._proper_case,
            'Replace': self._replace,
            'Trim': self._trim,
            'Add': self._add,
            'Subtract': self._subtract,
            'Multiply': self._multiply,
            'Divide': self._divide,
            'Mod': self._mod,
        }
    
    def _process_ampscript_blocks(self, content):
        """Process AMPscript blocks %%[ ... ]%% and handle conditional content"""
        # Process all AMPscript blocks and conditional content together
        result = []
        pos = 0
        
        # Find all AMPscript blocks
        pattern = r'%%\[([\s\S]*?)\]%%'
        matches = list(re.finditer(pattern, content))
        
        if not matches:
            return content
        
        # Track conditional state
        condition_stack = []
        skip_content = False
        
        for match in matches:
            # Add content before this block (if not skipping)
            if not skip_content:
                result.append(content[pos:match.start()])
            
            block_content = match.group(1).strip()
            pos = match.end()
            
            # Process the block
            block_upper = block_content.upper()
            
            if block_upper.startswith('IF '):
                # Parse IF condition - remove THEN if present
                condition_match = re.match(r'IF\s+(.+?)(?:\s+THEN)?$', block_content, re.IGNORECASE)
                if condition_match:
                    condition = condition_match.group(1).strip()
                    condition_result = self._evaluate_condition(condition)
                    condition_stack.append({
                        'type': 'IF',
                        'result': condition_result,
                        'executed': condition_result
                    })
                    skip_content = not condition_result
            
            elif block_upper.startswith('ELSEIF '):
                if condition_stack:
                    # Parse ELSEIF condition - remove THEN if present
                    condition_match = re.match(r'ELSEIF\s+(.+?)(?:\s+THEN)?$', block_content, re.IGNORECASE)
                    if condition_match:
                        condition = condition_match.group(1).strip()
                        # Only evaluate if previous conditions were false
                        if not condition_stack[-1]['executed']:
                            condition_result = self._evaluate_condition(condition)
                            if condition_result:
                                condition_stack[-1]['executed'] = True
                                skip_content = False
                            else:
                                skip_content = True
                        else:
                            skip_content = True
            
            elif block_upper.startswith('ELSE'):
                if condition_stack:
                    # Execute else block only if no previous condition was true
                    skip_content = condition_stack[-1]['executed']
            
            elif block_upper.startswith('ENDIF'):
                if condition_stack:
                    condition_stack.pop()
                    skip_content = len(condition_stack) > 0 and not condition_stack[-1]['executed']
            
            else:
                # Non-conditional statement (VAR, SET, etc.)
                self._execute_ampscript_statement(block_content)
        
        # Add remaining content
        if not skip_content:
            result.append(content[pos:])
        
        return ''.join(result)
    
    def _execute_ampscript_statement(self, code):
        """Execute a single AMPscript statement"""
        code = code.strip()
        
        # VAR declaration
        if code.upper().startswith('VAR '):
            var_part = code[4:].strip()
            var_names = [v.strip() for v in var_part.split(',')]
            for var_name in var_names:
                if var_name and var_name not in self.variables:
                    self.variables[var_name] = None
        
        # SET assignment
        elif code.upper().startswith('SET '):
            match = re.match(r'SET\s+(@\w+)\s*=\s*(.+)', code, re.IGNORECASE)
            if match:
                var_name = match.group(1)
                expression = match.group(2).strip()
                value = self._evaluate_expression(expression)
                self.variables[var_name] = value
    
    def _evaluate_condition(self, condition):
        """Evaluate conditional expressions"""
        if ' OR ' in condition.upper():
            parts = re.split(r'\s+OR\s+', condition, flags=re.IGNORECASE)
            return any(self._evaluate_single_condition(p.strip()) for p in parts)
        
        if ' AND ' in condition.upper():
            parts = re.split(r'\s+AND\s+', condition, flags=re.IGNORECASE)
            return all(self._evaluate_single_condition(p.strip()) for p in parts)
        
        return self._evaluate_single_condition(condition)
    
    def _evaluate_single_condition(self, condition):
        """Evaluate a single condition"""
        operators = [
            ('==', lambda a, b: str(a) == str(b)),
            ('!=', lambda a, b: str(a) != str(b)),
            ('<=', lambda a, b: self._numeric_compare(a, b, lambda x, y: x <= y)),
            ('>=', lambda a, b: self._numeric_compare(a, b, lambda x, y: x >= y)),
            ('<', lambda a, b: self._numeric_compare(a, b, lambda x, y: x < y)),
            ('>', lambda a, b: self._numeric_compare(a, b, lambda x, y: x > y)),
        ]
        
        for op_str, op_func in operators:
            if op_str in condition:
                parts = condition.split(op_str, 1)
                left = self._evaluate_expression(parts[0].strip())
                right = self._evaluate_expression(parts[1].strip())
                return op_func(left, right)
        
        value = self._evaluate_expression(condition)
        return bool(value)
    
    def _numeric_compare(self, a, b, compare_func):
        """Compare two values numerically if possible, otherwise as strings"""
        try:
            return compare_func(float(a), float(b))
        except (ValueError, TypeError):
            return compare_func(str(a), str(b))
    
    def _evaluate_expression(self, expr):
        """Evaluate an expression and return its value"""
        expr = expr.strip()
        
        if (expr.startswith('"') and expr.endswith('"')) or \
           (expr.startswith("'") and expr.endswith("'")):
            return expr[1:-1]
        
        if re.match(r'^-?\d+\.?\d*$', expr):
            return float(expr) if '.' in expr else int(expr)
        
        if expr.startswith('@'):
            return self.variables.get(expr, '')
        
        if '(' in expr:
            return self._evaluate_function(expr)
        
        if any(op in expr for op in ['+', '-', '*', '/', '%']):
            return self._evaluate_arithmetic(expr)
        
        return expr
    
    def _evaluate_function(self, expr):
        """Evaluate function calls"""
        match = re.match(r'(\w+)\((.*)\)', expr, re.DOTALL)
        if not match:
            return expr
        
        func_name = match.group(1)
        args_str = match.group(2)
        
        args = []
        if args_str.strip():
            current_arg = ''
            in_quotes = False
            paren_depth = 0
            
            for char in args_str:
                if char == '"' and (not current_arg or current_arg[-1] != '\\'):
                    in_quotes = not in_quotes
                    current_arg += char
                elif char == '(' and not in_quotes:
                    paren_depth += 1
                    current_arg += char
                elif char == ')' and not in_quotes:
                    paren_depth -= 1
                    current_arg += char
                elif char == ',' and not in_quotes and paren_depth == 0:
                    args.append(self._evaluate_expression(current_arg.strip()))
                    current_arg = ''
                else:
                    current_arg += char
            
            if current_arg.strip():
                args.append(self._evaluate_expression(current_arg.strip()))
        
        if func_name in self.functions:
            return self.functions[func_name](*args)
        
        return ''
    
    def _evaluate_arithmetic(self, expr):
        """Evaluate arithmetic expressions"""
        for var_name, var_value in self.variables.items():
            if var_name in expr:
                expr = expr.replace(var_name, str(var_value or 0))
        
        try:
            return eval(expr)
        except:
            return 0
    
    def _replace_variable_outputs(self, content):
        """Replace %%=v(@varName)=%% with variable values"""
        def replace_var(match):
            var_name = match.group(1)
            value = self.variables.get(var_name, '')
            return str(value) if value is not None else ''
        
        content = re.sub(r'%%=v\((@\w+)\)=%%', replace_var, content)
        return content
    
    def _replace_inline_expressions(self, content):
        """Replace %%=expression=%% with evaluated values"""
        def replace_expr(match):
            expr = match.group(1)
            value = self._evaluate_expression(expr)
            return str(value) if value is not None else ''
        
        content = re.sub(r'%%=([^=]+)=%%', replace_expr, content)
        return content
    
    def _replace_system_vars(self, content):
        """Replace system variables"""
        system_vars = {
            '%%profile_center_url%%': self.data.get('_profile_center_url', 'https://example.com/profile'),
            '%%unsub_center_url%%': self.data.get('_unsub_center_url', 'https://example.com/unsubscribe'),
            '%%Member_Busname%%': self.data.get('_Member_Busname', 'Company Inc.'),
            '%%Member_Addr%%': self.data.get('_Member_Addr', '123 Main Street'),
            '%%Member_City%%': self.data.get('_Member_City', 'City'),
            '%%Member_State%%': self.data.get('_Member_State', 'State'),
            '%%Member_PostalCode%%': self.data.get('_Member_PostalCode', '12345'),
            '%%Member_Country%%': self.data.get('_Member_Country', 'Country'),
        }
        
        for var, value in system_vars.items():
            content = content.replace(var, str(value))
        
        return content
    
    # AMPscript-like functions
    def _attr_value(self, attr_name):
        return self.data.get(attr_name, '')
    
    def _empty(self, value):
        return not bool(value)
    
    def _format(self, value, format_str):
        if isinstance(value, datetime):
            format_map = {
                'MMMM dd, yyyy': '%B %d, %Y',
                'MM/dd/yyyy': '%m/%d/%Y',
                'yyyy-MM-dd': '%Y-%m-%d',
                'HH': '%H',
                'mm': '%M',
                'ss': '%S',
            }
            python_format = format_map.get(format_str, '%Y-%m-%d')
            return value.strftime(python_format)
        return str(value)
    
    def _date_add(self, date, amount, unit):
        if not isinstance(date, datetime):
            date = datetime.now()
        unit = unit.upper()
        if unit == 'D':
            return date + timedelta(days=amount)
        elif unit == 'H':
            return date + timedelta(hours=amount)
        elif unit == 'M':
            return date + timedelta(minutes=amount)
        return date
    
    def _now(self):
        return datetime.now()
    
    def _concat(self, *args):
        return ''.join(str(arg) for arg in args)
    
    def _substring(self, text, start, length=None):
        text = str(text)
        start = int(start) - 1
        if length:
            return text[start:start + int(length)]
        return text[start:]
    
    def _length(self, text):
        return len(str(text))
    
    def _uppercase(self, text):
        return str(text).upper()
    
    def _lowercase(self, text):
        return str(text).lower()
    
    def _proper_case(self, text):
        return str(text).title()
    
    def _replace(self, text, old, new):
        return str(text).replace(str(old), str(new))
    
    def _trim(self, text):
        return str(text).strip()
    
    def _add(self, a, b):
        return float(a) + float(b)
    
    def _subtract(self, a, b):
        return float(a) - float(b)
    
    def _multiply(self, a, b):
        return float(a) * float(b)
    
    def _divide(self, a, b):
        return float(a) / float(b) if float(b) != 0 else 0
    
    def _mod(self, a, b):
        return float(a) % float(b) if float(b) != 0 else 0


def compile_mjml_to_html(mjml_content):
    """Compile MJML to HTML using available method"""
    
    # Try Python MJML library first
    try:
        import mjml
        html_output = mjml.mjml_to_html(mjml_content)
        if isinstance(html_output, dict):
            return html_output.get('html', '')
        return html_output
    except ImportError:
        pass
    
    # Try MJML CLI
    try:
        # Create temp files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.mjml', delete=False, encoding='utf-8') as temp_mjml:
            temp_mjml.write(mjml_content)
            temp_mjml_path = temp_mjml.name
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as temp_html:
            temp_html_path = temp_html.name
        
        # Run MJML CLI with shell=True for Windows PATH resolution
        result = subprocess.run(
            f'mjml "{temp_mjml_path}" -o "{temp_html_path}"',
            capture_output=True,
            text=True,
            shell=True
        )
        
        if result.returncode == 0:
            with open(temp_html_path, 'r', encoding='utf-8') as f:
                html_output = f.read()
            
            # Clean up temp files
            Path(temp_mjml_path).unlink()
            Path(temp_html_path).unlink()
            
            return html_output
        else:
            print(f"Warning: MJML CLI error: {result.stderr}")
    except FileNotFoundError as e:
        print(f"Warning: MJML CLI not found in PATH: {e}")
    except Exception as e:
        print(f"Warning: MJML CLI error: {e}")
    
    # Fallback: return processed MJML (not compiled)
    print("Warning: MJML compiler not found. Returning processed MJML without compilation.")
    print("Tip: Install MJML: 'pip install mjml' or 'npm install -g mjml'")
    return mjml_content


def load_file(filepath):
    """Load file content"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()


def load_payload(filepath):
    """Load JSON payload"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_file(content, filepath):
    """Save content to file"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def main():
    """Main execution"""
    if len(sys.argv) < 3:
        print("Usage: python render_mjml_ampscript.py <template.mjml> <payload.json> [output.html]")
        print("\nExample:")
        print("  python render_mjml_ampscript.py email.mjml payload.json output.html")
        print("\nRequirements:")
        print("  pip install mjml")
        print("  OR")
        print("  npm install -g mjml")
        sys.exit(1)
    
    template_file = sys.argv[1]
    payload_file = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else 'rendered_output.html'
    
    # Validate files
    if not Path(template_file).exists():
        print(f"Error: Template file '{template_file}' not found!")
        sys.exit(1)
    
    if not Path(payload_file).exists():
        print(f"Error: Payload file '{payload_file}' not found!")
        sys.exit(1)
    
    print("=" * 60)
    print("MJML+AMPscript Renderer")
    print("=" * 60)
    
    # Load files
    print(f"\nLoading MJML template: {template_file}")
    mjml_content = load_file(template_file)
    
    print(f"Loading payload: {payload_file}")
    payload_data = load_payload(payload_file)
    
    print(f"\nPayload contains {len(payload_data)} attributes")
    
    # Step 1: Process AMPscript
    print("\nStep 1: Processing AMPscript...")
    processor = AMPScriptProcessor(payload_data)
    processed_mjml = processor.process(mjml_content)
    print(f"   Processed {len(processor.variables)} variables")
    
    # Step 2: Compile MJML to HTML
    print("\nStep 2: Compiling MJML to HTML...")
    html_output = compile_mjml_to_html(processed_mjml)
    
    # Save output
    print(f"\nSaving to: {output_file}")
    save_file(html_output, output_file)
    
    print(f"\nSuccess! Rendered HTML saved to '{output_file}'")
    print(f"Template size: {len(mjml_content)} bytes -> Output size: {len(html_output)} bytes")
    print("\nTip: Open the output file in a browser to view the rendered email.")


if __name__ == "__main__":
    main()
