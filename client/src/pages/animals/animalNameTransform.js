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

export function containsCyrillic(value) {
  return /[\u0400-\u04FF]/.test(normalizeText(value));
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

  return {
    name: normalizedValue,
    displayName: normalizedValue,
    sourceScript: /[A-Za-z]/.test(normalizedValue) ? 'latin' : 'unknown',
  };
}

export function getAnimalFormNameValue(animal) {
  return normalizeText(animal?.displayName) || normalizeText(animal?.name);
}
