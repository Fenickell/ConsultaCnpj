const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const CEP_PATTERN = /^\d{8}$/;
const CNPJ_PATTERN = /^\d{14}$/;
const PHONE_PATTERN = /^\d{8,11}$/;
const CPF_MASKED_PATTERN = /^\*{3}\d{3,6}\*{2}$/;

export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function formatCnpjInput(value) {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatCep(value) {
  const digits = onlyDigits(value);
  if (!CEP_PATTERN.test(digits)) {
    return String(value ?? '-');
  }

  return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

export function formatCnpj(value) {
  const digits = onlyDigits(value);
  if (!CNPJ_PATTERN.test(digits)) {
    return String(value ?? '-');
  }

  return formatCnpjInput(digits);
}

export function formatPhone(value, ddd = '') {
  const digits = onlyDigits(`${ddd}${value}`);
  if (!PHONE_PATTERN.test(digits)) {
    return String(value ?? '-');
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (digits.length === 8) {
    return digits.replace(/^(\d{4})(\d{4})$/, '$1-$2');
  }

  if (digits.length === 9) {
    return digits.replace(/^(\d{5})(\d{4})$/, '$1-$2');
  }

  return digits;
}

export function formatCurrency(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value ?? '-');
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numeric);
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value ?? '-');
  }

  const options =
    DATE_ONLY_PATTERN.test(String(value))
      ? { dateStyle: 'short' }
      : { dateStyle: 'short', timeStyle: 'short' };

  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}

export function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isFilledValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
}

export function countFilledFields(input) {
  if (Array.isArray(input)) {
    return input.reduce((total, item) => total + countFilledFields(item), 0);
  }

  if (input && typeof input === 'object') {
    return Object.values(input).reduce((total, value) => total + countFilledFields(value), 0);
  }

  return isFilledValue(input) ? 1 : 0;
}

export function formatValueByContext(key, value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Nao';
  }

  if (typeof value === 'number') {
    if (/capital/i.test(key)) {
      return formatCurrency(value);
    }

    return new Intl.NumberFormat('pt-BR').format(value);
  }

  if (typeof value !== 'string') {
    return String(value);
  }

  const loweredKey = key.toLowerCase();
  const trimmed = value.trim();

  if (!trimmed) {
    return '-';
  }

  if (DATE_ONLY_PATTERN.test(trimmed) || DATE_TIME_PATTERN.test(trimmed)) {
    return formatDate(trimmed);
  }

  if (loweredKey.includes('capital')) {
    return formatCurrency(trimmed);
  }

  if (loweredKey.includes('cep')) {
    return formatCep(trimmed);
  }

  if (loweredKey === 'cnpj' || loweredKey.includes('cnpj')) {
    const digits = onlyDigits(trimmed);
    if (digits.length === 14) {
      return formatCnpj(trimmed);
    }
  }

  if (loweredKey.includes('telefone') || loweredKey.includes('fax')) {
    return formatPhone(trimmed);
  }

  if (CPF_MASKED_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}
