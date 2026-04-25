const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '',
  '-': '⁻',
};

const toSuperscript = (value: string) =>
  value
    .split('')
    .map((character) => SUPERSCRIPT_MAP[character] ?? character)
    .join('');

export const formatScientificWithSuperscript = (
  value: number,
  fractionDigits = 2,
) => {
  if (!Number.isFinite(value)) return '--';

  const [coefficient, rawExponent] = value.toExponential(fractionDigits).split('e');
  const exponent = Number.parseInt(rawExponent ?? '0', 10);
  if (!Number.isFinite(exponent)) return coefficient;

  return `${coefficient}\u00A0×\u00A010${toSuperscript(String(exponent))}`;
};
