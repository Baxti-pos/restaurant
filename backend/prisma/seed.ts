import { Prisma, PrismaClient, TableStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ownerPhone = process.env.SEED_OWNER_PHONE || "+998901234567";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "admin123";
  const ownerFullName = process.env.SEED_OWNER_FULLNAME || "Baxti Owner";
  const waiterPhone = process.env.SEED_WAITER_PHONE || "+998911111111";
  const waiterPassword = process.env.SEED_WAITER_PASSWORD || "waiter123";

  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10);
  const waiterPasswordHash = await bcrypt.hash(waiterPassword, 10);

  const owner = await prisma.user.upsert({
    where: { phone: ownerPhone },
    update: {
      fullName: ownerFullName,
      role: UserRole.OWNER,
      passwordHash: ownerPasswordHash,
      isActive: true,
    },
    create: {
      fullName: ownerFullName,
      phone: ownerPhone,
      passwordHash: ownerPasswordHash,
      role: UserRole.OWNER,
    },
  });

  const branch = await prisma.branch.upsert({
    where: { name: "Chilonzor filiali" },
    update: {
      ownerId: owner.id,
      shiftEnd: "23:00",
      isActive: true,
    },
    create: {
      name: "Chilonzor filiali",
      ownerId: owner.id,
      shiftEnd: "23:00",
    },
  });

  const waiter = await prisma.user.upsert({
    where: { phone: waiterPhone },
    update: {
      fullName: "Girgitton",
      phone: waiterPhone,
      passwordHash: waiterPasswordHash,
      role: UserRole.WAITER,
      branchId: branch.id,
      salesSharePercent: new Prisma.Decimal("8.00"),
      isActive: true,
    },
    create: {
      fullName: "Girgitton",
      phone: waiterPhone,
      passwordHash: waiterPasswordHash,
      salesSharePercent: new Prisma.Decimal("8.00"),
      role: UserRole.WAITER,
      branchId: branch.id,
    },
  });

  await prisma.table.createMany({
    data: ["T-1", "T-2", "T-3", "T-4"].map((name, index) => ({
      branchId: branch.id,
      name,
      seatsCount: index < 2 ? 4 : 6,
      status: TableStatus.AVAILABLE,
    })),
    skipDuplicates: true,
  });

  const category = await prisma.category.upsert({
    where: {
      branchId_name: {
        branchId: branch.id,
        name: "Ichimliklar",
      },
    },
    update: {
      isActive: true,
      sortOrder: 1,
    },
    create: {
      branchId: branch.id,
      name: "Ichimliklar",
      sortOrder: 1,
    },
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
        sortOrder: 1,
      },
      {
        branchId: branch.id,
        categoryId: category.id,
        name: "Cappuccino",
        sku: "DR-002",
        price: new Prisma.Decimal("22000"),
        cost: new Prisma.Decimal("9000"),
        sortOrder: 2,
      },
      {
        branchId: branch.id,
        categoryId: category.id,
        name: "Limonad",
        sku: "DR-003",
        price: new Prisma.Decimal("15000"),
        cost: new Prisma.Decimal("5000"),
        sortOrder: 3,
      },
      {
        branchId: branch.id,
        categoryId: category.id,
        name: "Choy",
        sku: "DR-004",
        price: new Prisma.Decimal("8000"),
        cost: new Prisma.Decimal("2000"),
        sortOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed tugadi:", {
    branch: branch.name,
    ownerPhone: owner.phone,
    waiterPhone: waiter.phone,
    waiterPassword,
    waiterSalesSharePercent: waiter.salesSharePercent.toString(),
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
