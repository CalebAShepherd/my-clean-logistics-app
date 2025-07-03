const prisma = require('./prisma');

class LoadingTaskService {
  
  // Automatically create a loading task when a shipment is assigned to a warehouse
  async createLoadingTaskForShipment(shipmentId, taskType = 'UNLOADING') {
    try {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { warehouse: true }
      });

      if (!shipment || !shipment.warehouseId) {
        throw new Error('Shipment must be assigned to a warehouse');
      }

      // Check if a loading task already exists for this shipment
      const existingTask = await prisma.shipmentLoadingTask.findFirst({
        where: {
          shipmentId: shipmentId,
          taskType: taskType
        }
      });

      if (existingTask) {
        return existingTask;
      }

      // Calculate estimated duration and workers needed
      const estimatedDuration = this.calculateEstimatedDuration(shipment, taskType);
      const workersRequired = this.calculateWorkersRequired(shipment);

      // Determine priority based on shipment characteristics
      const priority = this.determinePriority(shipment);

      // Create the loading task
      const loadingTask = await prisma.shipmentLoadingTask.create({
        data: {
          shipmentId,
          warehouseId: shipment.warehouseId,
          taskType,
          priority,
          workersRequired,
          estimatedDuration,
          notes: `Auto-created ${taskType.toLowerCase()} task for shipment ${shipment.id}`
        },
        include: {
          shipment: true,
          warehouse: true
        }
      });

      // Automatically assign workers if enabled
      await this.autoAssignWorkers(loadingTask.id);

      return loadingTask;
    } catch (error) {
      console.error('Error creating loading task for shipment:', error);
      throw error;
    }
  }

  // Automatically assign workers to a loading task
  async autoAssignWorkers(loadingTaskId) {
    try {
      const loadingTask = await prisma.shipmentLoadingTask.findUnique({
        where: { id: loadingTaskId },
        include: {
          warehouse: true,
          workerAssignments: true
        }
      });

      if (!loadingTask || loadingTask.status !== 'PENDING') {
        return loadingTask;
      }

      // Get available workers sorted by workload
      const availableWorkers = await this.getAvailableWorkersByWorkload(loadingTask.warehouseId);
      
      if (availableWorkers.length === 0) {
        return loadingTask;
      }

      // Calculate how many workers we need
      const workersNeeded = loadingTask.workersRequired - loadingTask.workersAssigned;
      const workersToAssign = Math.min(workersNeeded, availableWorkers.length);

      // Assign the workers with the lowest workload
      const selectedWorkers = availableWorkers.slice(0, workersToAssign);
      
      // Create worker assignments
      const assignments = await Promise.all(
        selectedWorkers.map(worker =>
          prisma.loadingTaskAssignment.create({
            data: {
              loadingTaskId: loadingTaskId,
              workerId: worker.id
            }
          })
        )
      );

      // Update the loading task
      const updatedTask = await prisma.shipmentLoadingTask.update({
        where: { id: loadingTaskId },
        data: {
          workersAssigned: loadingTask.workersAssigned + workersToAssign,
          status: workersToAssign >= workersNeeded ? 'ASSIGNED' : 'PENDING'
        }
      });

      return updatedTask;
    } catch (error) {
      console.error('Error auto-assigning workers:', error);
      throw error;
    }
  }

  // Get available workers sorted by current workload
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
        email: true
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

    // Filter out workers with high workload (more than 8 active tasks)
    const availableWorkers = workersWithWorkload.filter(worker => worker.totalTasks < 8);

    // Sort by total workload (ascending - least busy first)
    return availableWorkers.sort((a, b) => a.totalTasks - b.totalTasks);
  }

  // Calculate worker's current workload
  async calculateWorkerWorkload(workerId) {
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

    return {
      totalTasks,
      pickTasks,
      putAwayTasks,
      countTasks,
      crossDockTasks,
      loadingTasks,
      availabilityScore: Math.max(0, 100 - (totalTasks * 10))
    };
  }

  // Calculate estimated duration based on shipment characteristics
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

  // Calculate required workers based on shipment volume
  calculateWorkersRequired(shipment) {
    let workers = 2; // Default minimum

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

  // Determine priority based on shipment characteristics
  determinePriority(shipment) {
    // High priority for hazmat
    if (shipment.hazmat) {
      return 'HIGH';
    }

    // High priority for large shipments
    if (shipment.weight && shipment.weight > 10000) {
      return 'HIGH';
    }

    if (shipment.palletCount && shipment.palletCount > 10) {
      return 'HIGH';
    }

    // Medium priority for moderate size shipments
    if (shipment.weight && shipment.weight > 5000) {
      return 'MEDIUM';
    }

    if (shipment.palletCount && shipment.palletCount > 5) {
      return 'MEDIUM';
    }

    // Low priority for small shipments
    return 'LOW';
  }

  // Get loading task statistics for a warehouse
  async getLoadingTaskStats(warehouseId) {
    const stats = await prisma.shipmentLoadingTask.groupBy({
      by: ['status'],
      where: {
        warehouseId: warehouseId
      },
      _count: {
        id: true
      }
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {});
  }

  // Get overdue loading tasks
  async getOverdueLoadingTasks(warehouseId) {
    const now = new Date();
    
    return await prisma.shipmentLoadingTask.findMany({
      where: {
        warehouseId: warehouseId,
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
        scheduledStartTime: {
          lt: now
        }
      },
      include: {
        shipment: {
          select: {
            id: true,
            description: true,
            origin: true,
            destination: true
          }
        },
        workerAssignments: {
          include: {
            worker: {
              select: { username: true, email: true }
            }
          }
        }
      },
      orderBy: {
        scheduledStartTime: 'asc'
      }
    });
  }
}

module.exports = new LoadingTaskService(); 