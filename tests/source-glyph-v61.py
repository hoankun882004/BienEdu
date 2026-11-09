import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('adapter', Path(__file__).resolve().parents[1] / 'scripts/source-first/content-v61.py')
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)


def chars(value, font='CMMI10', size=10.9091, y=100, x=0):
    return [{'c': c, 'font': font, 'size': size, 'y': y, 'x': x + i * 6, 'right': x + i * 6 + 5, 'page': 1} for i, c in enumerate(value)]


class SourceGlyphTests(unittest.TestCase):
    def test_subscript(self):
        self.assertEqual(adapter.math(chars('u') + chars('n', size=7.9701, y=101.64, x=6), []), 'u_{n}')

    def test_negative_exponent(self):
        self.assertEqual(adapter.math(chars('2', font='CMR10') + chars('-n', size=7.9701, y=96.0, x=6), []), '2^{-n}')

    def test_dot_and_cross_products_remain_distinct(self):
        self.assertEqual(adapter.math(chars('u·v'), []), r'u\cdot v')
        self.assertEqual(adapter.math(chars('u×v'), []), r'u\times v')

    def test_fraction_bar_is_not_guessed(self):
        with self.assertRaisesRegex(ValueError, 'FRACTION_OR_OVERBAR'):
            adapter.math(chars('a') + chars('b', y=108), [[0, 7, 101]])

    def test_radical_scope_is_not_guessed(self):
        with self.assertRaisesRegex(ValueError, 'NONLINEAR'):
            adapter.math(chars('√x'), [])

    def test_unknown_glyph_not_silently_dropped(self):
        with self.assertRaisesRegex(ValueError, 'UNSUPPORTED_GLYPH'):
            adapter.math(chars('x☃'), [])

    def test_operator_control_word_has_separator(self):
        self.assertEqual(adapter.math(chars('cos', font='CMR10') + chars('x', x=18), []), r'\cos x')

    def test_inferred_pdf_space_does_not_truncate_math(self):
        line = chars('12=8+8', font='CMR10') + chars(' ', font='DejaVuSerif', x=36) + chars('cos', font='CMR10', x=42) + chars('θ', x=60)
        node, errors = adapter.convert([line], [])
        self.assertFalse(errors)
        self.assertEqual([n['latex'] for n in node['segments'] if n['type'] == 'math'], [r'12=8+8\cos \theta'])

    def test_multiple_baselines_blocked(self):
        with self.assertRaisesRegex(ValueError, 'MULTIPLE_MATH_BASELINES'):
            adapter.math(chars('x') + chars('y', y=114, x=6), [])

    def test_vietnamese_word_gap_is_recovered_from_coordinates(self):
        self.assertEqual(adapter.prose(chars('số', font='DejaVuSerif') + chars('hạng', font='DejaVuSerif', x=15)), 'số hạng')


if __name__ == '__main__':
    unittest.main()
