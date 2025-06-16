const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// === DOCK DOOR MANAGEMENT ===

// Get all dock doors for a warehouse
const getDockDoors = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { doorType, status } = req.query;

    const where = { warehouseId };
    if (doorType) where.doorType = doorType;
    if (status) where.status = status;

    const dockDoors = await prisma.dockDoor.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true } },
        appointments: {
          where: {
            scheduledDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
          },
          select: { id: true, scheduledTimeSlot: true, status: true }
        },
        receipts: {
          where: {
            status: { in: ['IN_PROGRESS', 'QC_PENDING'] }
          },
          select: { id: true, receiptNumber: true, status: true }
        }
      },
      orderBy: { doorNumber: 'asc' }
    });

    res.json(dockDoors);
  } catch (error) {
    console.error('Error fetching dock doors:', error);
    res.status(500).json({ error: 'Failed to fetch dock doors' });
  }
};

// Create new dock door
const createDockDoor = async (req, res) => {
  try {
    const {
      doorNumber,
      warehouseId,
      doorType = 'RECEIVING',
      equipment,
      maxTrailerSize,
      heightRestriction,
      isTemperatureControlled = false,
      notes
    } = req.body;

    if (!doorNumber || !warehouseId) {
      return res.status(400).json({ 
        error: 'Door number and warehouse ID are required' 
      });
    }

    const dockDoor = await prisma.dockDoor.create({
      data: {
        doorNumber,
        warehouseId,
        doorType,
        equipment,
        maxTrailerSize,
        heightRestriction,
        isTemperatureControlled,
        notes
      },
      include: {
        warehouse: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(dockDoor);
  } catch (error) {
    console.error('Error creating dock door:', error);
    res.status(500).json({ error: 'Failed to create dock door' });
  }
};

// Get single dock door by ID
const getDockDoorById = async (req, res) => {
  try {
    const { id } = req.params;

    const dockDoor = await prisma.dockDoor.findUnique({
      where: { id },
      include: {
        warehouse: { select: { id: true, name: true } },
        appointments: {
          include: {
            asn: { 
              select: { 
                id: true, 
                asnNumber: true,
                supplier: { select: { name: true } }
              } 
            },
            supplier: { select: { id: true, name: true } }
          },
          orderBy: { scheduledDate: 'desc' },
          take: 10
        },
        receipts: {
          include: {
            asn: { 
              select: { 
                id: true, 
                asnNumber: true,
                supplier: { select: { name: true } }
              } 
            },
            receiver: { select: { id: true, username: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!dockDoor) {
      return res.status(404).json({ error: 'Dock door not found' });
    }

    res.json(dockDoor);
  } catch (error) {
    console.error('Error fetching dock door:', error);
    res.status(500).json({ error: 'Failed to fetch dock door' });
  }
};

// Update dock door status
const updateDockDoorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const dockDoor = await prisma.dockDoor.update({
      where: { id },
      data: { status },
      include: {
        warehouse: { select: { id: true, name: true } }
      }
    });

    res.json(dockDoor);
  } catch (error) {
    console.error('Error updating dock door status:', error);
    res.status(500).json({ error: 'Failed to update dock door status' });
  }
};

// === APPOINTMENT MANAGEMENT ===

// Get all appointments for a warehouse
const getAppointments = async (req, res) => {
  try {
    const { 
      warehouseId, 
      status, 
      appointmentType,
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 20,
      sortBy = 'scheduledDate',
      sortOrder = 'asc'
    } = req.query;

    if (!warehouseId) {
      return res.status(400).json({ error: 'Warehouse ID is required' });
    }

    const skip = (page - 1) * limit;
    const where = { warehouseId };

    if (status) where.status = status;
    if (appointmentType) where.appointmentType = appointmentType;
    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate.gte = new Date(dateFrom);
      if (dateTo) where.scheduledDate.lt = new Date(dateTo);
    }

    const [appointments, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true } },
          asn: { 
            select: { 
              id: true, 
              asnNumber: true,
              supplier: { select: { name: true } }
            } 
          },
          supplier: { select: { id: true, name: true } },
          dockDoor: { select: { id: true, doorNumber: true, status: true } }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.appointment.count({ where })
    ]);

    res.json({
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

// Get single appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        warehouse: { select: { id: true, name: true } },
        asn: {
          include: {
            supplier: { select: { id: true, name: true, contactInfo: true } },
            asnItems: {
              include: {
                inventoryItem: { select: { id: true, name: true, sku: true } }
              }
            }
          }
        },
        supplier: { select: { id: true, name: true, contactInfo: true } },
        dockDoor: { 
          select: { 
            id: true, 
            doorNumber: true, 
            status: true,
            equipment: true,
            maxTrailerSize: true,
            isTemperatureControlled: true
          } 
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
};

// Create new appointment
const createAppointment = async (req, res) => {
  try {
    const {
      asnId,
      warehouseId,
      dockDoorId,
      supplierId,
      carrierName,
      driverName,
      driverPhone,
      scheduledDate,
      scheduledTimeSlot,
      duration = 120,
      appointmentType = 'RECEIVING',
      priority = 1,
      specialRequirements,
      equipment,
      notes
    } = req.body;

    if (!warehouseId || !scheduledDate || !scheduledTimeSlot) {
      return res.status(400).json({ 
        error: 'Warehouse ID, scheduled date, and time slot are required' 
      });
    }

    // Check for conflicts if dock door is specified
    if (dockDoorId) {
      const conflictingAppointments = await prisma.appointment.count({
        where: {
          dockDoorId,
          scheduledDate: new Date(scheduledDate),
          scheduledTimeSlot,
          status: { not: 'CANCELLED' }
        }
      });

      if (conflictingAppointments > 0) {
        return res.status(400).json({ 
          error: 'Time slot is already booked for this dock door' 
        });
      }
    }

    // Generate appointment number
    const appointmentCount = await prisma.appointment.count({
      where: { warehouseId }
    });
    const appointmentNumber = `APT-${Date.now()}-${appointmentCount + 1}`;

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNumber,
        asnId,
        warehouseId,
        dockDoorId,
        supplierId,
        carrierName,
        driverName,
        driverPhone,
        scheduledDate: new Date(scheduledDate),
        scheduledTimeSlot,
        duration,
        appointmentType,
        priority,
        specialRequirements,
        equipment,
        notes
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        asn: { select: { id: true, asnNumber: true } },
        supplier: { select: { id: true, name: true } },
        dockDoor: { select: { id: true, doorNumber: true } }
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.scheduledDate) {
      updates.scheduledDate = new Date(updates.scheduledDate);
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updates,
      include: {
        warehouse: { select: { id: true, name: true } },
        asn: { select: { id: true, asnNumber: true } },
        supplier: { select: { id: true, name: true } },
        dockDoor: { select: { id: true, doorNumber: true } }
      }
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

// Check-in appointment
const checkInAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { dockDoorId, actualDuration } = req.body;

    const updates = {
      status: 'CHECKED_IN',
      checkedInAt: new Date()
    };

    if (dockDoorId) updates.dockDoorId = dockDoorId;
    if (actualDuration) updates.actualDuration = actualDuration;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updates,
      include: {
        warehouse: { select: { id: true, name: true } },
        asn: { select: { id: true, asnNumber: true } },
        dockDoor: { select: { id: true, doorNumber: true } }
      }
    });

    // Update dock door status to occupied
    if (appointment.dockDoorId) {
      await prisma.dockDoor.update({
        where: { id: appointment.dockDoorId },
        data: { status: 'OCCUPIED' }
      });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error checking in appointment:', error);
    res.status(500).json({ error: 'Failed to check in appointment' });
  }
};

// Check-out appointment
const checkOutAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const checkedInAt = appointment.checkedInAt;
    const actualDuration = checkedInAt 
      ? Math.round((new Date() - new Date(checkedInAt)) / (1000 * 60)) // minutes
      : null;

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        checkedOutAt: new Date(),
        actualDuration
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        asn: { select: { id: true, asnNumber: true } },
        dockDoor: { select: { id: true, doorNumber: true } }
      }
    });

    // Update dock door status to available
    if (appointment.dockDoorId) {
      await prisma.dockDoor.update({
        where: { id: appointment.dockDoorId },
        data: { status: 'AVAILABLE' }
      });
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Error checking out appointment:', error);
    res.status(500).json({ error: 'Failed to check out appointment' });
  }
};

// Get available time slots for a dock door
const getAvailableTimeSlots = async (req, res) => {
  try {
    const { dockDoorId, date } = req.query;

    if (!dockDoorId || !date) {
      return res.status(400).json({ 
        error: 'Dock door ID and date are required' 
      });
    }

    const selectedDate = new Date(date);
    
    // Get existing appointments for the date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        dockDoorId,
        scheduledDate: selectedDate,
        status: { not: 'CANCELLED' }
      },
      select: { scheduledTimeSlot: true }
    });

    // Generate all possible time slots (24 hours, 2-hour slots)
    const allTimeSlots = [];
    for (let hour = 6; hour < 22; hour += 2) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 2).toString().padStart(2, '0')}:00`;
      allTimeSlots.push(`${startTime}-${endTime}`);
    }

    // Filter out occupied slots
    const occupiedSlots = existingAppointments.map(apt => apt.scheduledTimeSlot);
    const availableSlots = allTimeSlots.filter(slot => !occupiedSlots.includes(slot));

    res.json({ availableSlots, occupiedSlots });
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    res.status(500).json({ error: 'Failed to fetch available time slots' });
  }
};

// Get dock management statistics
const getDockStats = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const where = { warehouseId };
    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate.gte = new Date(dateFrom);
      if (dateTo) where.scheduledDate.lte = new Date(dateTo);
    }

    const [
      totalAppointments,
      statusCounts,
      todayAppointments,
      dockUtilization,
      avgDuration
    ] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),
      prisma.appointment.count({
        where: {
          ...where,
          scheduledDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      prisma.dockDoor.groupBy({
        by: ['status'],
        where: { warehouseId },
        _count: { status: true }
      }),
      prisma.appointment.aggregate({
        _avg: { actualDuration: true },
        where: {
          ...where,
          actualDuration: { not: null }
        }
      })
    ]);

    const stats = {
      totalAppointments,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      todayAppointments,
      dockUtilization: dockUtilization.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      avgDuration: avgDuration._avg.actualDuration
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dock statistics:', error);
    res.status(500).json({ error: 'Failed to fetch dock statistics' });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        dockDoor: { select: { id: true, doorNumber: true } }
      }
    });

    // Free up dock door if it was occupied
    if (appointment.dockDoorId && appointment.status === 'CHECKED_IN') {
      await prisma.dockDoor.update({
        where: { id: appointment.dockDoorId },
        data: { status: 'AVAILABLE' }
      });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};

module.exports = {
  // Dock Door Management
  getDockDoors,
  getDockDoorById,
  createDockDoor,
  updateDockDoorStatus,
  
  // Appointment Management
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  checkInAppointment,
  checkOutAppointment,
  getAvailableTimeSlots,
  getDockStats,
  cancelAppointment
}; 