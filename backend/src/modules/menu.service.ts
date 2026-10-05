import { Prisma } from '../generated/prisma/client.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import {
  publishMenuCategory,
  publishMenuItem,
  publishMenuItemDeleted,
} from '../realtime/events.js';
import { categoryDto, menuItemDto } from './dto.js';

const POPULAR_WINDOW_DAYS = 30;

/** Full menu of one canteen: categories, live (non-deleted) items, popular item ids. */
export async function getCanteenMenu(canteenId: string) {
  const since = new Date(Date.now() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [categories, items, popular] = await Promise.all([
    prisma.menuCategory.findMany({ where: { canteenId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.menuItem.findMany({
      where: { canteenId, deletedAt: null },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    }),
    prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        menuItemId: { not: null },
        order: { canteenId, status: { in: ['PLACED', 'PREPARING', 'READY', 'COLLECTED'] }, createdAt: { gte: since } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    }),
  ]);
  const liveIds = new Set(items.map((item) => item.id));
  return {
    categories: categories.map(categoryDto),
    items: items.map(menuItemDto),
    popularItemIds: popular.map((row) => row.menuItemId).filter((id): id is string => !!id && liveIds.has(id)),
  };
}

/**
 * Loads a category and checks it belongs to the staff member's canteen. A
 * category of another canteen yields 403; an unknown id yields 404.
 */
async function ownedCategory(canteenId: string, categoryId: string) {
  const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw notFound('CATEGORY_NOT_FOUND', 'Category not found.');
  if (category.canteenId !== canteenId) throw forbidden('FORBIDDEN', 'This category belongs to another canteen.');
  return category;
}

async function ownedItem(canteenId: string, itemId: string) {
  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!item || item.deletedAt) throw notFound('MENU_ITEM_NOT_FOUND', 'Menu item not found.');
  if (item.canteenId !== canteenId) throw forbidden('FORBIDDEN', 'This menu item belongs to another canteen.');
  return item;
}

function duplicateName(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw conflict('CATEGORY_EXISTS', 'A category with this name already exists.');
  }
  throw error;
}

export async function createCategory(canteenId: string, input: { name: string; sortOrder?: number | undefined }) {
  const sortOrder =
    input.sortOrder ??
    ((await prisma.menuCategory.aggregate({ where: { canteenId }, _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1;
  const category = await prisma.menuCategory
    .create({ data: { canteenId, name: input.name, sortOrder } })
    .catch(duplicateName);
  const dto = categoryDto(category);
  publishMenuCategory(canteenId, dto);
  return dto;
}

export async function updateCategory(
  canteenId: string,
  categoryId: string,
  input: { name?: string | undefined; sortOrder?: number | undefined },
) {
  await ownedCategory(canteenId, categoryId);
  const category = await prisma.menuCategory
    .update({
      where: { id: categoryId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    })
    .catch(duplicateName);
  const dto = categoryDto(category);
  publishMenuCategory(canteenId, dto);
  // Items embed their category name; refresh clients' copies.
  const items = await prisma.menuItem.findMany({
    where: { categoryId, deletedAt: null },
    include: { category: true },
  });
  for (const item of items) publishMenuItem(canteenId, menuItemDto(item), false);
  return dto;
}

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description?: string | undefined;
  price: number;
  prepTimeMinutes?: number | undefined;
  imageUrl?: string | null | undefined;
  isAvailable?: boolean | undefined;
}

export async function createMenuItem(canteenId: string, input: MenuItemInput) {
  await ownedCategory(canteenId, input.categoryId);
  const item = await prisma.menuItem.create({
    data: {
      canteenId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? '',
      price: input.price,
      prepTimeMinutes: input.prepTimeMinutes ?? 10,
      imageUrl: input.imageUrl ?? null,
      isAvailable: input.isAvailable ?? true,
    },
    include: { category: true },
  });
  const dto = menuItemDto(item);
  publishMenuItem(canteenId, dto, true);
  return dto;
}

export type MenuItemUpdate = { [K in keyof MenuItemInput]?: MenuItemInput[K] | undefined };

export async function updateMenuItem(canteenId: string, itemId: string, input: MenuItemUpdate) {
  const existing = await ownedItem(canteenId, itemId);
  if (input.categoryId !== undefined) await ownedCategory(canteenId, input.categoryId);
  const item = await prisma.menuItem.update({
    where: { id: itemId },
    data: {
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.prepTimeMinutes !== undefined ? { prepTimeMinutes: input.prepTimeMinutes } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
    },
    include: { category: true },
  });
  const dto = menuItemDto(item);
  publishMenuItem(canteenId, dto, existing.isAvailable !== item.isAvailable);
  return dto;
}

export async function setMenuItemAvailability(canteenId: string, itemId: string, isAvailable: boolean) {
  return updateMenuItem(canteenId, itemId, { isAvailable });
}

/** Soft delete: past orders keep their snapshot; the item can no longer be ordered. */
export async function deleteMenuItem(canteenId: string, itemId: string) {
  await ownedItem(canteenId, itemId);
  await prisma.menuItem.update({ where: { id: itemId }, data: { deletedAt: new Date(), isAvailable: false } });
  publishMenuItemDeleted(canteenId, { id: itemId, canteenId });
}
