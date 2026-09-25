import { prisma } from '../config/prisma';

export const getHostels = async () => {
  return await prisma.hostel.findMany();
};

export const getHostelById = async (id: string) => {
  return await prisma.hostel.findUnique({
    where: { id },
    include: {
      canteen: true,
    },
  });
};
