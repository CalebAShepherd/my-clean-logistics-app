const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTenantIds() {
  try {
    console.log('🔍 Checking tenant and user data...');

    // Check if any tenants exist
    const existingTenants = await prisma.tenant.findMany();
    console.log(`Found ${existingTenants.length} existing tenants`);

    let defaultTenant;

    if (existingTenants.length === 0) {
      // Create a default tenant
      console.log('📝 Creating default tenant...');
      defaultTenant = await prisma.tenant.create({
        data: {
          name: 'Default Company',
        }
      });
      console.log(`✅ Created default tenant: ${defaultTenant.name} (${defaultTenant.id})`);
    } else {
      // Use the first existing tenant
      defaultTenant = existingTenants[0];
      console.log(`✅ Using existing tenant: ${defaultTenant.name} (${defaultTenant.id})`);
    }

    // Find all users without a tenantId
    const usersWithoutTenant = await prisma.user.findMany({
      where: {
        tenantId: null
      },
      select: {
        id: true,
        email: true,
        username: true,
        tenantId: true
      }
    });

    console.log(`Found ${usersWithoutTenant.length} users without tenantId`);

    if (usersWithoutTenant.length > 0) {
      console.log('📝 Assigning default tenantId to users...');
      
      // Update all users without tenantId
      const updateResult = await prisma.user.updateMany({
        where: {
          tenantId: null
        },
        data: {
          tenantId: defaultTenant.id
        }
      });

      console.log(`✅ Updated ${updateResult.count} users with tenantId: ${defaultTenant.id}`);

      // Verify the update
      const usersWithTenant = await prisma.user.findMany({
        where: {
          tenantId: defaultTenant.id
        },
        select: {
          id: true,
          email: true,
          username: true,
          tenantId: true
        }
      });

      console.log('📋 Users now assigned to tenant:');
      usersWithTenant.forEach(user => {
        console.log(`  - ${user.username} (${user.email})`);
      });
    } else {
      console.log('✅ All users already have tenantId assigned');
    }

    // Summary
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        tenantId: true
      }
    });

    const usersWithTenantCount = allUsers.filter(u => u.tenantId).length;
    const usersWithoutTenantCount = allUsers.filter(u => !u.tenantId).length;

    console.log('\n📊 Summary:');
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Users with tenantId: ${usersWithTenantCount}`);
    console.log(`Users without tenantId: ${usersWithoutTenantCount}`);
    console.log(`Default tenant: ${defaultTenant.name} (${defaultTenant.id})`);

    if (usersWithoutTenantCount === 0) {
      console.log('\n🎉 All users now have tenantId assigned!');
    }

  } catch (error) {
    console.error('❌ Error fixing tenant IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixTenantIds(); 