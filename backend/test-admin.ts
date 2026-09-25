import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:5001/api';

async function main() {
  const staff = await prisma.staff.findUnique({ where: { staffId: 'STF-001' } });
  const admin = await prisma.admin.findUnique({ where: { adminId: 'ADM-001' } });
  const allCanteens = await prisma.canteen.findMany();
  
  if (!staff || !admin || allCanteens.length < 2) {
    console.error('Seed data missing');
    return;
  }

  const currentCanteenId = staff.assignedCanteenId;
  const newCanteenId = allCanteens.find(c => c.id !== currentCanteenId)?.id!;

  console.log('--- STEP 1 & 2: Get existing staff ---');
  let res = await fetch(`${API_URL}/staff/${staff.id}`);
  let data = await res.json();
  console.log(data);

  console.log('\n--- STEP 3: Create change request ---');
  res = await fetch(`${API_URL}/staff/${staff.id}/canteen-change-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestedCanteenId: newCanteenId, reason: 'I want to move here' })
  });
  data = await res.json();
  console.log(data);
  const requestId1 = data.data.id;

  console.log('\n--- STEP 4: Verify in PENDING ---');
  res = await fetch(`${API_URL}/admin/canteen-change-requests?status=PENDING`);
  data = await res.json();
  console.log('Pending requests count:', data.data.length);

  console.log('\n--- STEP 5: Verify in pending-actions ---');
  res = await fetch(`${API_URL}/admin/pending-actions`);
  data = await res.json();
  console.log('Pending actions count:', data.data.total);

  console.log('\n--- STEP 6 & 7 & 8: Approve request ---');
  res = await fetch(`${API_URL}/admin/canteen-change-requests/${requestId1}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminId: admin.id })
  });
  data = await res.json();
  console.log(data);

  console.log('\n--- STEP 9: Verify staff API returns new canteen ---');
  res = await fetch(`${API_URL}/staff/${staff.id}`);
  data = await res.json();
  console.log('New Canteen ID:', data.data.canteen.id, 'Expected:', newCanteenId);

  console.log('\n--- STEP 10: Create another request and reject it ---');
  res = await fetch(`${API_URL}/staff/${staff.id}/canteen-change-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestedCanteenId: currentCanteenId, reason: 'Wait, I changed my mind' })
  });
  data = await res.json();
  const requestId2 = data.data.id;

  res = await fetch(`${API_URL}/admin/canteen-change-requests/${requestId2}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminId: admin.id, reason: 'Denied.' })
  });
  data = await res.json();
  console.log(data);

  res = await fetch(`${API_URL}/staff/${staff.id}`);
  data = await res.json();
  console.log('Canteen ID after rejection:', data.data.canteen.id, 'Expected:', newCanteenId);

  console.log('\n--- STEP 11: Menu availability update ---');
  const menuItem = await prisma.menuItem.findFirst({ where: { canteenId: newCanteenId } });
  if (menuItem) {
    res = await fetch(`${API_URL}/menu/${menuItem.id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canteenId: newCanteenId, isAvailable: false })
    });
    console.log(await res.json());
    
    res = await fetch(`${API_URL}/menu/canteen/${newCanteenId}`);
    data = await res.json();
    const itemInMenu = data.data.flatMap((c: any) => c.menuItems).find((m: any) => m.id === menuItem.id);
    console.log('Is item available?', itemInMenu ? 'Yes' : 'No'); // Should be no, because getStaffMenu doesn't filter isAvailable... Wait, getting staff menu DOES return it, but with isAvailable=false. Let's check `isAvailable` property.
    console.log('Item availability state:', itemInMenu?.isAvailable);
  }

  console.log('\n--- STEP 12: Canteen deactivation ---');
  res = await fetch(`${API_URL}/admin/canteens/${newCanteenId}/deactivate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });
  console.log(await res.json());

  // Restore state so subsequent tests don't break
  await fetch(`${API_URL}/admin/canteens/${newCanteenId}/activate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });
  if (menuItem) {
    await fetch(`${API_URL}/menu/${menuItem.id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canteenId: newCanteenId, isAvailable: true })
    });
  }

}

main().catch(console.error);
