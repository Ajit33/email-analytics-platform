// common/sanitize.util.ts
import { BadRequestException } from '@nestjs/common';

export function sanitizeUserAgent(
  input?: string,
): string {
  if (!input) return 'unknown';
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 512);
}

export function sanitizeIp(
  input?: string,
): string {
  if (!input) return '0.0.0.0';
  return (
    input
      .replace(/[^a-fA-F0-9:.\-]/g, '')
      .slice(0, 64) || '0.0.0.0'
  );
}

export function sanitizeAndValidateUrl(
  input: string,
): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BadRequestException(
      `Invalid URL: ${input}`,
    );
  }

  if (
    url.protocol !== 'http:' &&
    url.protocol !== 'https:'
  ) {
    throw new BadRequestException(
      'Only http/https URLs are supported',
    );
  }

  return url.toString();
}
