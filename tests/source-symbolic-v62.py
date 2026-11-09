import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('checker',Path(__file__).parents[1]/'scripts/source-first/check-content-v62.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class SymbolicTests(unittest.TestCase):
    def check(self,latex):return m.run([{'id':'technical-fixture','latex':latex}])['checks']
    def test_fraction(self):self.assertEqual(self.check(r'\frac{1}{2}+\frac{1}{3}=\frac{5}{6}')[0]['status'],'passed')
    def test_nested_fraction(self):self.assertEqual(self.check(r'\frac{\frac{1}{2}}{3}=\frac{1}{6}')[0]['status'],'passed')
    def test_root(self):self.assertEqual(self.check(r'\sqrt{25}=5')[0]['status'],'passed')
    def test_polynomial(self):self.assertEqual(self.check(r'(x+1)^2=x^2+2x+1')[0]['status'],'passed')
    def test_equation_not_identity(self):self.assertEqual(self.check('2x=2')[0]['status'],'equation-context')
    def test_contradiction_not_auto_corrected(self):self.assertEqual(self.check('0=2')[0]['status'],'context-review')
    def test_antiderivative(self):self.assertEqual(self.check(r'\int x^2dx=\frac{x^3}{3}+C')[0]['status'],'passed')
    def test_incorrect_antiderivative_flagged(self):self.assertEqual(self.check(r'\int xdx=x^2+C')[0]['status'],'context-review')
    def test_arbitrary_code_is_not_evaluated(self):self.assertEqual(self.check('__import__("os")=2'),[])
if __name__=='__main__':unittest.main()
