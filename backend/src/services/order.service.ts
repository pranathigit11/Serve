import { prisma } from '../config/prisma';
import { OrderStatus, Prisma } from '@prisma/client';

export const createOrder = async (studentId: string, canteenId: string, items: { menuItemId: string, quantity: number }[]) => {
  // A. Student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { hostel: true }
  });
  if (!student || !student.isActive) throw new Error('Student not found or inactive');

  // B & C. Canteen exists and matches student's hostel
  if (student.hostel.canteenId !== canteenId) {
    throw new Error('Selected canteen does not match the student\'s assigned hostel');
  }

  const canteen = await prisma.canteen.findUnique({ where: { id: canteenId } });
  if (!canteen || !canteen.isActive) throw new Error('Canteen not found or inactive');

  // D. Canteen accepts orders
  if (!canteen.isAcceptingOrders) throw new Error('Canteen is not currently accepting orders');

  // E, F, G. Validate menu items
  const menuItemIds = items.map(item => item.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } }
  });

  if (menuItems.length !== new Set(menuItemIds).size) {
    throw new Error('One or more menu items do not exist');
  }

  let totalAmount = new Prisma.Decimal(0);
  const orderItemsData: any[] = [];

  // Combine quantities for duplicate IDs in request
  const itemMap = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    itemMap.set(item.menuItemId, (itemMap.get(item.menuItemId) || 0) + item.quantity);
  }

  for (const [menuItemId, quantity] of Array.from(itemMap.entries())) {
    const menuItem = menuItems.find(m => m.id === menuItemId);
    if (!menuItem) throw new Error(`Menu item ${menuItemId} not found`);

    if (menuItem.canteenId !== canteenId) throw new Error(`Menu item ${menuItem.name} does not belong to the selected canteen`);
    if (!menuItem.isAvailable) throw new Error(`Menu item ${menuItem.name} is currently unavailable`);

    const itemTotal = menuItem.price.mul(quantity);
    totalAmount = totalAmount.add(itemTotal);

    orderItemsData.push({
      menuItemId: menuItem.id,
      quantity,
      unitPrice: menuItem.price,
      itemName: menuItem.name
    });
  }

  // Generate readable Order Number (ORD-YYYYMMDD-XXXX)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const latestOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: `ORD-${dateStr}-` } },
    orderBy: { createdAt: 'desc' }
  });
  
  let sequence = 1;
  if (latestOrder) {
    const lastSeq = parseInt(latestOrder.orderNumber.split('-')[2], 10);
    sequence = lastSeq + 1;
  }
  const orderNumber = `ORD-${dateStr}-${sequence.toString().padStart(4, '0')}`;

  // Transaction
  return await prisma.order.create({
    data: {
      orderNumber,
      studentId,
      hostelId: student.hostelId,
      canteenId,
      totalAmount,
      status: OrderStatus.PLACED,
      items: {
        create: orderItemsData
      }
    },
    include: {
      items: true
    }
  });
};

export const confirmPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.status !== OrderStatus.PLACED) throw new Error('Order is not in PLACED state');

  return await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PAYMENT_CONFIRMED }
  });
};

export const cancelOrder = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  
  if (order.status !== OrderStatus.PLACED && order.status !== OrderStatus.PAYMENT_CONFIRMED) {
    throw new Error('Order cannot be cancelled in its current state');
  }

  return await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED }
  });
};

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COLLECTED],
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus, canteenId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.canteenId !== canteenId) throw new Error('Unauthorized: Order does not belong to your canteen');

  const allowedNextStates = VALID_TRANSITIONS[order.status] || [];
  if (!allowedNextStates.includes(status)) {
    throw new Error(`Invalid status transition from ${order.status} to ${status}`);
  }

  return await prisma.order.update({
    where: { id: orderId },
    data: { status }
  });
};

export const getOrderById = async (orderId: string) => {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      student: { select: { id: true, name: true, studentId: true } },
      hostel: { select: { id: true, name: true } },
      canteen: { select: { id: true, name: true } },
      items: true
    }
  });
};

export const getStudentOrders = async (studentId: string) => {
  return await prisma.order.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: { canteen: { select: { id: true, name: true } }, items: true }
  });
};

export const getStudentActiveOrders = async (studentId: string) => {
  return await prisma.order.findMany({
    where: { 
      studentId, 
      status: { in: [OrderStatus.PLACED, OrderStatus.PAYMENT_CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY] } 
    },
    orderBy: { createdAt: 'desc' },
    include: { canteen: { select: { id: true, name: true } }, items: true }
  });
};

export const getCanteenOrders = async (canteenId: string, status?: OrderStatus, search?: string) => {
  const whereClause: any = { canteenId };
  if (status) whereClause.status = status;
  
  if (search) {
    whereClause.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { student: { name: { contains: search, mode: 'insensitive' } } },
      { student: { studentId: { contains: search, mode: 'insensitive' } } },
      { hostel: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { name: true, studentId: true } },
      hostel: { select: { name: true } },
      items: true
    }
  });
};

export const getCanteenOrderById = async (canteenId: string, orderId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, canteenId },
    include: {
      student: { select: { id: true, name: true, studentId: true } },
      hostel: { select: { id: true, name: true } },
      items: true
    }
  });
  if (!order) throw new Error('Order not found or does not belong to this canteen');
  return order;
};
