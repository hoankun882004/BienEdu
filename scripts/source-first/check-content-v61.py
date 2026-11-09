"""Exact numeric checks only. Unsupported symbolic claims are not 'verified'."""
import ast
import json
import re
import sys
import sympy as s


def arithmetic(source):
    if len(source) > 250 or not re.fullmatch(r'[0-9+*/().{}^\s-]+', source):
        raise ValueError('Outside bounded numeric grammar')
    tree = ast.parse(source.replace('^', '**').replace('{', '(').replace('}', ')'), mode='eval')

    def visit(node, depth=0):
        if depth > 30:
            raise ValueError('Depth limit')
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            if abs(node.value) > 10**9:
                raise ValueError('Numeric bound')
            return s.Rational(str(node.value))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            return (-1 if isinstance(node.op, ast.USub) else 1) * visit(node.operand, depth + 1)
        if isinstance(node, ast.BinOp):
            a, b = visit(node.left, depth + 1), visit(node.right, depth + 1)
            if isinstance(node.op, ast.Add):
                return a + b
            if isinstance(node.op, ast.Sub):
                return a - b
            if isinstance(node.op, ast.Mult):
                return a * b
            if isinstance(node.op, ast.Div) and b != 0:
                return a / b
            if isinstance(node.op, ast.Pow) and b.is_integer and abs(b) <= 32 and not (a == 0 and b < 0):
                return a**b
        raise ValueError('Unsupported AST')

    return visit(tree.body)


if __name__ == '__main__':
    checks, unsupported = [], 0
    for row in json.load(sys.stdin):
        latex = row['latex'].replace(r'\times ', '*').replace(r'\cdot ', '*')
        terms = latex.split('=')
        if len(terms) < 2:
            continue
        for i in range(len(terms) - 1):
            try:
                left, right = arithmetic(terms[i]), arithmetic(terms[i + 1])
                checks.append({'id': row['id'], 'latex': row['latex'], 'pair': i, 'passed': left == right,
                               'left': str(left), 'right': str(right), 'scope': 'numeric equality only'})
            except (ValueError, SyntaxError, TypeError, ZeroDivisionError):
                unsupported += 1
    print(json.dumps({'engine': 'sympy', 'version': s.__version__, 'checks': checks,
                      'unsupportedPairs': unsupported, 'humanApproval': False}))
