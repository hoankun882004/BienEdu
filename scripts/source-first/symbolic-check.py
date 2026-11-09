"""Small non-evaluating LaTeX grammar for supported checks, not general OCR/CAS input."""
import json
import sys
import re
import sympy as s
from sympy.calculus.util import continuous_domain

X = s.Symbol("x", real=True)

class Unsupported(ValueError):
    pass

class Parser:
    def __init__(self, text):
        if not isinstance(text, str) or len(text) > 4096:
            raise Unsupported("Expression length/type unsupported")
        self.text = re.sub(r"\s+", "", text)
        self.i = 0
        self.nodes = 0
        self.denominators = []
    def take(self, value):
        if self.text.startswith(value, self.i):
            self.i += len(value)
            return True
        return False
    def group(self, depth):
        if not self.take("{"):
            raise Unsupported("Expected balanced braced argument")
        value = self.add(depth + 1)
        if not self.take("}"):
            raise Unsupported("Unclosed argument")
        return value
    def atom(self, depth):
        self.nodes += 1
        if depth > 32 or self.nodes > 256:
            raise Unsupported("Expression complexity unsupported")
        if self.take("-"):
            return -self.atom(depth + 1)
        if self.take("+"):
            return self.atom(depth + 1)
        if self.take(r"\frac"):
            numerator, denominator = self.group(depth), self.group(depth)
            self.denominators.append(denominator)
            value = s.Mul(numerator, s.Pow(denominator, -1, evaluate=False), evaluate=False)
        elif self.take(r"\sqrt"):
            value = s.Pow(self.group(depth), s.Rational(1, 2), evaluate=False)
        elif self.take("("):
            value = self.add(depth + 1)
            if not self.take(")"):
                raise Unsupported("Unclosed parenthesis")
        elif self.take("{"):
            value = self.add(depth + 1)
            if not self.take("}"):
                raise Unsupported("Unclosed group")
        elif self.take("x"):
            value = X
        else:
            match = re.match(r"\d{1,8}", self.text[self.i:])
            if not match:
                raise Unsupported("Unsupported token at offset " + str(self.i))
            self.i += len(match[0])
            value = s.Integer(match[0])
        if self.take("^"):
            exponent = self.group(depth) if self.text[self.i:self.i+1] == "{" else self.atom(depth + 1)
            if not exponent.is_Rational or abs(exponent) > 32:
                raise Unsupported("Only small rational powers supported")
            value = s.Pow(value, exponent, evaluate=False)
        return value
    def product(self, depth):
        value = self.atom(depth)
        while self.i < len(self.text):
            if self.take("*") or self.take(r"\cdot"):
                value = s.Mul(value, self.atom(depth), evaluate=False)
            elif self.take("/"):
                denominator = self.atom(depth)
                self.denominators.append(denominator)
                value = s.Mul(value, s.Pow(denominator, -1, evaluate=False), evaluate=False)
            elif self.text[self.i] in "x({" or self.text.startswith((r"\frac", r"\sqrt"), self.i):
                value = s.Mul(value, self.atom(depth), evaluate=False)
            else:
                break
        return value
    def add(self, depth=0):
        value = self.product(depth)
        while self.i < len(self.text):
            if self.take("+"):
                value = s.Add(value, self.product(depth), evaluate=False)
            elif self.take("-"):
                value = s.Add(value, -self.product(depth), evaluate=False)
            else:
                break
        return value
    def parse(self):
        value = self.add()
        if self.i != len(self.text):
            raise Unsupported("Unsupported trailing input")
        return value
    def domain(self, expression):
        result = continuous_domain(expression, X, s.S.Reals)
        for denominator in self.denominators:
            result = result - s.solveset(denominator, X, domain=s.S.Reals)
        return result

def declared_domain(text):
    if text == r"x\ne\pm1":
        return s.S.Reals - s.FiniteSet(-1, 1)
    if text == "[-2;2]":
        return s.Interval(-2, 2)
    if text == "-2<x<2":
        return s.Interval.open(-2, 2)
    if text == "real":
        return s.S.Reals
    raise Unsupported("Unsupported/absent explicit domain")

def check(job):
    result = {"id": job.get("id"), "status": "unsupported", "humanApproval": False}
    try:
        first, second = Parser(job["expression"]), Parser(job["expected"])
        expression, expected = first.parse(), second.parse()
        kind = job.get("kind")
        if kind == "derivative":
            actual = s.diff(expression, X)
            actual_domain = continuous_domain(actual, X, s.S.Reals)
            function_domain, expected_domain = first.domain(expression), second.domain(expected)
            domains_match = function_domain == declared_domain(job["functionDomain"]) and actual_domain == expected_domain == declared_domain(job["derivativeDomain"])
        elif kind == "equivalent":
            actual = expression
            function_domain, expected_domain = first.domain(expression), second.domain(expected)
            actual_domain = function_domain
            domains_match = function_domain == expected_domain == declared_domain(job["domain"])
        elif kind == "antiderivative":
            actual, expected = s.diff(expected, X), expression
            function_domain = first.domain(expression)
            actual_domain = continuous_domain(actual, X, s.S.Reals)
            expected_domain = function_domain
            domains_match = function_domain == actual_domain == declared_domain(job["domain"])
        else:
            raise Unsupported("Unsupported operation")
        difference = s.simplify(actual - expected)
        value_match = True
        if job.get("valueAt") is not None:
            argument, value = s.Integer(job["valueAt"]), Parser(job["value"]).parse()
            value_match = argument in actual_domain and s.simplify(actual.subs(X, argument) - value) == 0
        result.update(status="passed" if difference == 0 and domains_match and value_match else "conflict", difference=str(difference),
                      functionDomain=str(function_domain), derivativeOrResultDomain=str(actual_domain), expectedDomain=str(expected_domain),
                      domainsMatch=bool(domains_match), valueMatch=bool(value_match), symbolicIdentity=difference == 0)
    except (Unsupported, KeyError, NotImplementedError, ValueError, TypeError) as error:
        result["reason"] = str(error)
    return result

if __name__ == "__main__":
    payload = json.load(sys.stdin)
    if not isinstance(payload.get("jobs"), list) or len(payload["jobs"]) > 64:
        raise SystemExit("Invalid symbolic job batch")
    print(json.dumps({"engine": "sympy", "version": s.__version__, "checks": [check(job) for job in payload["jobs"]],
                      "limitation": "Supported symbolic identities/domains only; no OCR or human source/editorial approval."}, ensure_ascii=False))
