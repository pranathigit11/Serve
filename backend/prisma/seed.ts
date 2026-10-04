/**
 * Development seed: creates the campus canteens and gives each canteen its own
 * copy of the starter menu. It never creates users (identities come from
 * Firebase) and it is idempotent:
 *   - canteens are matched by name and left untouched if they already exist;
 *   - a canteen's starter menu is only inserted when that canteen has never
 *     had any menu items, so staff edits and deletions are never overwritten.
 *
 * Refuses to run when NODE_ENV=production unless SEED_ALLOW_PRODUCTION=true.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';

interface SeedData {
  canteens: { name: string; location: string; hostelsServed: string[] }[];
  categories: string[];
  items: {
    name: string;
    category: string;
    description: string;
    price: number;
    prepTimeMinutes: number;
    isAvailable: boolean;
    imageUrl: string;
  }[];
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusing to seed a production database (set SEED_ALLOW_PRODUCTION=true to override).');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const dataPath = fileURLToPath(new URL('./seed-data/menu.json', import.meta.url));
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as SeedData;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    for (const canteenSeed of data.canteens) {
      const canteen =
        (await prisma.canteen.findUnique({ where: { name: canteenSeed.name } })) ??
        (await prisma.canteen.create({ data: canteenSeed }));

      const existingItems = await prisma.menuItem.count({ where: { canteenId: canteen.id } });
      if (existingItems > 0) {
        console.log(`[seed] ${canteen.name}: menu already present, skipped`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const categoryIds = new Map<string, string>();
        for (const [index, name] of data.categories.entries()) {
          const category = await tx.menuCategory.upsert({
            where: { canteenId_name: { canteenId: canteen.id, name } },
            update: {},
            create: { canteenId: canteen.id, name, sortOrder: index },
          });
          categoryIds.set(name, category.id);
        }
        await tx.menuItem.createMany({
          data: data.items.map((item) => {
            const categoryId = categoryIds.get(item.category);
            if (!categoryId) throw new Error(`Unknown category ${item.category} for ${item.name}`);
            return {
              canteenId: canteen.id,
              categoryId,
              name: item.name,
              description: item.description,
              price: item.price,
              prepTimeMinutes: item.prepTimeMinutes,
              isAvailable: item.isAvailable,
              imageUrl: item.imageUrl,
            };
          }),
        });
      });
      console.log(`[seed] ${canteen.name}: inserted ${data.items.length} starter menu items`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
