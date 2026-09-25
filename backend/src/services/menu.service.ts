import { prisma } from '../config/prisma';

export const getMenu = async (canteenId?: string) => {
  if (canteenId) {
    return await prisma.menuCategory.findMany({
      include: {
        menuItems: {
          where: {
            canteenId: canteenId,
            isAvailable: true,
          }
        }
      }
    });
  }

  return await prisma.menuCategory.findMany({
    include: {
      menuItems: {
        where: {
          isAvailable: true,
        }
      }
    }
  });
};

export const getStaffMenu = async (canteenId: string) => {
  return await prisma.menuCategory.findMany({
    include: {
      menuItems: {
        where: { canteenId },
        orderBy: { name: 'asc' }
      }
    }
  });
};

export const updateMenuAvailability = async (menuItemId: string, canteenId: string, isAvailable: boolean) => {
  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!menuItem) throw new Error('Menu item not found');
  if (menuItem.canteenId !== canteenId) throw new Error('Unauthorized: Menu item does not belong to your canteen');

  return await prisma.menuItem.update({
    where: { id: menuItemId },
    data: { isAvailable }
  });
};

export const createMenuItem = async (canteenId: string, data: { name: string, description?: string, price: number, imageUrl?: string, categoryId: string }) => {
  const canteen = await prisma.canteen.findUnique({ where: { id: canteenId } });
  if (!canteen || !canteen.isActive) throw new Error('Canteen not found or inactive');

  const category = await prisma.menuCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new Error('Category not found');

  return await prisma.menuItem.create({
    data: {
      ...data,
      canteenId,
      isAvailable: true
    }
  });
};

export const updateMenuItem = async (menuItemId: string, canteenId: string, data: any) => {
  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!menuItem) throw new Error('Menu item not found');
  if (menuItem.canteenId !== canteenId) throw new Error('Unauthorized: Menu item does not belong to your canteen');

  if (data.categoryId) {
    const category = await prisma.menuCategory.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new Error('Category not found');
  }

  return await prisma.menuItem.update({
    where: { id: menuItemId },
    data
  });
};
