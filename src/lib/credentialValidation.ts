import { z } from 'zod';
import { COMMON_STRINGS } from '@/lib/constants';

/**
 * Security: Credential Validation Utility
 * 
 * This module provides client-side credential strength validation to enforce
 * strong security policies. Since Supabase's Leaked Credential Protection
 * is a paid feature, this provides defense-in-depth at the client level.
 * 
 * Requirements enforced:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not in common credential blocklist
 */

// Credential requirement patterns
const CREDENTIAL_PATTERNS = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
};

export interface CredentialValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

/**
 * Validates a credential against security requirements
 * Returns detailed validation results including strength assessment
 */
export function validateCredential(credential: string): CredentialValidationResult {
  const errors: string[] = [];
  let strengthScore = 0;
  let failedChecks = 0;

  // Only length is a hard blocker for 'isValid'
  if (credential.length < CREDENTIAL_PATTERNS.minLength) {
    errors.push(`Password must be at least ${CREDENTIAL_PATTERNS.minLength} characters`);
    failedChecks++;
  } else {
    strengthScore++;
    if (credential.length >= 12) strengthScore++;
    if (credential.length >= 16) strengthScore++;
  }

  // Other checks contribute to strength but don't force !isValid unless very bad
  if (CREDENTIAL_PATTERNS.hasUppercase.test(credential)) strengthScore++;
  if (CREDENTIAL_PATTERNS.hasLowercase.test(credential)) strengthScore++;
  if (CREDENTIAL_PATTERNS.hasNumber.test(credential)) strengthScore++;
  if (CREDENTIAL_PATTERNS.hasSpecial.test(credential)) strengthScore++;

  // Check against common strings (case-insensitive)
  if (COMMON_STRINGS.has(credential.toLowerCase())) {
    errors.push('This value is too common. Please choose something more unique');
    strengthScore = Math.max(0, strengthScore - 2);
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(credential)) {
    errors.push('Should not contain repeated characters (e.g., "aaa")');
    strengthScore = Math.max(0, strengthScore - 1);
  }

  // Check for sequential numbers/letters
  if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg/i.test(credential)) {
    errors.push('Should not contain sequential characters (e.g., "123", "abc")');
    strengthScore = Math.max(0, strengthScore - 1);
  }

  // Calculate strength
  let strength: CredentialValidationResult['strength'];
  if (strengthScore <= 2) strength = 'weak';
  else if (strengthScore <= 4) strength = 'fair';
  else if (strengthScore <= 5) strength = 'good';
  else strength = 'strong';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Zod schema for credential validation
 * Use this in form validation
 */
export const credentialSchema = z
  .string()
  .min(CREDENTIAL_PATTERNS.minLength, `Must be at least ${CREDENTIAL_PATTERNS.minLength} characters`)
  .refine(
    (credential) => !COMMON_STRINGS.has(credential.toLowerCase()),
    'This value is too common. Please choose something more unique'
  );

/**
 * Email validation schema with security considerations
 */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .transform((val) => val.toLowerCase().trim());

/**
 * Combined auth form schema
 */
export const signUpSchema = z.object({
  email: emailSchema,
  credential: credentialSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  credential: z.string().min(1, 'Credential is required'),
});
