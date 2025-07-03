const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createCRMSampleData() {
  try {
    console.log('🚀 Creating CRM sample data...');

    // Get the first tenant (assuming there's at least one)
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error('❌ No tenant found. Please create a tenant first.');
      return;
    }
    console.log(`✅ Using tenant: ${tenant.name}`);

    // Clean up existing CRM data to avoid conflicts
    console.log('🧹 Cleaning up existing CRM data...');
    await prisma.quote.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.ticket.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.task.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.lead.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.deal.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.account.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.user.deleteMany({ 
      where: { 
        tenantId: tenant.id,
        role: { in: ['crm_admin', 'sales_rep', 'account_manager'] }
      }
    });
    console.log('✅ Cleanup complete');

    // Create CRM users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const crmAdmin = await prisma.user.upsert({
      where: { email: 'crm.admin@company.com' },
      update: {},
      create: {
        email: 'crm.admin@company.com',
        username: 'crmadmin',
        password: hashedPassword,
        role: 'crm_admin',
        tenantId: tenant.id,
      },
    });

    const salesRep1 = await prisma.user.upsert({
      where: { email: 'sales.rep1@company.com' },
      update: {},
      create: {
        email: 'sales.rep1@company.com',
        username: 'salesrep1',
        password: hashedPassword,
        role: 'sales_rep',
        tenantId: tenant.id,
      },
    });

    const salesRep2 = await prisma.user.upsert({
      where: { email: 'sales.rep2@company.com' },
      update: {},
      create: {
        email: 'sales.rep2@company.com',
        username: 'salesrep2',
        password: hashedPassword,
        role: 'sales_rep',
        tenantId: tenant.id,
      },
    });

    const accountManager = await prisma.user.upsert({
      where: { email: 'account.manager@company.com' },
      update: {},
      create: {
        email: 'account.manager@company.com',
        username: 'accountmgr',
        password: hashedPassword,
        role: 'account_manager',
        tenantId: tenant.id,
      },
    });

    console.log('✅ Created CRM users');

    // Create sample accounts
    const accounts = await Promise.all([
      prisma.account.create({
        data: {
          name: 'TechCorp Solutions',
          description: 'Large technology solutions provider - Enterprise',
          tenantId: tenant.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Global Logistics Inc',
          description: 'International shipping and logistics company - Business',
          tenantId: tenant.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Retail Chain Partners',
          description: 'Multi-location retail chain - Business',
          tenantId: tenant.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Manufacturing Plus',
          description: 'Industrial manufacturing company - Enterprise',
          tenantId: tenant.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'StartupXYZ',
          description: 'Fast-growing e-commerce startup - Small Business',
          tenantId: tenant.id,
        },
      }),
    ]);

    console.log('✅ Created sample accounts');

    // Create sample leads
    const leads = await Promise.all([
      prisma.lead.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@prospectcorp.com',
          phone: '+1-555-0201',
          companyName: 'Prospect Corp',
          status: 'NEW',
          source: 'Website',
          ownerId: salesRep1.id,
          tenantId: tenant.id,
        },
      }),
      prisma.lead.create({
        data: {
          firstName: 'Lisa',
          lastName: 'Wong',
          email: 'lisa.wong@futuretech.com',
          phone: '+1-555-0202',
          companyName: 'Future Tech Solutions',
          status: 'QUALIFIED',
          source: 'Cold Call',
          ownerId: salesRep1.id,
          tenantId: tenant.id,
        },
      }),
      prisma.lead.create({
        data: {
          firstName: 'Robert',
          lastName: 'Davis',
          email: 'robert.davis@innovate.com',
          phone: '+1-555-0203',
          companyName: 'Innovate Industries',
          status: 'QUALIFIED',
          source: 'Referral',
          ownerId: salesRep2.id,
          tenantId: tenant.id,
        },
      }),
      prisma.lead.create({
        data: {
          firstName: 'Maria',
          lastName: 'Garcia',
          email: 'maria.garcia@growthco.com',
          phone: '+1-555-0204',
          companyName: 'Growth Co',
          status: 'QUALIFIED',
          source: 'Trade Show',
          ownerId: salesRep2.id,
          tenantId: tenant.id,
        },
      }),
      prisma.lead.create({
        data: {
          firstName: 'James',
          lastName: 'Wilson',
          email: 'james.wilson@dynamicllc.com',
          phone: '+1-555-0205',
          companyName: 'Dynamic LLC',
          status: 'CONVERTED',
          source: 'LinkedIn',
          ownerId: salesRep1.id,
          accountId: accounts[0].id,
          tenantId: tenant.id,
        },
      }),
    ]);

    console.log('✅ Created sample leads');

    // Create sample tasks
    const tasks = await Promise.all([
      prisma.task.create({
        data: {
          title: 'Follow up with TechCorp Solutions',
          description: 'Schedule quarterly business review meeting',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          completed: false,
          assigneeId: accountManager.id,
          accountId: accounts[0].id,
          tenantId: tenant.id,
        },
      }),
      prisma.task.create({
        data: {
          title: 'Prepare proposal for Global Logistics',
          description: 'Create detailed logistics solution proposal',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          completed: false,
          assigneeId: salesRep1.id,
          accountId: accounts[1].id,
          tenantId: tenant.id,
        },
      }),
      prisma.task.create({
        data: {
          title: 'Demo setup for Retail Chain Partners',
          description: 'Configure demo environment for product showcase',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          completed: false,
          assigneeId: salesRep2.id,
          accountId: accounts[2].id,
          tenantId: tenant.id,
        },
      }),
      prisma.task.create({
        data: {
          title: 'Contract renewal discussion',
          description: 'Discuss contract terms for renewal with Manufacturing Plus',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          completed: false,
          assigneeId: accountManager.id,
          accountId: accounts[3].id,
          tenantId: tenant.id,
        },
      }),
      prisma.task.create({
        data: {
          title: 'Onboarding call with StartupXYZ',
          description: 'Welcome call and setup initial requirements',
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
          completed: true,
          assigneeId: salesRep1.id,
          accountId: accounts[4].id,
          tenantId: tenant.id,
        },
      }),
    ]);

    console.log('✅ Created sample tasks');

    // Create sample support tickets
    const tickets = await Promise.all([
      prisma.ticket.create({
        data: {
          subject: 'Shipment tracking not updating',
          description: 'Customer reports that shipment #12345 tracking has not updated for 48 hours',
          status: 'OPEN',
          priority: 'HIGH',
          assigneeId: accountManager.id,
          accountId: accounts[0].id,
          tenantId: tenant.id,
        },
      }),
      prisma.ticket.create({
        data: {
          subject: 'Invoice discrepancy',
          description: 'Customer questions charges on invoice #INV-2024-001',
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          assigneeId: accountManager.id,
          accountId: accounts[1].id,
          tenantId: tenant.id,
        },
      }),
      prisma.ticket.create({
        data: {
          subject: 'API integration support needed',
          description: 'Customer needs help integrating with our API for automated bookings',
          status: 'OPEN',
          priority: 'NORMAL',
          assigneeId: accountManager.id,
          accountId: accounts[2].id,
          tenantId: tenant.id,
        },
      }),
      prisma.ticket.create({
        data: {
          subject: 'Delivery address change request',
          description: 'Customer needs to change delivery address for pending shipments',
          status: 'CLOSED',
          priority: 'LOW',
          assigneeId: accountManager.id,
          accountId: accounts[3].id,
          tenantId: tenant.id,
        },
      }),
      prisma.ticket.create({
        data: {
          subject: 'Service upgrade inquiry',
          description: 'Customer interested in upgrading to premium service tier',
          status: 'OPEN',
          priority: 'LOW',
          assigneeId: accountManager.id,
          accountId: accounts[4].id,
          tenantId: tenant.id,
        },
      }),
    ]);

    console.log('✅ Created sample support tickets');

    // Create sample deals first (required for quotes)
    const deals = await Promise.all([
      prisma.deal.create({
        data: {
          title: 'TechCorp Logistics Solution',
          amount: 25000.00,
          stage: 'PROSPECTING',
          accountId: accounts[0].id,
          tenantId: tenant.id,
        },
      }),
      prisma.deal.create({
        data: {
          title: 'Global Logistics Partnership',
          amount: 15000.00,
          stage: 'PROPOSAL',
          accountId: accounts[1].id,
          tenantId: tenant.id,
        },
      }),
    ]);

    // Create sample quotes
    const quotes = await Promise.all([
      prisma.quote.create({
        data: {
          title: 'Logistics Solution for TechCorp',
          amount: 25000.00,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          dealId: deals[0].id,
          tenantId: tenant.id,
        },
      }),
      prisma.quote.create({
        data: {
          title: 'International Shipping Package',
          amount: 15000.00,
          validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          dealId: deals[1].id,
          tenantId: tenant.id,
        },
      }),
    ]);

    console.log('✅ Created sample quotes');

    console.log('\n🎉 CRM Sample Data Creation Complete!');
    console.log('\n📧 Test User Accounts Created:');
    console.log('CRM Admin: crm.admin@company.com / password123 (Sarah Johnson)');
    console.log('Sales Rep 1: sales.rep1@company.com / password123 (Mike Rodriguez)');
    console.log('Sales Rep 2: sales.rep2@company.com / password123 (Emily Chen)');
    console.log('Account Manager: account.manager@company.com / password123 (David Thompson)');
    
    console.log('\n📊 Sample Data Summary:');
    console.log(`- ${accounts.length} Accounts created`);
    console.log(`- ${leads.length} Leads created`);
    console.log(`- ${tasks.length} Tasks created`);
    console.log(`- ${tickets.length} Support tickets created`);
    console.log(`- ${deals.length} Deals created`);
    console.log(`- ${quotes.length} Quotes created`);

  } catch (error) {
    console.error('❌ Error creating CRM sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createCRMSampleData(); 