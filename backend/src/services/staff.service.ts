import { prisma } from '../config/prisma';

export const getStaffById = async (id: string) => {
  return await prisma.staff.findUnique({
    where: { id },
    include: {
      assignedCanteen: {
        include: { hostels: true }
      },
    },
  });
};

export const createChangeRequest = async (staffId: string, requestedCanteenId: string, reason: string) => {
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff || !staff.isActive) throw new Error('Staff not found or inactive');

  const requestedCanteen = await prisma.canteen.findUnique({ where: { id: requestedCanteenId } });
  if (!requestedCanteen || !requestedCanteen.isActive) throw new Error('Requested canteen not found or inactive');

  if (staff.assignedCanteenId === requestedCanteenId) {
    throw new Error('Already assigned to the requested canteen');
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is required');
  }
  if (reason.length > 500) {
    throw new Error('Reason is too long');
  }

  const existingPending = await prisma.canteenChangeRequest.findFirst({
    where: {
      staffId,
      requestedCanteenId,
      status: 'PENDING'
    }
  });

  if (existingPending) {
    throw new Error('You already have a pending request for this canteen');
  }

  return await prisma.canteenChangeRequest.create({
    data: {
      staffId,
      currentCanteenId: staff.assignedCanteenId,
      requestedCanteenId,
      reason,
    }
  });
};

export const getChangeRequests = async (staffId: string) => {
  return await prisma.canteenChangeRequest.findMany({
    where: { staffId },
    orderBy: { requestedAt: 'desc' },
    include: {
      currentCanteen: { select: { id: true, name: true } },
      requestedCanteen: { select: { id: true, name: true } },
    }
  });
};
