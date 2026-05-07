function normalizeText(value) {
  return String(value ?? '').trim();
}

function hasLetterCase(value) {
  return value.toLowerCase() !== value.toUpperCase();
}

function isUppercaseToken(value) {
  return hasLetterCase(value) && value === value.toUpperCase();
}

function isCapitalizedToken(value) {
  return hasLetterCase(value) && value[0] === value[0].toUpperCase();
}

function applyCapitalizedCase(value) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function applyMappedCase(sourceToken, mappedValue) {
  if (!mappedValue) {
    return mappedValue;
  }

  if (isUppercaseToken(sourceToken)) {
    return mappedValue.toUpperCase();
  }

  if (isCapitalizedToken(sourceToken)) {
    return applyCapitalizedCase(mappedValue);
  }

  return mappedValue;
}

const CYRILLIC_TO_LATIN_MAP = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sht',
  ъ: 'a',
  ь: 'y',
  ю: 'yu',
  я: 'ya',
};

const LATIN_TO_CYRILLIC_MULTI_CHAR_MAP = [
  ['sht', 'щ'],
  ['sch', 'щ'],
  ['sh', 'ш'],
  ['ch', 'ч'],
  ['ts', 'ц'],
  ['zh', 'ж'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['yo', 'ьо'],
  ['iu', 'ю'],
  ['ia', 'я'],
  ['kh', 'х'],
];

const LATIN_TO_CYRILLIC_SINGLE_CHAR_MAP = {
  a: 'а',
  b: 'б',
  c: 'к',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'дж',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'у',
  x: 'кс',
  y: 'и',
  z: 'з',
};

export function containsCyrillic(value) {
  return /[\u0400-\u04FF]/.test(normalizeText(value));
}

export function containsLatin(value) {
  return /[A-Za-z]/.test(normalizeText(value));
}

export function transliterateToLatin(value) {
  return normalizeText(value)
    .split('')
    .map((character) => {
      const mappedValue = CYRILLIC_TO_LATIN_MAP[character.toLowerCase()];
      return mappedValue ? applyMappedCase(character, mappedValue) : character;
    })
    .join('');
}

export function transliterateToCyrillic(value) {
  const sourceValue = normalizeText(value);
  let result = '';
  let index = 0;

  while (index < sourceValue.length) {
    const nextSlice = sourceValue.slice(index);
    const nextSliceLower = nextSlice.toLowerCase();
    let hasMatch = false;

    for (const [latinToken, cyrillicToken] of LATIN_TO_CYRILLIC_MULTI_CHAR_MAP) {
      if (nextSliceLower.startsWith(latinToken)) {
        const sourceToken = sourceValue.slice(index, index + latinToken.length);
        result += applyMappedCase(sourceToken, cyrillicToken);
        index += latinToken.length;
        hasMatch = true;
        break;
      }
    }

    if (hasMatch) {
      continue;
    }

    const character = sourceValue[index];
    const mappedCharacter = LATIN_TO_CYRILLIC_SINGLE_CHAR_MAP[character.toLowerCase()];
    result += mappedCharacter ? applyMappedCase(character, mappedCharacter) : character;
    index += 1;
  }

  return result;
}

export function buildAnimalStoredNames(inputValue) {
  const normalizedValue = normalizeText(inputValue);

  if (!normalizedValue) {
    return {
      name: '',
      displayName: '',
      sourceScript: 'unknown',
    };
  }

  if (containsCyrillic(normalizedValue)) {
    return {
      name: transliterateToLatin(normalizedValue),
      displayName: normalizedValue,
      sourceScript: 'cyrillic',
    };
  }

  if (containsLatin(normalizedValue)) {
    return {
      name: normalizedValue,
      displayName: transliterateToCyrillic(normalizedValue),
      sourceScript: 'latin',
    };
  }

  return {
    name: normalizedValue,
    displayName: normalizedValue,
    sourceScript: 'unknown',
  };
}

export function getAnimalFormNameValue(animal) {
  return normalizeText(animal?.displayName) || normalizeText(animal?.name);
}
