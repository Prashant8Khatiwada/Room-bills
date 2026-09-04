import { z } from 'zod';

export const moneyAmount = z
  .number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Max 2 decimal places');

export const inviteCodeSchema = z
  .string()
  .length(8, 'Invite code must be 8 characters')
  .regex(/^[A-HJ-NP-Z2-9]{8}$/, 'Invalid invite code format (uppercase letters & digits excluding 0, O, 1, I)');
