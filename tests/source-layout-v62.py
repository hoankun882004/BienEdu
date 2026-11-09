"""Synthetic geometry fixtures are technical tests, not sourced lesson data."""
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('layout',Path(__file__).parents[1]/'scripts/source-first/layout-v62.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def g(c,x,y=100,size=11,font='CMR10',width=5):
    return {'c':c,'x':x,'right':x+width,'y':y,'size':size,'font':font,'page':1}

def formula(chars,bars=()):
    nodes,errors=m.convert([chars],bars)
    if errors:raise ValueError(';'.join(errors))
    return ''.join(n.get('latex',n.get('value','')) for n in nodes['segments']).strip()

class LayoutTests(unittest.TestCase):
    def test_fraction(self):
        self.assertEqual(formula([g('1',2,95,8),g('2',2,103,8)],[(0,9,97)]),r'\frac{1}{2}')
    def test_polynomial_denominator(self):
        self.assertEqual(formula([g('1',7,95,8),g('x',0,103,8),g('+',5,103,8),g('1',10,103,8)],[(0,15,97)]),r'\frac{1}{x+1}')
    def test_adjacent_fractions(self):
        self.assertEqual(formula([g('1',2,95,8),g('2',2,103,8),g('+',13,99.7),g('3',22,95,8),g('4',22,103,8)],[(0,9,97),(20,29,97)]),r'\frac{1}{2}+\frac{3}{4}')
    def test_negative_fraction(self):
        self.assertEqual(formula([g('-',0,99.7),g('1',12,95,8),g('2',12,103,8)],[(10,19,97)]),r'-\frac{1}{2}')
    def test_nested_fraction(self):
        # Numerator 1/2 above the outer bar, denominator 3 beneath it.
        self.assertEqual(formula([g('1',5,85,6),g('2',5,92,6),g('3',5,103,8)],[(3,12,87),(0,17,97)]),r'\frac{\frac{1}{2}}{3}')
    def test_radical_scope(self):
        self.assertEqual(formula([g('√',0,90,11,'CMSY10',9),g('a',9,98),g('+',16,98),g('b',22,98)],[(9,14,89.8)]),r'\sqrt{a}+b')
    def test_extended_radical(self):
        self.assertEqual(formula([g('√',0,90,11,'CMSY10',9),g('a',9,98),g('+',14,98),g('b',19,98)],[(9,24,89.8)]),r'\sqrt{a+b}')
    def test_nested_radical(self):
        self.assertEqual(formula([g('√',0,85,11,'CMSY10',9),g('√',10,90,11,'CMSY10',9),g('a',19,98)],[(19,24,89.8),(9,24,84.8)]),r'\sqrt{\sqrt{a}}')
    def test_fraction_in_radical(self):
        self.assertEqual(formula([g('√',0,83,11,'CMSY10',9),g('1',11,88,8),g('2',11,96,8)],[(9,18,90),(9,18,82.8)]),r'\sqrt{\frac{1}{2}}')
    def test_nested_exponent(self):
        self.assertEqual(formula([g('a',0),g('2',5,95,8),g('n',10,91,6)]),r'a^{2^{n}}')
    def test_indexed_sequence(self):
        self.assertEqual(formula([g('u',0),g('n',5,102,8),g('+',10,102,8),g('1',15,102,8)]),r'u_{n+1}')
    def test_negative_exponent(self):
        self.assertEqual(formula([g('a',0),g('-',5,95,8),g('n',10,95,8)]),r'a^{-n}')
    def test_fraction_inside_exponent(self):
        self.assertEqual(formula([g('a',0),g('2',7,88,6),g('3',7,94,6)],[(5,14,90)]),r'a^{\frac{2}{3}}')
    def test_higher_root(self):
        self.assertEqual(formula([g('3',2,88,6),g('√',4,90,11,'CMSY10',9),g('a',13,98)],[(13,18,89.8)]),r'\sqrt[3]{a}')
    def test_negation_overlay(self):
        self.assertEqual(formula([g('a',0),g('̸',6),g('=',6),g('b',12)]),r'a\ne b')
    def test_vector_accent(self):
        self.assertEqual(formula([g('−',0,92,11,'CMSY10',8),g('−',3,92,11,'CMSY10',8),g('→',6,92,11,'CMSY10',11),g('A',0,100,11,'CMMI10',8),g('B',8,100,11,'CMMI10',8)]),r'\overrightarrow{AB}')
    def test_display_integral_source_baseline(self):
        self.assertEqual(formula([g('∫',0,85,11,'CMEX10',12),g('7',14,100),g('d',20,100),g('x',25,100)]),r'\int 7dx')
    def test_integral_with_fraction_integrand(self):
        self.assertEqual(formula([g('∫',0,85,11,'CMEX10',12),g('1',16,95,8),g('2',16,103,8)],[(14,23,97)]),r'\int \frac{1}{2}')
    def test_display_fraction_size(self):
        self.assertEqual(formula([g('1',10,92),g('2',10,107),g('+',21,99.75),g('x',28,99.75)],[(8,17,97)]),r'\frac{1}{2}+x')
    def test_fraction_numerator_keeps_its_exponent(self):
        self.assertEqual(formula([g('x',2,92),g('2',7,88,8),g('3',7,107)],[(0,14,97)]),r'\frac{x^{2}}{3}')
    def test_control_word_variable_boundary(self):
        self.assertEqual(formula([g('∫',0,85,11,'CMEX10',12),g('P',14,100)]),r'\int P')
    def test_partial_fraction_edge_rejected(self):
        with self.assertRaises(ValueError):formula([g('1',2,95,8),g('2',2,103,8),g('x',7,96,8,width=6)],[(0,9,97)])
    def test_dot_and_cross(self):
        self.assertEqual(formula([g('a',0),g('·',5),g('b',10)]),r'a\cdot b')
        self.assertEqual(formula([g('a',0),g('×',5),g('b',10)]),r'a\times b')
    def test_multiline_preserved(self):
        self.assertEqual(formula([g('x',0),g('=',5),g('1',10),g('x',0,115),g('+',5,115),g('1',10,115)]),'x=1\nx+1')
    def test_ambiguous_fraction_rejected(self):
        with self.assertRaises(ValueError):formula([g('1',2,95,8)],[(0,9,97)])
    def test_missing_glyph_rejected(self):
        with self.assertRaises(ValueError):formula([g('\ufffd',0)])
    def test_unbound_root_rejected(self):
        with self.assertRaises(ValueError):formula([g('√',0),g('a',9)])
    def test_unresolved_matrix_rejected(self):
        with self.assertRaises(ValueError):formula([g('{',0,100,11,'CMEX10'),g('x',10),g('y',10,115)])
    def test_overlay_not_independent_rows(self):
        with self.assertRaises(ValueError):formula([g('a',0),g('b',0,107)])
    def test_vietnamese_word_gaps(self):
        self.assertEqual(formula([g('V',0,font='DejaVuSerif'),g('í',5,font='DejaVuSerif'),g('d',14,font='DejaVuSerif')]),'Ví d')

if __name__=='__main__':unittest.main()
