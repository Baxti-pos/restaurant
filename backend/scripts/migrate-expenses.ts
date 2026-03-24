import { prisma } from "../src/prisma.js";

const EXPENSE_META_PREFIX = '__baxti_expense_meta__:';

const normalizeExpenseType = (value: unknown) => {
  if (value === 'salary' || value === 'market' || value === 'other') {
    return value;
  }
  return 'other';
};

const decodeExpenseDescription = (description: string | null) => {
  if (!description || !description.startsWith(EXPENSE_META_PREFIX)) {
    return { type: 'other', note: description || '' };
  }

  const encoded = description.slice(EXPENSE_META_PREFIX.length);
  try {
    const parsed = JSON.parse(encoded);
    return {
      type: normalizeExpenseType(parsed.type),
      note: typeof parsed.note === 'string' ? parsed.note : ''
    };
  } catch {
    return { type: 'other', note: '' };
  }
};

async function migrate() {
  console.log("Starting expense migration...");
  
  const branches = await prisma.branch.findMany();
  
  for (const branch of branches) {
    console.log(`Processing branch: ${branch.name} (${branch.id})`);
    
    // Create default categories for this branch
    const categories = {
      salary: await (prisma as any).expenseCategory.upsert({
        where: { branchId_name: { branchId: branch.id, name: "Ish haqi" } },
        update: {},
        create: { branchId: branch.id, name: "Ish haqi" }
      }),
      market: await (prisma as any).expenseCategory.upsert({
        where: { branchId_name: { branchId: branch.id, name: "Bozor xarajati" } },
        update: {},
        create: { branchId: branch.id, name: "Bozor xarajati" }
      }),
      other: await (prisma as any).expenseCategory.upsert({
        where: { branchId_name: { branchId: branch.id, name: "Boshqa xarajat" } },
        update: {},
        create: { branchId: branch.id, name: "Boshqa xarajat" }
      })
    };

    const expenses = await prisma.expense.findMany({
      where: { branchId: branch.id }
    });

    console.log(`Found ${expenses.length} expenses in branch ${branch.name}`);

    for (const expense of expenses) {
      const decoded = decodeExpenseDescription(expense.description);
      const categoryId = categories[decoded.type as keyof typeof categories].id;

      await (prisma as any).expense.update({
        where: { id: expense.id },
        data: {
          categoryId,
          description: decoded.note || null
        }
      });
    }
  }

  console.log("Migration completed successfully.");
}

migrate()
  .catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
