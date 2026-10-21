#!/usr/bin/env python3
"""
HTML+AMPscript Direct Renderer
============================

This script processes HTML templates containing AMPscript directly,
without converting to MJML first. It allows direct comparison with
the MJML+AMPscript rendering workflow.

Usage:
    python html_ampscript_renderer.py <template.html> <payload.json> [output.html]

Features:
    - Direct AMPscript processing in HTML templates
    - Same AMPscript processor as MJML renderer
    - CSS inlining for email compatibility
    - Comparison with MJML workflow results

Author: AI Assistant
Date: October 2025
"""

import json
import re
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# Try to import css_inline for CSS processing
try:
    import css_inline
    CSS_INLINE_AVAILABLE = True
except ImportError:
    CSS_INLINE_AVAILABLE = False

class HTMLAMPScriptProcessor:
    """Process AMPscript in HTML templates directly"""
    
    def __init__(self, data=None):
        self.data = data or {}
        self.variables = {}
        self.functions = self._register_functions()
    
    def process(self, html_content):
        """Process HTML content with AMPscript"""
        print("Step 1: Processing AMPscript in HTML...")
        
        # First, initialize variables from payload data (for AMPscript access)
        for key, value in self.data.items():
            self.variables[f'@{key}'] = value
        
        # Process AMPscript blocks first
        html_content = self._process_ampscript_blocks(html_content)
        
        print(f"Processed {len(self.variables)} AMPscript variables")
        
        # Replace variable references
        html_content = self._replace_variable_references(html_content)
        
        # Replace inline expressions
        html_content = self._replace_inline_expressions(html_content)
        
        # Replace mustache-style variables {{variable}}
        print("Step 2: Replacing mustache-style variables...")
        html_content = self._replace_mustache_variables(html_content)
        
        # Replace system variables
        html_content = self._replace_system_vars(html_content)
        
        print("Step 3: Inlining CSS...")
        
        # Inline CSS for email compatibility
        if CSS_INLINE_AVAILABLE:
            try:
                html_content = css_inline.inline(html_content)
                print("CSS inlined successfully")
            except Exception as e:
                print(f"CSS inlining warning: {e}")
        else:
            print("CSS inlining skipped (css_inline not available)")
            print("Install with: pip install css_inline")
        
        return html_content
    
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
            
            elif block_upper == 'ELSE':
                if condition_stack:
                    # Execute ELSE only if no previous conditions were true
                    skip_content = condition_stack[-1]['executed']
                    if not skip_content:
                        condition_stack[-1]['executed'] = True
            
            elif block_upper == 'ENDIF':
                if condition_stack:
                    condition_stack.pop()
                    skip_content = len(condition_stack) > 0 and not condition_stack[-1]['executed']
            
            elif block_upper.startswith('THEN'):
                # THEN is just a keyword after IF, ignore it
                pass
            
            else:
                # Other AMPscript statements (VAR, SET, etc.)
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
            self._process_set_statement(code)
    
    def _process_set_statement(self, stmt):
        """Process SET @var = value statements"""
        match = re.match(r'SET\s+(@\w+)\s*=\s*(.+)', stmt, re.IGNORECASE)
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
                
                try:
                    result = op_func(left, right)
                    return result
                except Exception as e:
                    print(f"Condition evaluation error: {e}")
                    return False
        
        value = self._evaluate_expression(condition)
        return bool(value)
    
    def _numeric_compare(self, a, b, op):
        """Compare two values numerically if possible, otherwise as strings"""
        try:
            return op(float(a), float(b))
        except (ValueError, TypeError):
            return op(str(a), str(b))
    
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
            try:
                return self.functions[func_name](*args)
            except Exception as e:
                print(f"Function error {func_name}: {e}")
                return ''
        
        return expr
    
    def _evaluate_arithmetic(self, expr):
        """Evaluate arithmetic expressions"""
        try:
            # Simple arithmetic evaluation
            expr = str(expr)
            for var_name, var_value in self.variables.items():
                if var_name in expr:
                    expr = expr.replace(var_name, str(var_value or 0))
            
            return eval(expr)
        except:
            return expr
    
    def _replace_variable_references(self, content):
        """Replace %%=v(@variable)=%% with variable values"""
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
    
    def _replace_mustache_variables(self, content):
        """Replace {{variable}} with values from payload data"""
        def replace_var(match):
            var_name = match.group(1)
            # Try to get from data directly
            value = self.data.get(var_name, '')
            # If not found, try with @ prefix in variables
            if value == '' and f'@{var_name}' in self.variables:
                value = self.variables[f'@{var_name}']
            return str(value) if value is not None else ''
        
        content = re.sub(r'\{\{(\w+)\}\}', replace_var, content)
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
    
    # AMPscript-like functions (same as in mjml_renderer.py)
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
        start = int(start) - 1  # AMPscript is 1-indexed
        if length is None:
            return text[start:]
        return text[start:start + int(length)]
    
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


def show_usage():
    print("Usage: python html_ampscript_renderer.py <template.html> <payload.json> [output.html]")
    print("\nExample:")
    print("  python html_ampscript_renderer.py complex_template.html sample_payload.json rendered.html")
    print("\nDescription:")
    print("  Renders HTML+AMPscript templates directly (without MJML conversion)")
    print("  Useful for comparing results with MJML+AMPscript workflow")


def main():
    if len(sys.argv) < 3:
        show_usage()
        return 1
    
    template_file = sys.argv[1]
    payload_file = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else 'rendered_output.html'
    
    # Check if files exist
    if not os.path.exists(template_file):
        print(f"Error: Template file '{template_file}' not found!")
        return 1
    
    if not os.path.exists(payload_file):
        print(f"ERROR: Payload file '{payload_file}' not found!")
        return 1
    
    print("=" * 60)
    print("HTML+AMPscript Direct Renderer")
    print("=" * 60)
    
    # Load template
    print(f"\nLoading HTML template: {template_file}")
    with open(template_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Load payload
    print(f"Loading payload: {payload_file}")
    with open(payload_file, 'r', encoding='utf-8') as f:
        payload_data = json.load(f)
    
    print(f"\nPayload contains {len(payload_data)} attributes")
    
    # Process template
    processor = HTMLAMPScriptProcessor(payload_data)
    rendered_html = processor.process(html_content)
    
    # Save output
    print(f"\nSaving to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(rendered_html)
    
    print(f"\nSuccess! Rendered HTML saved to '{output_file}'")
    print(f"Template size: {len(html_content)} bytes → Output size: {len(rendered_html)} bytes")
    
    # Show comparison hint
    print(f"\nCompare with MJML workflow:")
    print(f"   1. python modifide_html_ampscript_mjml.py {template_file} temp.mjml")
    print(f"   2. python mjml_renderer.py temp.mjml {payload_file} mjml_output.html")
    print(f"   3. Compare {output_file} vs mjml_output.html")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())