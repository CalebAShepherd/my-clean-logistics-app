const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignWorkerToWarehouse() {
  try {
    console.log('🔍 Looking for warehouse workers and warehouses...');

    // Find all warehouse workers
    const warehouseWorkers = await prisma.user.findMany({
      where: {
        role: 'warehouse_worker'
      },
      select: {
        id: true,
        username: true,
        email: true,
        warehouseId: true
      }
    });

    console.log(`Found ${warehouseWorkers.length} warehouse workers:`);
    warehouseWorkers.forEach(worker => {
      console.log(`- ${worker.username} (${worker.email}) - Warehouse: ${worker.warehouseId || 'None'}`);
    });

    // Find the Upland Warehouse
    const uplandWarehouse = await prisma.warehouse.findFirst({
      where: {
        name: {
          contains: 'Upland',
          mode: 'insensitive'
        }
      }
    });

    if (!uplandWarehouse) {
      console.log('❌ Upland Warehouse not found. Available warehouses:');
      const allWarehouses = await prisma.warehouse.findMany({
        select: { id: true, name: true }
      });
      allWarehouses.forEach(wh => {
        console.log(`- ${wh.name} (ID: ${wh.id})`);
      });
      return;
    }

    console.log(`✅ Found Upland Warehouse: ${uplandWarehouse.name} (ID: ${uplandWarehouse.id})`);

    // Find workers not assigned to any warehouse
    const unassignedWorkers = warehouseWorkers.filter(worker => !worker.warehouseId);
    
    if (unassignedWorkers.length === 0) {
      console.log('✅ All warehouse workers are already assigned to warehouses.');
      return;
    }

    console.log(`\n🔧 Assigning ${unassignedWorkers.length} unassigned workers to Upland Warehouse...`);

    // Assign each unassigned worker to the Upland Warehouse
    for (const worker of unassignedWorkers) {
      await prisma.user.update({
        where: { id: worker.id },
        data: { warehouseId: uplandWarehouse.id }
      });
      console.log(`✅ Assigned ${worker.username} to ${uplandWarehouse.name}`);
    }

    console.log('\n🎉 Successfully assigned warehouse workers to Upland Warehouse!');

  } catch (error) {
    console.error('❌ Error assigning workers to warehouse:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
assignWorkerToWarehouse(); 