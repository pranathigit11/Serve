import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:5001/api';

async function main() {
  const student = await prisma.student.findUnique({ where: { studentId: 'STD-001' }, include: { hostel: true } });
  const canteen = await prisma.canteen.findUnique({ where: { id: student?.hostel.canteenId } });
  const menuItem = await prisma.menuItem.findFirst({ where: { canteenId: canteen?.id } });
  
  if (!student || !canteen || !menuItem) {
    console.error('Seed data missing');
    return;
  }

  console.log('--- Creating Order ---');
  let res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: student.id,
      canteenId: canteen.id,
      items: [{ menuItemId: menuItem.id, quantity: 2 }]
    })
  });
  let data = await res.json();
  console.log(data);
  const orderId = data.data.id;

  console.log('\n--- Confirming Payment ---');
  res = await fetch(`${API_URL}/orders/${orderId}/confirm-payment`, { method: 'POST' });
  console.log(await res.json());

  console.log('\n--- Updating Status to PREPARING ---');
  res = await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PREPARING', canteenId: canteen.id })
  });
  console.log(await res.json());

  console.log('\n--- Updating Status to READY ---');
  res = await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'READY', canteenId: canteen.id })
  });
  console.log(await res.json());

  console.log('\n--- Fetching Student Active Orders ---');
  res = await fetch(`${API_URL}/orders/student/${student.id}/active`);
  console.log((await res.json()).data.length, 'active orders');

  console.log('\n--- Updating Status to COLLECTED ---');
  res = await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COLLECTED', canteenId: canteen.id })
  });
  console.log(await res.json());

  console.log('\n--- Fetching Student Active Orders After Collect ---');
  res = await fetch(`${API_URL}/orders/student/${student.id}/active`);
  console.log((await res.json()).data.length, 'active orders');

  console.log('\n--- Pausing Order Taking ---');
  res = await fetch(`${API_URL}/canteens/${canteen.id}/order-taking`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAcceptingOrders: false })
  });
  console.log(await res.json());

  console.log('\n--- Attempting to Order while Paused ---');
  res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: student.id,
      canteenId: canteen.id,
      items: [{ menuItemId: menuItem.id, quantity: 1 }]
    })
  });
  console.log(await res.json());

  console.log('\n--- Resuming Order Taking ---');
  res = await fetch(`${API_URL}/canteens/${canteen.id}/order-taking`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAcceptingOrders: true })
  });
  console.log(await res.json());

}

main().catch(console.error);
