/**
 * utils/validators.ts
 *
 * Yup validation schemas for every form in the app.
 * Centralised here so Register, Login, AddTask, etc. all share the same rules.
 * Import the schema you need in the screen and pass it to useForm's resolver.
 */

import * as yup from 'yup';

// ─── Auth schemas ─────────────────────────────────────────────────────────────

// Reusable field rules
const emailField = yup
  .string()
  .trim()
  .lowercase()
  .email('Please enter a valid email address')
  .required('Email is required');

const passwordField = yup
  .string()
  .min(8, 'Password must be at least 8 characters')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[0-9]/, 'Password must contain at least one number')
  .required('Password is required');

const nameField = yup
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name is too long')
  .required('Full name is required');

/**
 * registerSchema
 * Validates: name, email, password (strength rules), confirmPassword (must match).
 */
export const registerSchema = yup.object({
  name:            nameField,
  email:           emailField,
  password:        passwordField,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

/**
 * loginSchema
 * Validates: email format, password presence (no strength check on login).
 */
export const loginSchema = yup.object({
  email:    emailField,
  password: yup.string().required('Password is required'),
});

/**
 * forgotPasswordSchema
 * Validates: email format only.
 */
export const forgotPasswordSchema = yup.object({
  email: emailField,
});

// TypeScript types inferred directly from the Yup schemas —
// no need to define them manually in auth.types.ts.
export type RegisterFormValues     = yup.InferType<typeof registerSchema>;
export type LoginFormValues        = yup.InferType<typeof loginSchema>;
export type ForgotPasswordFormValues = yup.InferType<typeof forgotPasswordSchema>;

// ─── Task schemas ─────────────────────────────────────────────────────────────

/**
 * taskSchema
 * Validates the AddTask / EditTask form.
 * dateTime and deadline are stored as ISO strings or null in the form state,
 * but for Yup we only validate the title and optional text fields.
 */
export const taskSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or fewer')
    .required('Title is required'),

  description: yup
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .optional(),

  tagsRaw: yup
    .string()
    .max(200, 'Tags string is too long')
    .optional(),
});

export type TaskFormValues = yup.InferType<typeof taskSchema>;
