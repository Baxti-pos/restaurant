import { Prisma, PrismaClient, TableStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ownerPasswordHash = await bcrypt.hash("admin123", 10);

  const owner = await prisma.user.upsert({
    where: { phone: "+998901234567" },
    update: {
      fullName: "Baxti Owner",
      role: UserRole.OWNER,
      passwordHash: ownerPasswordHash,
      isActive: true
    },
    create: {
      fullName: "Baxti Owner",
      phone: "+998901234567",
      passwordHash: ownerPasswordHash,
      role: UserRole.OWNER
    }
  });

  const branch = await prisma.branch.upsert({
    where: { name: "Chilonzor filiali" },
    update: {
      ownerId: owner.id,
      shiftEnd: "23:00",
      isActive: true
    },
    create: {
      name: "Chilonzor filiali",
      ownerId: owner.id,
      shiftEnd: "23:00"
    }
  });

  const waiter = await prisma.user.upsert({
    where: { telegramUserId: BigInt(111111111) },
    update: {
      fullName: "Telegram Waiter",
      role: UserRole.WAITER,
      branchId: branch.id,
      isActive: true
    },
    create: {
      fullName: "Telegram Waiter",
      telegramUserId: BigInt(111111111),
      role: UserRole.WAITER,
      branchId: branch.id
    }
  });

  await prisma.table.createMany({
    data: ["T-1", "T-2", "T-3", "T-4"].map((name, index) => ({
      branchId: branch.id,
      name,
      seatsCount: index < 2 ? 4 : 6,
      status: TableStatus.AVAILABLE
    })),
    skipDuplicates: true
  });

  const category = await prisma.category.upsert({
    where: {
      branchId_name: {
        branchId: branch.id,
        name: "Ichimliklar"
      }
    },
    update: {
      isActive: true,
      sortOrder: 1
    },
    create: {
      branchId: branch.id,
      name: "Ichimliklar",
      sortOrder: 1
    }
  });

  await prisma.product.createMany({
    data: [
      {
        branchId: branch.id,
        categoryId: category.id,
        name: "Americano",
        sku: "DR-001",
        price: new Prisma.Decimal("18000"),
        cost: new Prisma.Decimal("7000"),
        sortOrder: 1
      },
      {
        branchId: branch.id,
        categoryId: category.id,
        name: "Cappuccino",
        sku: "DR-002",
        price: new Prisma.Decimal("22000"),
        cost: new Prisma.Decimal("9000"),
        sortOrder: 2
      },
      {
        branchId: branch.id,
        categoryId: category.id,
        name: "Limonad",
        sku: "DR-003",
        price: new Prisma.Decimal("15000"),
        cost: new Prisma.Decimal("5000"),
        sortOrder: 3
      },
      {
        branchId: branch.id,
        categoryId: category.id,
        name: "Choy",
        sku: "DR-004",
        price: new Prisma.Decimal("8000"),
        cost: new Prisma.Decimal("2000"),
        sortOrder: 4
      }
    ],
    skipDuplicates: true
  });

  console.log("Seed tugadi:", {
    branch: branch.name,
    ownerPhone: owner.phone,
    waiterTelegramUserId: waiter.telegramUserId?.toString()
  });
}

main()
  .catch((error) => {
    console.error("Seed xatosi:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
