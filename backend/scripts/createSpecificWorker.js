const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createWarehouseWorker() {
  try {
    console.log('Creating warehouse worker account...');

    // Hash the specific password
    const hashedPassword = await bcrypt.hash('J316_fgsltw', 10);
    
    // Create the warehouse worker with specified credentials
    const worker = await prisma.user.upsert({
      where: { email: 'warehouseworker@test.com' },
      update: {
        username: 'Warehouse Worker',
        password: hashedPassword,
        role: 'warehouse_worker'
      },
      create: {
        email: 'warehouseworker@test.com',
        username: 'Warehouse Worker',
        password: hashedPassword,
        role: 'warehouse_worker',
        phone: '+1555123456'
      }
    });

    console.log('✅ Warehouse worker account created successfully!');
    console.log('\n📋 Account Details:');
    console.log('📧 Email: warehouseworker@test.com');
    console.log('👤 Username: Warehouse Worker');
    console.log('🔑 Password: J316_fgsltw');
    console.log('👔 Role: warehouse_worker');
    console.log(`🆔 User ID: ${worker.id}`);

    // Check if we have a warehouse to assign tasks to
    const warehouse = await prisma.warehouse.findFirst();
    if (warehouse) {
      console.log(`🏭 Available Warehouse: ${warehouse.name}`);
    } else {
      console.log('⚠️  No warehouse found. Run the demo script to create sample data.');
    }

    console.log('\n🎉 Ready to login and test the warehouse worker dashboard!');

  } catch (error) {
    console.error('❌ Error creating warehouse worker:', error);
    if (error.code === 'P2002') {
      console.log('💡 User already exists - account was updated with new credentials');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createWarehouseWorker()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 