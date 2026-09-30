import { prisma } from '../config/prisma';

export const getStudentById = async (id: string) => {
  return await prisma.student.findUnique({
    where: { id },
    include: {
      hostel: {
        include: {
          canteen: true,
        }
      }
    },
  });
};

export const getStudentByFirebaseUid = async (firebaseUid: string) => {
  return await prisma.student.findUnique({
    where: { firebaseUid },
    include: {
      hostel: {
        include: {
          canteen: true,
        }
      }
    },
  });
};
