const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🗑  Deleting all warehouse items referencing locations...');
  const deletedItems = await prisma.warehouseItem.deleteMany();
  console.log(`✅ Deleted ${deletedItems.count} warehouse item records.`);

  console.log('🗑  Deleting all stored bin locations...');
  const deletedLocations = await prisma.location.deleteMany();
  console.log(`✅ Deleted ${deletedLocations.count} location records.`);
}

main()
  .catch((e) => {
    console.error('Error deleting locations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 