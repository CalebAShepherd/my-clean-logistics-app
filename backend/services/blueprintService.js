const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class BlueprintService {
  // Create a new blueprint
  async createBlueprint(data) {
    return await prisma.blueprint.create({
      data: {
        name: data.name,
        warehouseId: data.warehouseId,
        dimensions: data.dimensions,
        elements: data.elements,
        createdBy: data.createdBy,
      },
      include: {
        warehouse: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Get all blueprints for a warehouse
  async getBlueprintsByWarehouse(warehouseId) {
    return await prisma.blueprint.findMany({
      where: {
        warehouseId: warehouseId,
      },
      include: {
        warehouse: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // Get a specific blueprint by ID
  async getBlueprintById(id) {
    return await prisma.blueprint.findUnique({
      where: {
        id: id,
      },
      include: {
        warehouse: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Update a blueprint
  async updateBlueprint(id, data) {
    return await prisma.blueprint.update({
      where: {
        id: id,
      },
      data: {
        name: data.name,
        dimensions: data.dimensions,
        elements: data.elements,
        updatedAt: new Date(),
      },
      include: {
        warehouse: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Delete a blueprint
  async deleteBlueprint(id) {
    return await prisma.blueprint.delete({
      where: {
        id: id,
      },
    });
  }

  // Get blueprints created by a user
  async getBlueprintsByUser(userId) {
    return await prisma.blueprint.findMany({
      where: {
        createdBy: userId,
      },
      include: {
        warehouse: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}

module.exports = new BlueprintService(); 