import { prisma } from '../config/prisma';

export const getCanteens = async () => {
  return await prisma.canteen.findMany({
    where: { isActive: true },
  });
};

export const getCanteenById = async (id: string) => {
  return await prisma.canteen.findUnique({
    where: { id },
    include: {
      hostels: true,
    },
  });
};

export const updateCanteenOrderTaking = async (id: string, isAcceptingOrders: boolean) => {
  return await prisma.canteen.update({
    where: { id },
    data: { isAcceptingOrders },
    select: {
      id: true,
      isActive: true,
      isAcceptingOrders: true
    }
  });
};
