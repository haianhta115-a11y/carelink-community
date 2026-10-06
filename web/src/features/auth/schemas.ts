import { z } from 'zod';
import { vi } from '../../locales/vi';
export const passwordSchema = z
  .string()
  .min(8, vi.auth.passwordPolicy)
  .refine(
    (value) => /\p{L}/u.test(value) && /\p{N}/u.test(value) && new TextEncoder().encode(value).length <= 72,
    vi.auth.passwordPolicy,
  );
export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => !value || /^(0|\+84)\d{9,10}$/.test(value), vi.auth.phoneInvalid);
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, vi.auth.nameInvalid).max(80, vi.auth.nameInvalid),
    email: z.string().trim().email(vi.auth.emailInvalid).max(254, vi.auth.emailInvalid),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(['Requester', 'Helper']),
    phone: phoneSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: vi.auth.passwordMismatch,
    path: ['confirmPassword'],
  });
export const loginSchema = z.object({
  email: z.string().trim().email(vi.auth.emailInvalid),
  password: z.string().min(1, vi.common.required),
});
