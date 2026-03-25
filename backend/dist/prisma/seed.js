import { InventoryUnit, Prisma, PrismaClient, TableStatus, UserRole } from "@prisma/client";
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
            isActive: true
        },
        create: {
            fullName: ownerFullName,
            phone: ownerPhone,
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
        where: { phone: waiterPhone },
        update: {
            fullName: "Girgitton",
            phone: waiterPhone,
            passwordHash: waiterPasswordHash,
            role: UserRole.WAITER,
            branchId: branch.id,
            salesSharePercent: new Prisma.Decimal("8.00"),
            isActive: true
        },
        create: {
            fullName: "Girgitton",
            phone: waiterPhone,
            passwordHash: waiterPasswordHash,
            salesSharePercent: new Prisma.Decimal("8.00"),
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
    const productDefinitions = [
        {
            name: "Americano",
            sku: "DR-001",
            price: new Prisma.Decimal("18000"),
            cost: new Prisma.Decimal("7000"),
            sortOrder: 1
        },
        {
            name: "Cappuccino",
            sku: "DR-002",
            price: new Prisma.Decimal("22000"),
            cost: new Prisma.Decimal("9000"),
            sortOrder: 2
        },
        {
            name: "Limonad",
            sku: "DR-003",
            price: new Prisma.Decimal("15000"),
            cost: new Prisma.Decimal("5000"),
            sortOrder: 3
        },
        {
            name: "Choy",
            sku: "DR-004",
            price: new Prisma.Decimal("8000"),
            cost: new Prisma.Decimal("2000"),
            sortOrder: 4
        }
    ];
    const products = await Promise.all(productDefinitions.map((definition) => prisma.product.upsert({
        where: {
            branchId_categoryId_name: {
                branchId: branch.id,
                categoryId: category.id,
                name: definition.name
            }
        },
        update: {
            sku: definition.sku,
            price: definition.price,
            cost: definition.cost,
            sortOrder: definition.sortOrder,
            isActive: true
        },
        create: {
            branchId: branch.id,
            categoryId: category.id,
            name: definition.name,
            sku: definition.sku,
            price: definition.price,
            cost: definition.cost,
            sortOrder: definition.sortOrder
        }
    })));
    const ingredientDefinitions = [
        {
            name: "Kofe doni",
            unit: InventoryUnit.GRAM,
            minQty: new Prisma.Decimal("500"),
            currentQty: new Prisma.Decimal("5000"),
            avgUnitCost: new Prisma.Decimal("250")
        },
        {
            name: "Sut",
            unit: InventoryUnit.MILLILITER,
            minQty: new Prisma.Decimal("2000"),
            currentQty: new Prisma.Decimal("18000"),
            avgUnitCost: new Prisma.Decimal("5")
        },
        {
            name: "Stakan",
            unit: InventoryUnit.PIECE,
            minQty: new Prisma.Decimal("50"),
            currentQty: new Prisma.Decimal("300"),
            avgUnitCost: new Prisma.Decimal("1200")
        },
        {
            name: "Qopqoq",
            unit: InventoryUnit.PIECE,
            minQty: new Prisma.Decimal("50"),
            currentQty: new Prisma.Decimal("300"),
            avgUnitCost: new Prisma.Decimal("300")
        },
        {
            name: "Choy bargi",
            unit: InventoryUnit.GRAM,
            minQty: new Prisma.Decimal("200"),
            currentQty: new Prisma.Decimal("2500"),
            avgUnitCost: new Prisma.Decimal("60")
        },
        {
            name: "Limon siropi",
            unit: InventoryUnit.MILLILITER,
            minQty: new Prisma.Decimal("1000"),
            currentQty: new Prisma.Decimal("7000"),
            avgUnitCost: new Prisma.Decimal("8")
        },
        {
            name: "Gazli suv",
            unit: InventoryUnit.MILLILITER,
            minQty: new Prisma.Decimal("2000"),
            currentQty: new Prisma.Decimal("15000"),
            avgUnitCost: new Prisma.Decimal("2")
        }
    ];
    const ingredientEntries = await Promise.all(ingredientDefinitions.map((definition) => prisma.ingredient.upsert({
        where: {
            branchId_name: {
                branchId: branch.id,
                name: definition.name
            }
        },
        update: {
            unit: definition.unit,
            minQty: definition.minQty,
            currentQty: definition.currentQty,
            avgUnitCost: definition.avgUnitCost,
            isActive: true
        },
        create: {
            branchId: branch.id,
            name: definition.name,
            unit: definition.unit,
            minQty: definition.minQty,
            currentQty: definition.currentQty,
            avgUnitCost: definition.avgUnitCost,
            isActive: true
        }
    })));
    const productMap = new Map(products.map((product) => [product.name, product]));
    const ingredientMap = new Map(ingredientEntries.map((ingredient) => [ingredient.name, ingredient]));
    const recipeDefinitions = [
        {
            productName: "Americano",
            note: "1 stakan americano retsepti",
            items: [
                { ingredientName: "Kofe doni", quantity: new Prisma.Decimal("18") },
                { ingredientName: "Stakan", quantity: new Prisma.Decimal("1") },
                { ingredientName: "Qopqoq", quantity: new Prisma.Decimal("1") }
            ]
        },
        {
            productName: "Cappuccino",
            note: "1 stakan cappuccino retsepti",
            items: [
                { ingredientName: "Kofe doni", quantity: new Prisma.Decimal("18") },
                { ingredientName: "Sut", quantity: new Prisma.Decimal("150") },
                { ingredientName: "Stakan", quantity: new Prisma.Decimal("1") },
                { ingredientName: "Qopqoq", quantity: new Prisma.Decimal("1") }
            ]
        },
        {
            productName: "Limonad",
            note: "1 porsiya limonad retsepti",
            items: [
                { ingredientName: "Limon siropi", quantity: new Prisma.Decimal("40") },
                { ingredientName: "Gazli suv", quantity: new Prisma.Decimal("250") },
                { ingredientName: "Stakan", quantity: new Prisma.Decimal("1") },
                { ingredientName: "Qopqoq", quantity: new Prisma.Decimal("1") }
            ]
        },
        {
            productName: "Choy",
            note: "1 choy retsepti",
            items: [
                { ingredientName: "Choy bargi", quantity: new Prisma.Decimal("8") },
                { ingredientName: "Stakan", quantity: new Prisma.Decimal("1") }
            ]
        }
    ];
    for (const recipeDefinition of recipeDefinitions) {
        const product = productMap.get(recipeDefinition.productName);
        if (!product) {
            continue;
        }
        const recipe = await prisma.productRecipe.upsert({
            where: { productId: product.id },
            update: {
                branchId: branch.id,
                note: recipeDefinition.note,
                isActive: true
            },
            create: {
                branchId: branch.id,
                productId: product.id,
                note: recipeDefinition.note,
                isActive: true
            }
        });
        await prisma.productRecipeItem.deleteMany({
            where: { recipeId: recipe.id }
        });
        await prisma.productRecipeItem.createMany({
            data: recipeDefinition.items.map((item) => {
                const ingredient = ingredientMap.get(item.ingredientName);
                if (!ingredient) {
                    throw new Error(`${item.ingredientName} ingredient topilmadi`);
                }
                return {
                    recipeId: recipe.id,
                    ingredientId: ingredient.id,
                    quantity: item.quantity
                };
            })
        });
    }
    console.log("Seed tugadi:", {
        branch: branch.name,
        ownerPhone: owner.phone,
        waiterPhone: waiter.phone,
        waiterPassword,
        waiterSalesSharePercent: waiter.salesSharePercent.toString(),
        ingredientsCount: ingredientEntries.length,
        recipesCount: recipeDefinitions.length
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
