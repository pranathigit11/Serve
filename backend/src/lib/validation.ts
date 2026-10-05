import { z } from 'zod';
import { badRequest } from './errors.js';

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest('VALIDATION_ERROR', 'The request is invalid.', {
      issues: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }
  return result.data;
}

export const uuid = z.uuid({ message: 'Must be a valid id' });

export const idParam = <K extends string>(name: K) => z.object({ [name]: uuid } as Record<K, typeof uuid>);

const twoDecimals = (value: number) => Math.round(value * 100) === Number((value * 100).toFixed(6));

export const priceSchema = z
  .number()
  .positive('Price must be greater than zero')
  .max(100000, 'Price is too high')
  .refine(twoDecimals, 'Price can have at most two decimal places');

export const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
