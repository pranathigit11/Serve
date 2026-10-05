import { Prisma } from '../generated/prisma/client.js';

export type Money = Prisma.Decimal;

export const money = (value: ConstructorParameters<typeof Prisma.Decimal>[0]): Money => new Prisma.Decimal(value).toDecimalPlaces(2);

/** JSON representation of a monetary amount (rupees, two decimals). */
export const moneyToNumber = (value: Money): number => Number(value.toFixed(2));

/** Integer paise, used for payment signatures. */
export const toPaise = (value: Money): number => value.mul(100).toDecimalPlaces(0).toNumber();
