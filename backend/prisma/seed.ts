import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // 1. Seed Canteens
  const canteensData = [
    { name: 'Krishna & Godavari Night Canteen', location: 'Krishna & Godavari Blocks' },
    { name: 'Yamuna & Narmada Night Canteen', location: 'Yamuna & Narmada Blocks' },
    { name: 'New Hostel Night Canteen', location: 'New Hostel Block' },
    { name: 'Vedavathi Night Canteen', location: 'Vedavathi Block' },
    { name: 'Ganga A & Ganga B Night Canteen', location: 'Ganga A & Ganga B Blocks' },
  ];

  const canteenMap: Record<string, string> = {};

  for (const cData of canteensData) {
    let canteen = await prisma.canteen.findFirst({ where: { name: cData.name } });
    if (!canteen) {
      canteen = await prisma.canteen.create({
        data: {
          name: cData.name,
          location: cData.location,
          isActive: true,
          isAcceptingOrders: true,
        },
      });
    }
    canteenMap[canteen.name] = canteen.id;
  }
  console.log('Canteens seeded.');

  // 2. Seed Hostels
  const hostelsData = [
    { name: 'Krishna', code: 'KR', canteenName: 'Krishna & Godavari Night Canteen' },
    { name: 'Godavari', code: 'GD', canteenName: 'Krishna & Godavari Night Canteen' },
    { name: 'Yamuna', code: 'YM', canteenName: 'Yamuna & Narmada Night Canteen' },
    { name: 'Narmada', code: 'NR', canteenName: 'Yamuna & Narmada Night Canteen' },
    { name: 'New Hostel', code: 'NH', canteenName: 'New Hostel Night Canteen' },
    { name: 'Vedavathi', code: 'VD', canteenName: 'Vedavathi Night Canteen' },
    { name: 'Ganga A', code: 'GA', canteenName: 'Ganga A & Ganga B Night Canteen' },
    { name: 'Ganga B', code: 'GB', canteenName: 'Ganga A & Ganga B Night Canteen' },
  ];

  for (const hData of hostelsData) {
    const canteenId = canteenMap[hData.canteenName];
    if (canteenId) {
      await prisma.hostel.upsert({
        where: { name: hData.name },
        update: { canteenId },
        create: {
          name: hData.name,
          code: hData.code,
          canteenId,
        },
      });
    }
  }
  console.log('Hostels seeded.');

  // 3. Seed Menu Categories
  const categoriesData = [
    'Sandwiches',
    'Desi Bite Bites',
    'Omelettes',
    'Juices',
    'Dosas',
    'Hot Beverages',
  ];

  const categoryMap: Record<string, string> = {};

  for (const catName of categoriesData) {
    const category = await prisma.menuCategory.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
    categoryMap[category.name] = category.id;
  }
  console.log('Menu categories seeded.');

  // 4. Seed Menu Items
  const menuItemsData = [
    { category: 'Sandwiches', items: [
      { name: 'Veg Grilled Sandwich', price: 50 },
      { name: 'Veg Cheese Grilled Sandwich', price: 60 },
      { name: 'Chicken Grilled Sandwich', price: 70 },
      { name: 'Chicken Cheese Grilled Sandwich', price: 85 },
      { name: 'Paneer Grilled Sandwich', price: 75 },
    ]},
    { category: 'Desi Bite Bites', items: [
      { name: 'Veg Roll', price: 70 },
      { name: 'Veg Cheese Roll', price: 85 },
      { name: 'Chicken Roll', price: 90 },
      { name: 'Double Egg Chicken Roll', price: 90 },
      { name: 'Egg Chicken Roll', price: 85 },
      { name: 'Chicken Cheese Roll', price: 110 },
      { name: 'Egg Roll', price: 70 },
      { name: 'Paneer Roll', price: 100 },
    ]},
    { category: 'Omelettes', items: [
      { name: 'Masala Omelette', price: 35 },
      { name: 'Bread Omelette', price: 50 },
      { name: 'Cheese Bread Omelette', price: 60 },
    ]},
    { category: 'Juices', items: [
      { name: 'Banana Fresh Juice', price: 60 },
      { name: 'Muskmelon Fresh Juice', price: 60 },
      { name: 'Watermelon Fresh Juice', price: 60 },
      { name: 'Grape Fresh Juice', price: 70 },
    ]},
    { category: 'Dosas', items: [
      { name: 'Plain Dosa', price: 40 },
      { name: 'Egg Dosa', price: 50 },
      { name: 'Double Egg Dosa', price: 60 },
      { name: 'Onion Dosa', price: 50 },
    ]},
    { category: 'Hot Beverages', items: [
      { name: 'Coffee', price: 30 },
      { name: 'Cardamom Tea', price: 25 },
      { name: 'Masala Tea', price: 25 },
      { name: 'Lemon Tea', price: 25 },
      { name: 'Hot Milk', price: 30 },
    ]},
  ];

  // For each canteen, seed these items
  for (const cData of canteensData) {
    const canteenId = canteenMap[cData.name];
    if (!canteenId) continue;

    for (const categoryGroup of menuItemsData) {
      const categoryId = categoryMap[categoryGroup.category];
      if (!categoryId) continue;

      for (const item of categoryGroup.items) {
        // Find existing to avoid duplicates per canteen
        const existingItem = await prisma.menuItem.findFirst({
          where: {
            name: item.name,
            canteenId: canteenId,
          }
        });

        if (!existingItem) {
          await prisma.menuItem.create({
            data: {
              name: item.name,
              price: item.price,
              canteenId: canteenId,
              categoryId: categoryId,
              isAvailable: true,
            },
          });
        }
      }
    }
  }
  console.log('Menu items seeded.');

  // 5. Seed Test Users (Student, Staff, Admin)
  const devHostel = await prisma.hostel.findFirst();
  const devCanteen = await prisma.canteen.findFirst();

  if (devHostel && devCanteen) {
    const student = await prisma.student.upsert({
      where: { email: 'student@example.com' },
      update: {},
      create: {
        name: 'Test Student',
        email: 'student@example.com',
        studentId: 'STD-001',
        hostelId: devHostel.id,
      },
    });

    const staff = await prisma.staff.upsert({
      where: { email: 'staff@example.com' },
      update: {},
      create: {
        name: 'Test Staff',
        email: 'staff@example.com',
        staffId: 'STF-001',
        assignedCanteenId: devCanteen.id,
      },
    });

    const admin = await prisma.admin.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        name: 'Test Admin',
        email: 'admin@example.com',
        adminId: 'ADM-001',
      },
    });

    console.log(`Test Users seeded.`);
    console.log(`- Student ID: ${student.id} (Hostel: ${devHostel.name})`);
    console.log(`- Staff ID: ${staff.id} (Canteen: ${devCanteen.name})`);
    console.log(`- Admin ID: ${admin.id}`);
  }

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
