const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listTickets = async (req, res) => {
  try {
    const { tenantId } = req.user || {};
    const tickets = await prisma.ticket.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (err) {
    console.error('Error listing tickets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getTicket = async (req, res) => {
  const { id } = req.params;
  try {
    const ticket = await prisma.ticket.findUnique({ 
      where: { id },
      include: {
        account: {
          include: {
            contacts: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    console.error('Error getting ticket:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createTicket = async (req, res) => {
  const { subject, description, priority, accountId, assigneeId } = req.body;
  try {
    const { tenantId } = req.user || {};
    
    // If no accountId provided, find or create a default "General Support" account
    let finalAccountId = accountId;
    if (!finalAccountId) {
      const defaultAccount = await prisma.account.findFirst({
        where: { 
          tenantId,
          name: 'General Support'
        }
      });
      
      if (defaultAccount) {
        finalAccountId = defaultAccount.id;
      } else {
        // Create a default account for general support tickets
        const newAccount = await prisma.account.create({
          data: {
            name: 'General Support',
            type: 'CUSTOMER',
            tenantId
          }
        });
        finalAccountId = newAccount.id;
      }
    }
    
    const ticket = await prisma.ticket.create({
      data: { 
        subject, 
        description, 
        priority, 
        accountId: finalAccountId, 
        assigneeId, 
        tenantId 
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    res.status(201).json(ticket);
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateTicket = async (req, res) => {
  const { id } = req.params;
  const { subject, description, status, priority, assigneeId } = req.body;
  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { subject, description, status, priority, assigneeId },
    });
    res.json(ticket);
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteTicket = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.ticket.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting ticket:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 