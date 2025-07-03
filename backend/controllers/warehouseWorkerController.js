const prisma = require('../services/prisma');

class WarehouseWorkerController {
  // Get worker's assigned tasks
  async getMyTasks(req, res) {
    try {
      const userId = req.user.id;
  
      
      // Get all tasks assigned to this worker
      const pickTasks = await prisma.pickTask.findMany({
        where: {
          pickerId: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        include: {
          pickList: {
            include: {
              wave: true
            }
          },
          inventoryItem: true,
          location: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const putAwayTasks = await prisma.putAwayTask.findMany({
        where: {
          assignedUser: { id: userId },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
          inventoryItem: true,
          fromLocation: true,
          toLocation: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const countTasks = await prisma.cycleCountTask.findMany({
        where: {
          assignedToId: userId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
          cycleCount: true,
          location: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const crossDockTasks = await prisma.crossDockTask.findMany({
        where: {
          assignedUser: { id: userId },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
          inboundShipment: true,
          outboundShipment: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const loadingTasks = await prisma.loadingTaskAssignment.findMany({
        where: {
          workerId: userId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
          loadingTask: {
            include: {
              shipment: true,
              dockDoor: true
            }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });
      
      

      // Transform tasks into unified format
      const allTasks = [
        ...pickTasks.map(task => ({
          id: task.id,
          type: 'PICK',
          title: `Pick ${task.quantityToPick} ${task.inventoryItem.name}`,
          location: task.location ? `${task.location.zone}-${task.location.aisle}-${task.location.shelf}-${task.location.bin}` : 'Unknown',
          priority: task.pickList?.priority || 'MEDIUM',
          estimatedTime: '5-10 min',
          items: task.quantityToPick,
          status: task.status === 'PENDING' ? 'ASSIGNED' : task.status,
          createdAt: task.createdAt
        })),
        ...putAwayTasks.map(task => ({
          id: task.id,
          type: 'PUTAWAY',
          title: `Put Away ${task.quantity} ${task.inventoryItem.name}`,
          location: task.toLocation ? `${task.toLocation.zone}-${task.toLocation.aisle}-${task.toLocation.shelf}-${task.toLocation.bin}` : 'Unknown',
          priority: task.priority || 'MEDIUM',
          estimatedTime: '3-8 min',
          items: task.quantity,
          status: task.status,
          createdAt: task.createdAt
        })),
        ...countTasks.map(task => ({
          id: task.id,
          type: 'COUNT',
          title: `Count Items at ${task.location?.zone || 'Location'}`,
          location: task.location ? `${task.location.zone}-${task.location.aisle}-${task.location.shelf}-${task.location.bin}` : 'Unknown',
          priority: task.cycleCount?.priority || 'MEDIUM',
          estimatedTime: '10-15 min',
          items: task.itemsToCount || 0,
          status: task.status,
          createdAt: task.createdAt
        })),
        ...crossDockTasks.map(task => ({
          id: task.id,
          type: 'CROSSDOCK',
          title: `Cross Dock Transfer`,
          location: 'Cross Dock Area',
          priority: task.priority || 'HIGH',
          estimatedTime: '5-12 min',
          items: task.quantity,
          status: task.status,
          createdAt: task.createdAt
        })),
        ...loadingTasks.map(assignment => ({
          id: assignment.loadingTask.id,  // Use the actual loading task ID, not assignment ID
          type: assignment.loadingTask.taskType,
          title: `${assignment.loadingTask.taskType === 'LOADING' ? 'Load' : 'Unload'} Shipment`,
          location: assignment.loadingTask.dockDoor ? `Dock ${assignment.loadingTask.dockDoor.doorNumber}` : 'Dock Area',
          priority: assignment.loadingTask.priority || 'MEDIUM',
          estimatedTime: `${assignment.loadingTask.estimatedDuration || 45} min`,
          items: assignment.loadingTask.shipment?.palletCount || 1,
          status: assignment.status,
          createdAt: assignment.assignedAt,
          assignmentId: assignment.id,  // Keep assignment ID for reference
          shipmentInfo: {
            origin: assignment.loadingTask.shipment?.origin,
            destination: assignment.loadingTask.shipment?.destination,
            weight: assignment.loadingTask.shipment?.weight
          }
        }))
      ];

      // Sort by priority and creation time
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      allTasks.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      const priorityTasks = allTasks.filter(task => task.priority === 'HIGH');

      res.json({
        all: allTasks,
        priority: priorityTasks
      });
    } catch (error) {
      console.error('Error fetching worker tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  // Get worker statistics
  async getWorkerStats(req, res) {
    try {
      const userId = req.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Count pending tasks
      const [pickTasksCount, putAwayTasksCount, countTasksCount, crossDockTasksCount, loadingTasksCount] = await Promise.all([
        prisma.pickTask.count({
          where: {
            pickerId: userId,
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          }
        }),
        prisma.putAwayTask.count({
          where: {
            assignedUser: { id: userId },
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          }
        }),
        prisma.cycleCountTask.count({
          where: {
            assignedToId: userId,
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          }
        }),
        prisma.crossDockTask.count({
          where: {
            assignedUser: { id: userId },
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          }
        }),
        prisma.loadingTaskAssignment.count({
          where: {
            workerId: userId,
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          }
        })
      ]);

      const pendingTasks = pickTasksCount + putAwayTasksCount + countTasksCount + crossDockTasksCount + loadingTasksCount;

      // Count completed tasks today
      const [completedPickTasks, completedPutAwayTasks, completedCountTasks, completedCrossDockTasks, completedLoadingTasks] = await Promise.all([
        prisma.pickTask.count({
          where: {
            pickerId: userId,
            status: 'COMPLETED',
            updatedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        prisma.putAwayTask.count({
          where: {
            assignedUser: { id: userId },
            status: 'COMPLETED',
            updatedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        prisma.cycleCountTask.count({
          where: {
            assignedToId: userId,
            status: 'COMPLETED',
            updatedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        prisma.crossDockTask.count({
          where: {
            assignedUser: { id: userId },
            status: 'COMPLETED',
            updatedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        prisma.loadingTaskAssignment.count({
          where: {
            workerId: userId,
            status: 'COMPLETED',
            completedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        })
      ]);

      const completedToday = completedPickTasks + completedPutAwayTasks + completedCountTasks + completedCrossDockTasks + completedLoadingTasks;

      // Count in-progress tasks
      const inProgressTasks = await prisma.pickTask.count({
        where: {
          pickerId: userId,
          status: 'IN_PROGRESS'
        }
      }) + await prisma.putAwayTask.count({
        where: {
          assignedUser: { id: userId },
          status: 'IN_PROGRESS'
        }
      });

      // Calculate productivity (completed vs assigned today)
      const totalAssignedToday = pendingTasks + completedToday;
      const productivity = totalAssignedToday > 0 ? Math.round((completedToday / totalAssignedToday) * 100) : 0;

      res.json({
        pendingTasks,
        completedToday,
        inProgressTasks,
        productivity
      });
    } catch (error) {
      console.error('Error fetching worker stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  // Get performance data for charts
  async getPerformanceData(req, res) {
    try {
      const userId = req.user.id;
      const last7Days = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const completedTasks =         await prisma.pickTask.count({
          where: {
            pickerId: userId,
            status: 'COMPLETED',
            updatedAt: {
              gte: date,
              lt: nextDate
            }
          }
        }) + await prisma.putAwayTask.count({
          where: {
            assignedUser: { id: userId },
            status: 'COMPLETED',
            updatedAt: {
              gte: date,
              lt: nextDate
            }
          }
        });

        last7Days.push(completedTasks);
      }

      const chartData = {
        labels: ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', '1d ago', 'Today'],
        datasets: [{
          data: last7Days
        }]
      };

      res.json(chartData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      res.status(500).json({ error: 'Failed to fetch performance data' });
    }
  }

  // Process barcode scan
  async processScan(req, res) {
    try {
      const { barcode, scanMode } = req.body;
      const userId = req.user.id;

      let result = { action: 'showInfo', title: 'Scan Result', message: `Scanned: ${barcode}` };

      // Try to identify what was scanned
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { sku: barcode }
      });

      const location = await prisma.location.findFirst({
        where: {
          OR: [
            { id: barcode },
            { bin: barcode }
          ]
        }
      });

      if (inventoryItem) {
        switch (scanMode) {
          case 'pick':
            // Find pick task for this item
            const pickTask = await prisma.pickTask.findFirst({
              where: {
                pickerId: userId,
                inventoryItemId: inventoryItem.id,
                status: { in: ['PENDING', 'IN_PROGRESS'] }
              }
            });
            
            if (pickTask) {
              result = {
                action: 'navigate',
                screen: 'Pick Lists',
                params: { taskId: pickTask.id }
              };
            } else {
              result = {
                action: 'showInfo',
                title: 'Pick Task',
                message: `Item: ${inventoryItem.name}\nSKU: ${inventoryItem.sku}\n\nNo active pick task found for this item.`
              };
            }
            break;

          case 'receive':
            result = {
              action: 'navigate',
              screen: 'ReceivingManagement',
              params: { itemId: inventoryItem.id, sku: inventoryItem.sku }
            };
            break;

          case 'putaway':
            result = {
              action: 'navigate',
              screen: 'PutAwayManagement',
              params: { itemId: inventoryItem.id, sku: inventoryItem.sku }
            };
            break;

          case 'count':
            result = {
              action: 'navigate',
              screen: 'MobileCycleCount',
              params: { itemId: inventoryItem.id, sku: inventoryItem.sku }
            };
            break;

          default:
            result = {
              action: 'showInfo',
              title: 'Item Scanned',
              message: `Item: ${inventoryItem.name}\nSKU: ${inventoryItem.sku}\nDescription: ${inventoryItem.description || 'No description'}`
            };
        }
      } else if (location) {
        switch (scanMode) {
          case 'putaway':
            result = {
              action: 'navigate',
              screen: 'PutAwayManagement',
              params: { locationId: location.id, locationName: location.bin }
            };
            break;
          case 'count':
            result = {
              action: 'navigate',
              screen: 'MobileCycleCount',
              params: { locationId: location.id, locationName: location.bin }
            };
            break;
          default:
            result = {
              action: 'navigate',
              screen: 'Location Detail',
              params: { locationId: location.id }
            };
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Error processing scan:', error);
      res.status(500).json({ error: 'Failed to process scan' });
    }
  }

  // Handle quick actions
  async handleQuickAction(req, res) {
    try {
      const { actionType, taskId, data } = req.body;
      const userId = req.user.id;

      switch (actionType) {
        case 'completePickTask':
          await prisma.pickTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              quantityPicked: data.quantity,
              pickedAt: new Date()
            }
          });
          break;

        case 'completePutAwayTask':
          await prisma.putAwayTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              putAwayAt: new Date()
            }
          });
          break;

        case 'completeCountTask':
          await prisma.cycleCountTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          });
          break;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error handling quick action:', error);
      res.status(500).json({ error: 'Failed to complete action' });
    }
  }

  // Task detail operations
  async getTaskDetail(req, res) {
    try {
      const { taskId } = req.params;
      const taskType = req.query.type;

      let task;
      switch (taskType) {
        case 'PICK':
          task = await prisma.pickTask.findUnique({
            where: { id: taskId },
            include: {
              pickList: { include: { wave: true } },
              inventoryItem: true,
              location: true,
              picker: true
            }
          });
          break;
        case 'PUTAWAY':
          task = await prisma.putAwayTask.findUnique({
            where: { id: taskId },
            include: {
              inventoryItem: true,
              fromLocation: true,
              toLocation: true,
              assignedUser: true
            }
          });
          break;
        case 'COUNT':
          task = await prisma.cycleCountTask.findUnique({
            where: { id: taskId },
            include: {
              cycleCount: true,
              location: true,
              assignedTo: true
            }
          });
          break;
        case 'LOADING':
        case 'UNLOADING':
          task = await prisma.shipmentLoadingTask.findUnique({
            where: { id: taskId },
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
            }
          });
          break;
      }

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(task);
    } catch (error) {
      console.error('Error fetching task detail:', error);
      res.status(500).json({ error: 'Failed to fetch task detail' });
    }
  }

  async startTask(req, res) {
    try {
      const { taskId } = req.params;
      const { taskType } = req.body;
      const userId = req.user.id;

      switch (taskType) {
        case 'PICK':
          await prisma.pickTask.update({
            where: { id: taskId },
            data: {
              status: 'IN_PROGRESS',
              startedAt: new Date()
            }
          });
          break;
        case 'PUTAWAY':
          await prisma.putAwayTask.update({
            where: { id: taskId },
            data: {
              status: 'IN_PROGRESS',
              startedAt: new Date()
            }
          });
          break;
        case 'COUNT':
          await prisma.cycleCountTask.update({
            where: { id: taskId },
            data: {
              status: 'IN_PROGRESS',
              startedAt: new Date()
            }
          });
          break;
        case 'LOADING':
        case 'UNLOADING':
          await prisma.shipmentLoadingTask.update({
            where: { id: taskId },
            data: {
              status: 'IN_PROGRESS',
              actualStartTime: new Date()
            }
          });
          break;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error starting task:', error);
      res.status(500).json({ error: 'Failed to start task' });
    }
  }

  async completeTask(req, res) {
    try {
      const { taskId } = req.params;
      const { taskType, data } = req.body;

      switch (taskType) {
        case 'PICK':
          await prisma.pickTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              quantityPicked: data.quantityPicked,
              pickedAt: new Date(),
              notes: data.notes
            }
          });
          break;
        case 'PUTAWAY':
          await prisma.putAwayTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              putAwayAt: new Date(),
              notes: data.notes
            }
          });
          break;
        case 'COUNT':
          await prisma.cycleCountTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          });
          break;
        case 'LOADING':
        case 'UNLOADING':
          await prisma.shipmentLoadingTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              actualEndTime: new Date(),
              notes: data?.notes || null
            }
          });
          break;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  }

  async pauseTask(req, res) {
    try {
      const { taskId } = req.params;
      const { taskType, reason } = req.body;

      switch (taskType) {
        case 'PICK':
          await prisma.pickTask.update({
            where: { id: taskId },
            data: {
              status: 'ASSIGNED',
              notes: reason
            }
          });
          break;
        case 'PUTAWAY':
          await prisma.putAwayTask.update({
            where: { id: taskId },
            data: {
              status: 'ASSIGNED',
              notes: reason
            }
          });
          break;
        case 'COUNT':
          await prisma.cycleCountTask.update({
            where: { id: taskId },
            data: {
              status: 'ASSIGNED'
            }
          });
          break;
        case 'LOADING':
        case 'UNLOADING':
          await prisma.shipmentLoadingTask.update({
            where: { id: taskId },
            data: {
              status: 'ASSIGNED',
              notes: reason
            }
          });
          break;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error pausing task:', error);
      res.status(500).json({ error: 'Failed to pause task' });
    }
  }

  async unassignTask(req, res) {
    try {
      const { taskId, taskType } = req.body;
      const userId = req.user.id;

      switch (taskType) {
        case 'LOADING':
        case 'UNLOADING':
          // Find and delete the worker assignment
          const assignment = await prisma.loadingTaskAssignment.findFirst({
            where: {
              loadingTaskId: taskId,
              workerId: userId
            }
          });

          if (assignment) {
            await prisma.loadingTaskAssignment.delete({
              where: { id: assignment.id }
            });

            // Update workers assigned count on the loading task
            const loadingTask = await prisma.shipmentLoadingTask.findUnique({
              where: { id: taskId }
            });

            if (loadingTask && loadingTask.workersAssigned > 0) {
              await prisma.shipmentLoadingTask.update({
                where: { id: taskId },
                data: {
                  workersAssigned: loadingTask.workersAssigned - 1,
                  status: loadingTask.workersAssigned - 1 === 0 ? 'PENDING' : loadingTask.status
                }
              });
            }
          }
          break;
        case 'COUNT':
          await prisma.cycleCountTask.update({
            where: { id: taskId },
            data: {
              assignedToId: null,
              status: 'PENDING'
            }
          });
          break;
        case 'PICK':
          await prisma.pickTask.update({
            where: { id: taskId },
            data: {
              pickerId: null,
              status: 'PENDING'
            }
          });
          break;
        case 'PUTAWAY':
          await prisma.putAwayTask.update({
            where: { id: taskId },
            data: {
              assignedUserId: null,
              status: 'PENDING'
            }
          });
          break;
      }

      res.json({ success: true, message: 'Task unassigned successfully' });
    } catch (error) {
      console.error('Error unassigning task:', error);
      res.status(500).json({ error: 'Failed to unassign task' });
    }
  }

  // Work queue methods
  async getPickQueue(req, res) {
    try {
      const userId = req.user.id;
      
      const pickTasks = await prisma.pickTask.findMany({
        where: {
          pickerId: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        include: {
          pickList: { include: { wave: true } },
          inventoryItem: true,
          location: true
        },
        orderBy: [
          { pickList: { priority: 'desc' } },
          { createdAt: 'asc' }
        ]
      });

      res.json(pickTasks);
    } catch (error) {
      console.error('Error fetching pick queue:', error);
      res.status(500).json({ error: 'Failed to fetch pick queue' });
    }
  }

  async getPutAwayQueue(req, res) {
    try {
      const userId = req.user.id;
      
      const putAwayTasks = await prisma.putAwayTask.findMany({
        where: {
          assignedUser: { id: userId },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
          inventoryItem: true,
          fromLocation: true,
          toLocation: true
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      res.json(putAwayTasks);
    } catch (error) {
      console.error('Error fetching putaway queue:', error);
      res.status(500).json({ error: 'Failed to fetch putaway queue' });
    }
  }

  async getReceiveQueue(req, res) {
    try {
      const userId = req.user.id;
      
      const receipts = await prisma.receipt.findMany({
        where: {
          receiverId: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        include: {
          asn: true,
          receiptItems: {
            include: {
              inventoryItem: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json(receipts);
    } catch (error) {
      console.error('Error fetching receive queue:', error);
      res.status(500).json({ error: 'Failed to fetch receive queue' });
    }
  }

  async getCountQueue(req, res) {
    try {
      const userId = req.user.id;
      
      const countTasks = await prisma.cycleCountTask.findMany({
        where: {
          assignedToId: userId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        },
        include: {
          cycleCount: true,
          location: true
        },
        orderBy: [
          { createdAt: 'asc' }
        ]
      });

      res.json(countTasks);
    } catch (error) {
      console.error('Error fetching count queue:', error);
      res.status(500).json({ error: 'Failed to fetch count queue' });
    }
  }

  // Quick action methods for mobile workflow
  async quickPick(req, res) {
    try {
      const { taskId, quantityPicked, locationConfirmed } = req.body;
      const userId = req.user.id;

      const task = await prisma.pickTask.findUnique({
        where: { id: taskId },
        include: { inventoryItem: true, location: true }
      });

      if (!task || task.pickerId !== userId) {
        return res.status(403).json({ error: 'Unauthorized or task not found' });
      }

      await prisma.pickTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          quantityPicked: quantityPicked,
          pickedAt: new Date()
        }
      });

      // Update inventory
      await prisma.warehouseItem.updateMany({
        where: {
          itemId: task.inventoryItemId,
          locationId: task.locationId
        },
        data: {
          quantity: {
            decrement: quantityPicked
          }
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error in quick pick:', error);
      res.status(500).json({ error: 'Failed to complete pick' });
    }
  }

  async quickPutAway(req, res) {
    try {
      const { taskId, locationConfirmed } = req.body;
      const userId = req.user.id;

      const task = await prisma.putAwayTask.findUnique({
        where: { id: taskId },
        include: { inventoryItem: true, toLocation: true }
      });

      if (!task || task.assignedUser?.id !== userId) {
        return res.status(403).json({ error: 'Unauthorized or task not found' });
      }

      await prisma.putAwayTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          putAwayAt: new Date()
        }
      });

      // Update inventory
      await prisma.warehouseItem.upsert({
        where: {
          warehouseId_itemId_locationId: {
            warehouseId: task.toLocation.warehouseId,
            itemId: task.inventoryItemId,
            locationId: task.toLocationId
          }
        },
        update: {
          quantity: {
            increment: task.quantity
          }
        },
        create: {
          warehouseId: task.toLocation.warehouseId,
          itemId: task.inventoryItemId,
          locationId: task.toLocationId,
          quantity: task.quantity
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error in quick putaway:', error);
      res.status(500).json({ error: 'Failed to complete putaway' });
    }
  }

  async quickReceive(req, res) {
    try {
      const { receiptId, items } = req.body;
      const userId = req.user.id;

      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId }
      });

      if (!receipt || receipt.receiverId !== userId) {
        return res.status(403).json({ error: 'Unauthorized or receipt not found' });
      }

      // Update receipt items
      for (const item of items) {
        await prisma.receiptItem.update({
          where: { id: item.id },
          data: {
            receivedQty: item.receivedQty,
            condition: item.condition,
            notes: item.notes
          }
        });
      }

      // Update receipt status
      await prisma.receipt.update({
        where: { id: receiptId },
        data: {
          status: 'COMPLETED',
          receivedAt: new Date()
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error in quick receive:', error);
      res.status(500).json({ error: 'Failed to complete receive' });
    }
  }

  async quickCount(req, res) {
    try {
      const { taskId, counts } = req.body;
      const userId = req.user.id;

      const task = await prisma.cycleCountTask.findUnique({
        where: { id: taskId }
      });

      if (!task || task.assignedToId !== userId) {
        return res.status(403).json({ error: 'Unauthorized or task not found' });
      }

      // Update count items
      for (const count of counts) {
        await prisma.cycleCountItem.update({
          where: { id: count.id },
          data: {
            countedQty: count.countedQty,
            status: count.countedQty === count.expectedQty ? 'COUNTED' : 'VARIANCE_REVIEW',
            countedById: userId,
            countedAt: new Date(),
            notes: count.notes
          }
        });
      }

      // Update task status
      await prisma.cycleCountTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error in quick count:', error);
      res.status(500).json({ error: 'Failed to complete count' });
    }
  }
}

module.exports = new WarehouseWorkerController(); 