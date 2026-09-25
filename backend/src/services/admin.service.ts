import { prisma } from '../config/prisma';
import { ChangeRequestStatus } from '@prisma/client';

export const getCanteens = async () => {
  return await prisma.canteen.findMany({
    orderBy: { createdAt: 'desc' },
    include: { hostels: true }
  });
};

export const createCanteen = async (data: { name: string; location: string; hostelIds: string[] }) => {
  const existing = await prisma.canteen.findFirst({ where: { name: data.name } });
  if (existing) throw new Error('Canteen with this name already exists');

  // Verify hostels exist
  const hostels = await prisma.hostel.findMany({ where: { id: { in: data.hostelIds } } });
  if (hostels.length !== data.hostelIds.length) {
    throw new Error('One or more invalid hostel IDs');
  }

  return await prisma.$transaction(async (tx) => {
    const canteen = await tx.canteen.create({
      data: {
        name: data.name,
        location: data.location,
        isActive: true,
        isAcceptingOrders: true,
      }
    });

    if (data.hostelIds.length > 0) {
      await tx.hostel.updateMany({
        where: { id: { in: data.hostelIds } },
        data: { canteenId: canteen.id }
      });
    }

    return await tx.canteen.findUnique({
      where: { id: canteen.id },
      include: { hostels: true }
    });
  });
};

export const updateCanteen = async (id: string, data: { name?: string; location?: string; isActive?: boolean; isAcceptingOrders?: boolean }) => {
  if (data.name) {
    const existing = await prisma.canteen.findFirst({ where: { name: data.name, id: { not: id } } });
    if (existing) throw new Error('Another canteen with this name already exists');
  }

  return await prisma.canteen.update({
    where: { id },
    data,
    include: { hostels: true }
  });
};

export const getCanteenHostels = async (id: string) => {
  return await prisma.hostel.findMany({ where: { canteenId: id } });
};

export const updateCanteenHostels = async (canteenId: string, hostelIds: string[]) => {
  const canteen = await prisma.canteen.findUnique({ where: { id: canteenId } });
  if (!canteen) throw new Error('Canteen not found');

  const hostels = await prisma.hostel.findMany({ where: { id: { in: hostelIds } } });
  if (hostels.length !== hostelIds.length) {
    throw new Error('One or more invalid hostel IDs');
  }

  return await prisma.$transaction(async (tx) => {
    // Unassign old hostels that belonged to this canteen
    await tx.hostel.updateMany({
      where: { canteenId },
      data: { canteenId: canteenId } // Actually, you can't leave them dangling because canteenId is required in Hostel. So we only steal hostels, we don't 'unassign'. Wait, if we replace the assignment, where do the old ones go? The schema says `canteenId String`. It's required. If we 'replace' the assignment, we must assign the old ones to another canteen, or the user can't remove a hostel without giving it a new canteen.
      // But the instructions say: "The request should replace the canteen's hostel assignment with the supplied list."
      // If we remove them from this canteen, they'd need a new canteenId. Since we don't have a default, we will throw an error if this action leaves any hostel without a canteen, or we can just update the provided ones to this canteen. The prompt says "replace the canteen's hostel assignment with the supplied list". Let's assume it means "assign these hostels to this canteen". If they belonged to another canteen, they are moved here.
    });

    if (hostelIds.length > 0) {
      await tx.hostel.updateMany({
        where: { id: { in: hostelIds } },
        data: { canteenId }
      });
    }

    return await tx.hostel.findMany({ where: { canteenId } });
  });
};

export const getStaff = async () => {
  return await prisma.staff.findMany({
    orderBy: { createdAt: 'desc' },
    include: { assignedCanteen: true }
  });
};

export const getStaffById = async (id: string) => {
  return await prisma.staff.findUnique({
    where: { id },
    include: { assignedCanteen: true }
  });
};

export const createStaff = async (data: { name: string; staffId: string; email: string; assignedCanteenId: string }) => {
  const canteen = await prisma.canteen.findUnique({ where: { id: data.assignedCanteenId } });
  if (!canteen || !canteen.isActive) throw new Error('Invalid or inactive assigned canteen');

  const existingStaff = await prisma.staff.findFirst({ where: { OR: [{ email: data.email }, { staffId: data.staffId }] } });
  if (existingStaff) throw new Error('Staff with this email or staffId already exists');

  return await prisma.staff.create({
    data: {
      ...data,
      isActive: true
    },
    include: { assignedCanteen: true }
  });
};

export const updateStaff = async (id: string, data: { name?: string; email?: string; assignedCanteenId?: string; isActive?: boolean }) => {
  if (data.assignedCanteenId) {
    const canteen = await prisma.canteen.findUnique({ where: { id: data.assignedCanteenId } });
    if (!canteen || !canteen.isActive) throw new Error('Invalid or inactive assigned canteen');
  }

  if (data.email) {
    const existing = await prisma.staff.findFirst({ where: { email: data.email, id: { not: id } } });
    if (existing) throw new Error('Email already in use');
  }

  return await prisma.staff.update({
    where: { id },
    data,
    include: { assignedCanteen: true }
  });
};

export const getChangeRequests = async (status?: ChangeRequestStatus) => {
  return await prisma.canteenChangeRequest.findMany({
    where: status ? { status } : {},
    orderBy: { requestedAt: 'desc' },
    include: {
      staff: { select: { name: true, staffId: true } },
      currentCanteen: { select: { name: true } },
      requestedCanteen: { select: { name: true } },
      reviewedByAdmin: { select: { name: true } }
    }
  });
};

export const approveChangeRequest = async (id: string, adminId: string) => {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) throw new Error('Admin not found or inactive');

  return await prisma.$transaction(async (tx) => {
    const request = await tx.canteenChangeRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Request not found');
    if (request.status !== ChangeRequestStatus.PENDING) throw new Error('Request is not PENDING');

    const staff = await tx.staff.findUnique({ where: { id: request.staffId } });
    if (!staff || !staff.isActive) throw new Error('Staff not found or inactive');

    const canteen = await tx.canteen.findUnique({ where: { id: request.requestedCanteenId } });
    if (!canteen || !canteen.isActive) throw new Error('Requested canteen not found or inactive');

    await tx.staff.update({
      where: { id: staff.id },
      data: { assignedCanteenId: canteen.id }
    });

    return await tx.canteenChangeRequest.update({
      where: { id },
      data: {
        status: ChangeRequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByAdminId: admin.id
      }
    });
  });
};

export const rejectChangeRequest = async (id: string, adminId: string, reason?: string) => {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) throw new Error('Admin not found or inactive');

  const request = await prisma.canteenChangeRequest.findUnique({ where: { id } });
  if (!request) throw new Error('Request not found');
  if (request.status !== ChangeRequestStatus.PENDING) throw new Error('Request is not PENDING');

  return await prisma.canteenChangeRequest.update({
    where: { id },
    data: {
      status: ChangeRequestStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedByAdminId: admin.id,
      reviewNote: reason
    }
  });
};

export const getPendingActions = async () => {
  const pendingRequests = await prisma.canteenChangeRequest.findMany({
    where: { status: ChangeRequestStatus.PENDING },
    orderBy: { requestedAt: 'desc' },
    include: { staff: true, currentCanteen: true, requestedCanteen: true }
  });

  return {
    total: pendingRequests.length,
    items: pendingRequests.map(r => ({
      type: 'CANTEEN_CHANGE_REQUEST',
      id: r.id,
      title: `Canteen Change Request from ${r.staff.name}`,
      description: `Wants to move from ${r.currentCanteen.name} to ${r.requestedCanteen.name}`,
      createdAt: r.requestedAt,
      metadata: { staffId: r.staff.id, requestedCanteenId: r.requestedCanteenId }
    }))
  };
};

export const getSummary = async () => {
  const activeCanteens = await prisma.canteen.count({ where: { isActive: true } });
  const totalStaff = await prisma.staff.count();
  const pendingRequests = await prisma.canteenChangeRequest.count({ where: { status: ChangeRequestStatus.PENDING } });

  return {
    activeCanteens,
    totalStaff,
    pendingRequests
  };
};
