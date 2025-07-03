const prisma = require('../services/prisma');

class LoadingTaskController {
  
  // Create a loading/unloading task for a shipment
  async createLoadingTask(req, res) {
    try {
      const { shipmentId, taskType, priority = 'MEDIUM', workersRequired = 2, dockDoorId, scheduledStartTime, notes } = req.body;
      
      // Validate required fields
      if (!shipmentId || !taskType) {
        return res.status(400).json({ error: 'shipmentId and taskType are required' });
      }

      // Get shipment details to determine warehouse
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { warehouse: true }
      });

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      if (!shipment.warehouseId) {
        return res.status(400).json({ error: 'Shipment must be assigned to a warehouse first' });
      }

      // Calculate estimated duration based on shipment size
      const estimatedDuration = this.calculateEstimatedDuration(shipment, taskType);
      
      // Calculate workers required based on shipment volume and warehouse capacity
      const calculatedWorkersRequired = this.calculateWorkersRequired(shipment, workersRequired);

      // Create the loading task
      const loadingTask = await prisma.shipmentLoadingTask.create({
        data: {
          shipmentId,
          warehouseId: shipment.warehouseId,
          taskType,
          priority,
          workersRequired: calculatedWorkersRequired,
          dockDoorId,
          scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : null,
          estimatedDuration,
          notes
        },
        include: {
          shipment: true,
          warehouse: true,
          dockDoor: true,
          workerAssignments: {
            include: {
              worker: {
                select: { id: true, username: true, email: true }
              }
            }
          }
        }
      });

      res.status(201).json(loadingTask);
    } catch (error) {
      console.error('Error creating loading task:', error);
      res.status(500).json({ error: 'Failed to create loading task' });
    }
  }

  // Automatically assign workers to a loading task based on workload
  async autoAssignWorkers(req, res) {
    try {
      const { id } = req.params;
      
      const loadingTask = await prisma.shipmentLoadingTask.findUnique({
        where: { id },
        include: {
          warehouse: true,
          workerAssignments: true
        }
      });

      if (!loadingTask) {
        return res.status(404).json({ error: 'Loading task not found' });
      }

      if (loadingTask.status !== 'PENDING') {
        return res.status(400).json({ error: 'Can only assign workers to pending tasks' });
      }

      // Get available workers with current workload
      const availableWorkers = await this.getAvailableWorkersByWorkload(loadingTask.warehouseId);
      
      if (availableWorkers.length === 0) {
        return res.status(400).json({ error: 'No available workers found' });
      }

      // Calculate how many workers we still need
      const workersNeeded = loadingTask.workersRequired - loadingTask.workersAssigned;
      const workersToAssign = Math.min(workersNeeded, availableWorkers.length);

      // Assign the workers with the lowest workload
      const selectedWorkers = availableWorkers.slice(0, workersToAssign);
      
      // Create worker assignments
      const assignments = await Promise.all(
        selectedWorkers.map(worker =>
          prisma.loadingTaskAssignment.create({
            data: {
              loadingTaskId: id,
              workerId: worker.id
            },
            include: {
              worker: {
                select: { id: true, username: true, email: true }
              }
            }
          })
        )
      );

      // Update the loading task
      const updatedTask = await prisma.shipmentLoadingTask.update({
        where: { id },
        data: {
          workersAssigned: loadingTask.workersAssigned + workersToAssign,
          status: workersToAssign >= workersNeeded ? 'ASSIGNED' : 'PENDING'
        },
        include: {
          shipment: true,
          warehouse: true,
          dockDoor: true,
          workerAssignments: {
            include: {
              worker: {
                select: { id: true, username: true, email: true }
              }
            }
          }
        }
      });

      res.json({
        task: updatedTask,
        newAssignments: assignments,
        message: `Successfully assigned ${workersToAssign} workers to the loading task`
      });
    } catch (error) {
      console.error('Error auto-assigning workers:', error);
      res.status(500).json({ error: 'Failed to assign workers' });
    }
  }

  // Get all loading tasks for a warehouse
  async getLoadingTasks(req, res) {
    try {
      const { warehouseId } = req.params;
      const { status, taskType } = req.query;

      const where = {
        warehouseId,
        ...(status && { status }),
        ...(taskType && { taskType })
      };

      const loadingTasks = await prisma.shipmentLoadingTask.findMany({
        where,
        include: {
          shipment: {
            select: {
              id: true,
              description: true,
              weight: true,
              palletCount: true,
              origin: true,
              destination: true
            }
          },
          warehouse: {
            select: { id: true, name: true }
          },
          dockDoor: {
            select: { id: true, doorNumber: true, doorType: true }
          },
          workerAssignments: {
            include: {
              worker: {
                select: { id: true, username: true, email: true }
              }
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledStartTime: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      res.json(loadingTasks);
    } catch (error) {
      console.error('Error fetching loading tasks:', error);
      res.status(500).json({ error: 'Failed to fetch loading tasks' });
    }
  }

  // Get loading task details
  async getLoadingTaskById(req, res) {
    try {
      const { id } = req.params;

      const loadingTask = await prisma.shipmentLoadingTask.findUnique({
        where: { id },
        include: {
          shipment: true,
          warehouse: true,
          dockDoor: true,
          workerAssignments: {
            include: {
              worker: {
                select: { id: true, username: true, email: true, phone: true }
              }
            }
          }
        }
      });

      if (!loadingTask) {
        return res.status(404).json({ error: 'Loading task not found' });
      }

      res.json(loadingTask);
    } catch (error) {
      console.error('Error fetching loading task:', error);
      res.status(500).json({ error: 'Failed to fetch loading task' });
    }
  }

  // Start a loading task
  async startLoadingTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify the user is assigned to this task
      const assignment = await prisma.loadingTaskAssignment.findFirst({
        where: {
          loadingTaskId: id,
          workerId: userId
        }
      });

      if (!assignment) {
        return res.status(403).json({ error: 'You are not assigned to this loading task' });
      }

      // Update assignment status
      await prisma.loadingTaskAssignment.update({
        where: { id: assignment.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });

      // Update task status if this is the first worker to start
      const loadingTask = await prisma.shipmentLoadingTask.findUnique({
        where: { id },
        include: { workerAssignments: true }
      });

      if (loadingTask.status === 'ASSIGNED') {
        await prisma.shipmentLoadingTask.update({
          where: { id },
          data: {
            status: 'IN_PROGRESS',
            actualStartTime: new Date()
          }
        });
      }

      res.json({ message: 'Loading task started successfully' });
    } catch (error) {
      console.error('Error starting loading task:', error);
      res.status(500).json({ error: 'Failed to start loading task' });
    }
  }

  // Complete a loading task
  async completeLoadingTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { notes } = req.body;

      // Verify the user is assigned to this task
      const assignment = await prisma.loadingTaskAssignment.findFirst({
        where: {
          loadingTaskId: id,
          workerId: userId
        }
      });

      if (!assignment) {
        return res.status(403).json({ error: 'You are not assigned to this loading task' });
      }

      // Update assignment status
      await prisma.loadingTaskAssignment.update({
        where: { id: assignment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes
        }
      });

      // Check if all workers have completed the task
      const loadingTask = await prisma.shipmentLoadingTask.findUnique({
        where: { id },
        include: { workerAssignments: true }
      });

      const allCompleted = loadingTask.workerAssignments.every(
        assignment => assignment.status === 'COMPLETED'
      );

      if (allCompleted) {
        const actualDuration = loadingTask.actualStartTime 
          ? Math.round((new Date() - loadingTask.actualStartTime) / 60000) 
          : null;

        await prisma.shipmentLoadingTask.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            actualEndTime: new Date(),
            actualDuration
          }
        });
      }

      res.json({ message: 'Loading task completed successfully' });
    } catch (error) {
      console.error('Error completing loading task:', error);
      res.status(500).json({ error: 'Failed to complete loading task' });
    }
  }

  // Get worker workload statistics
  async getWorkerWorkload(req, res) {
    try {
      const { warehouseId } = req.params;

      const workers = await this.getAvailableWorkersByWorkload(warehouseId);
      
      res.json(workers);
    } catch (error) {
      console.error('Error fetching worker workload:', error);
      res.status(500).json({ error: 'Failed to fetch worker workload' });
    }
  }

  // Helper method to get available workers sorted by workload
  async getAvailableWorkersByWorkload(warehouseId) {
    // Get all warehouse workers
    const workers = await prisma.user.findMany({
      where: {
        role: 'warehouse_worker',
        warehouseId: warehouseId
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true
      }
    });

    // Calculate current workload for each worker
    const workersWithWorkload = await Promise.all(
      workers.map(async (worker) => {
        const workload = await this.calculateWorkerWorkload(worker.id);
        return {
          ...worker,
          ...workload
        };
      })
    );

    // Sort by total workload (ascending - least busy first)
    return workersWithWorkload.sort((a, b) => a.totalTasks - b.totalTasks);
  }

  // Helper method to calculate worker's current workload
  async calculateWorkerWorkload(workerId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count all active tasks for this worker
    const [pickTasks, putAwayTasks, countTasks, crossDockTasks, loadingTasks] = await Promise.all([
      prisma.pickTask.count({
        where: {
          pickerId: workerId,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      }),
      prisma.putAwayTask.count({
        where: {
          assignedTo: workerId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        }
      }),
      prisma.cycleCountTask.count({
        where: {
          assignedToId: workerId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        }
      }),
      prisma.crossDockTask.count({
        where: {
          assignedTo: workerId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        }
      }),
      prisma.loadingTaskAssignment.count({
        where: {
          workerId: workerId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        }
      })
    ]);

    const totalTasks = pickTasks + putAwayTasks + countTasks + crossDockTasks + loadingTasks;

    // Count completed tasks today for productivity metric
    const [completedPickTasks, completedPutAwayTasks, completedCountTasks, completedCrossDockTasks, completedLoadingTasks] = await Promise.all([
      prisma.pickTask.count({
        where: {
          pickerId: workerId,
          status: 'COMPLETED',
          updatedAt: { gte: today, lt: tomorrow }
        }
      }),
      prisma.putAwayTask.count({
        where: {
          assignedTo: workerId,
          status: 'COMPLETED',
          updatedAt: { gte: today, lt: tomorrow }
        }
      }),
      prisma.cycleCountTask.count({
        where: {
          assignedToId: workerId,
          status: 'COMPLETED',
          updatedAt: { gte: today, lt: tomorrow }
        }
      }),
      prisma.crossDockTask.count({
        where: {
          assignedTo: workerId,
          status: 'COMPLETED',
          updatedAt: { gte: today, lt: tomorrow }
        }
      }),
      prisma.loadingTaskAssignment.count({
        where: {
          workerId: workerId,
          status: 'COMPLETED',
          completedAt: { gte: today, lt: tomorrow }
        }
      })
    ]);

    const completedToday = completedPickTasks + completedPutAwayTasks + completedCountTasks + completedCrossDockTasks + completedLoadingTasks;

    return {
      totalTasks,
      completedToday,
      pickTasks,
      putAwayTasks,
      countTasks,
      crossDockTasks,
      loadingTasks,
      availabilityScore: Math.max(0, 100 - (totalTasks * 10)) // Simple availability scoring
    };
  }

  // Helper method to calculate estimated duration based on shipment characteristics
  calculateEstimatedDuration(shipment, taskType) {
    // Base time in minutes
    let baseDuration = taskType === 'LOADING' ? 30 : 45; // Unloading typically takes longer

    // Factor in weight (additional 5 minutes per 1000 lbs)
    if (shipment.weight) {
      baseDuration += Math.ceil(shipment.weight / 1000) * 5;
    }

    // Factor in pallet count (additional 10 minutes per pallet)
    if (shipment.palletCount) {
      baseDuration += shipment.palletCount * 10;
    }

    // Factor in hazmat (additional 50% time)
    if (shipment.hazmat) {
      baseDuration *= 1.5;
    }

    return Math.round(baseDuration);
  }

  // Helper method to calculate required workers based on shipment volume
  calculateWorkersRequired(shipment, defaultWorkers) {
    let workers = defaultWorkers;

    // Increase workers based on weight
    if (shipment.weight && shipment.weight > 5000) {
      workers = Math.max(workers, Math.ceil(shipment.weight / 2500));
    }

    // Increase workers based on pallet count
    if (shipment.palletCount && shipment.palletCount > 5) {
      workers = Math.max(workers, Math.ceil(shipment.palletCount / 3));
    }

    // Cap at 4 workers maximum
    return Math.min(workers, 4);
  }
}

module.exports = new LoadingTaskController(); 