import { z } from 'zod';

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

// Common strings blocklist (top 100+ most common)
// This list catches the most frequently used weak choices
const COMMON_STRINGS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'monkey', 'letmein',
  'dragon', 'master', 'login', 'welcome', 'princess', 'admin', 'admin123',
  'sunshine', 'shadow', 'football', 'baseball', 'iloveyou', 'trustno1',
  'superman', 'batman', 'starwars', 'hello', 'freedom', 'whatever',
  'qazwsx', 'michael', 'jennifer', 'hunter', 'amanda', 'jessica', 'joshua',
  'andrew', 'ashley', 'daniel', 'charlie', 'thomas', 'computer', 'internet',
  'server', 'changeme', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'pass1234',
  '1qaz2wsx', 'zaq12wsx', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234qwer',
  'password!', 'password@', 'password#', 'Password1', 'Password1!', 'Password123',
  'qwerty1', 'abc1234', '12345', '123123', '111111', '000000', '654321',
  '7777777', '1q2w3e4r', '123qwe', 'test', 'test123', 'testing', 'guest',
  'root', 'toor', 'secret', 'password0', 'love', 'god', 'sex', 'money',
  'access', 'power', 'killer', 'magic', 'summer', 'winter', 'spring',
  'autumn', 'letmein1', 'welcome1', 'qwerty12', 'abc12345', 'pass', 'passwd',
]);

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

  // Check minimum length
  if (credential.length < CREDENTIAL_PATTERNS.minLength) {
    failedChecks++;
  } else {
    strengthScore++;
    // Bonus for longer credentials
    if (credential.length >= 12) strengthScore++;
    if (credential.length >= 16) strengthScore++;
  }

  // Check for uppercase
  if (!CREDENTIAL_PATTERNS.hasUppercase.test(credential)) {
    failedChecks++;
  } else {
    strengthScore++;
  }

  // Check for lowercase
  if (!CREDENTIAL_PATTERNS.hasLowercase.test(credential)) {
    failedChecks++;
  } else {
    strengthScore++;
  }

  // Check for number
  if (!CREDENTIAL_PATTERNS.hasNumber.test(credential)) {
    failedChecks++;
  } else {
    strengthScore++;
  }

  // Check for special character
  if (!CREDENTIAL_PATTERNS.hasSpecial.test(credential)) {
    failedChecks++;
  } else {
    strengthScore++;
  }

  // Generic error messages to prevent enumeration attacks
  if (failedChecks > 2) {
    errors.push('Value does not meet minimum security requirements');
  } else if (failedChecks > 0) {
    errors.push('Strength insufficient. Use a mix of uppercase, lowercase, numbers, and special characters');
  }

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
    (credential) => CREDENTIAL_PATTERNS.hasUppercase.test(credential),
    'Must contain at least one uppercase letter'
  )
  .refine(
    (credential) => CREDENTIAL_PATTERNS.hasLowercase.test(credential),
    'Must contain at least one lowercase letter'
  )
  .refine(
    (credential) => CREDENTIAL_PATTERNS.hasNumber.test(credential),
    'Must contain at least one number'
  )
  .refine(
    (credential) => CREDENTIAL_PATTERNS.hasSpecial.test(credential),
    'Must contain at least one special character'
  )
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
