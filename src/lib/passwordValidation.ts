import { z } from 'zod';

/**
 * Security: Password Validation Utility
 * 
 * This module provides client-side password strength validation to enforce
 * strong password policies. Since Supabase's Leaked Password Protection
 * is a paid feature, this provides defense-in-depth at the client level.
 * 
 * Requirements enforced:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not in common password blocklist
 */

// Common passwords blocklist (top 100+ most common)
// This list catches the most frequently used weak passwords
const COMMON_PASSWORDS = new Set([
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

// Password requirement patterns
const PASSWORD_PATTERNS = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

/**
 * Validates a password against security requirements
 * Returns detailed validation results including strength assessment
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let strengthScore = 0;
  let failedChecks = 0;

  // Check minimum length
  if (password.length < PASSWORD_PATTERNS.minLength) {
    failedChecks++;
  } else {
    strengthScore++;
    // Bonus for longer passwords
    if (password.length >= 12) strengthScore++;
    if (password.length >= 16) strengthScore++;
  }

  // Check for uppercase
  if (!PASSWORD_PATTERNS.hasUppercase.test(password)) {
    failedChecks++;
  } else {
    strengthScore++;
  }

  // Check for lowercase
  if (!PASSWORD_PATTERNS.hasLowercase.test(password)) {
    failedChecks++;
  } else {
    strengthScore++;
  }

  // Check for number
  if (!PASSWORD_PATTERNS.hasNumber.test(password)) {
    failedChecks++;
  } else {
    strengthScore++;
  }

  // Check for special character
  if (!PASSWORD_PATTERNS.hasSpecial.test(password)) {
    failedChecks++;
  } else {
    strengthScore++;
  }

  // Generic error messages to prevent enumeration attacks
  if (failedChecks > 2) {
    errors.push('Password does not meet minimum security requirements');
  } else if (failedChecks > 0) {
    errors.push('Password strength insufficient. Use a mix of uppercase, lowercase, numbers, and special characters');
  }

  // Check against common passwords (case-insensitive)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more unique password');
    strengthScore = Math.max(0, strengthScore - 2);
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., "aaa")');
    strengthScore = Math.max(0, strengthScore - 1);
  }

  // Check for sequential numbers/letters
  if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg/i.test(password)) {
    errors.push('Password should not contain sequential characters (e.g., "123", "abc")');
    strengthScore = Math.max(0, strengthScore - 1);
  }

  // Calculate strength
  let strength: PasswordValidationResult['strength'];
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
 * Zod schema for password validation
 * Use this in form validation
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_PATTERNS.minLength, `Password must be at least ${PASSWORD_PATTERNS.minLength} characters`)
  .refine(
    (password) => PASSWORD_PATTERNS.hasUppercase.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => PASSWORD_PATTERNS.hasLowercase.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => PASSWORD_PATTERNS.hasNumber.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => PASSWORD_PATTERNS.hasSpecial.test(password),
    'Password must contain at least one special character'
  )
  .refine(
    (password) => !COMMON_PASSWORDS.has(password.toLowerCase()),
    'This password is too common. Please choose a more unique password'
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
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
