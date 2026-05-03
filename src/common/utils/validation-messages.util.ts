import { ValidationError } from '@nestjs/common';

type MessageBuilder = (field: string, defaultMsg: string) => string;

function extractNumber(msg: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = pattern.exec(msg);
    if (match) return Number(match[1]);
  }
  return null;
}

const CONSTRAINT_MESSAGES: Record<string, MessageBuilder> = {
  isNotEmpty: (field) => `${field} boş olamaz`,
  isString: (field) => `${field} metin tipinde olmalı`,
  isInt: (field) => `${field} tam sayı olmalı`,
  isBoolean: (field) => `${field} doğru/yanlış değeri olmalı`,
  isArray: (field) => `${field} dizi tipinde olmalı`,
  isEmail: (field) => `${field} geçerli bir email adresi olmalı`,
  isDateString: (field) => `${field} geçerli bir tarih (ISO 8601) olmalı`,
  isEnum: (field, defaultMsg) => {
    const match = /must be one of the following values: (.+)$/.exec(defaultMsg);
    return match
      ? `${field} şu değerlerden biri olmalı: ${match[1]}`
      : `${field} geçerli bir değer olmalı`;
  },
  minLength: (field, defaultMsg) => {
    const min = extractNumber(defaultMsg, [
      /must be longer than or equal to (\d+)/,
    ]);
    return min !== null
      ? `${field} en az ${min} karakter olmalı`
      : `${field} çok kısa`;
  },
  maxLength: (field, defaultMsg) => {
    const max = extractNumber(defaultMsg, [
      /must be shorter than or equal to (\d+)/,
    ]);
    return max !== null
      ? `${field} en fazla ${max} karakter olmalı`
      : `${field} çok uzun`;
  },
  min: (field, defaultMsg) => {
    const min = extractNumber(defaultMsg, [/must not be less than (\d+)/]);
    return min !== null ? `${field} en az ${min} olmalı` : `${field} çok küçük`;
  },
  max: (field, defaultMsg) => {
    const max = extractNumber(defaultMsg, [/must not be greater than (\d+)/]);
    return max !== null
      ? `${field} en fazla ${max} olmalı`
      : `${field} çok büyük`;
  },
  whitelistValidation: (field) => `${field} izin verilmeyen bir alan`,
  nestedValidation: (field) => `${field} alanında doğrulama hatası`,
};

function formatOne(error: ValidationError, parentPath: string): string[] {
  const path = parentPath ? `${parentPath}.${error.property}` : error.property;
  const messages: string[] = [];

  if (error.constraints) {
    for (const [key, defaultMsg] of Object.entries(error.constraints)) {
      const builder = CONSTRAINT_MESSAGES[key];
      messages.push(
        builder
          ? builder(path, defaultMsg)
          : (defaultMsg ?? `${path} geçersiz`),
      );
    }
  }

  if (error.children?.length) {
    for (const child of error.children) {
      messages.push(...formatOne(child, path));
    }
  }

  return messages;
}

export function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    messages.push(...formatOne(error, ''));
  }
  return messages;
}
