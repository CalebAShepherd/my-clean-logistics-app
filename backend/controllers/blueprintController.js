const blueprintService = require('../services/blueprintService');

class BlueprintController {
  // Create a new blueprint
  async createBlueprint(req, res) {
    try {
      const { name, warehouseId, dimensions, elements } = req.body;
      const createdBy = req.user.id;

      if (!name || !warehouseId || !dimensions || !elements) {
        return res.status(400).json({
          error: 'Missing required fields: name, warehouseId, dimensions, elements'
        });
      }

      const blueprint = await blueprintService.createBlueprint({
        name,
        warehouseId,
        dimensions,
        elements,
        createdBy,
      });

      res.status(201).json(blueprint);
    } catch (error) {
      console.error('Error creating blueprint:', error);
      res.status(500).json({ error: 'Failed to create blueprint' });
    }
  }

  // Get all blueprints for a warehouse
  async getBlueprintsByWarehouse(req, res) {
    try {
      const { warehouseId } = req.params;

      if (!warehouseId) {
        return res.status(400).json({ error: 'Warehouse ID is required' });
      }

      const blueprints = await blueprintService.getBlueprintsByWarehouse(warehouseId);
      res.json(blueprints);
    } catch (error) {
      console.error('Error fetching blueprints by warehouse:', error);
      res.status(500).json({ error: 'Failed to fetch blueprints' });
    }
  }

  // Get a specific blueprint by ID
  async getBlueprintById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Blueprint ID is required' });
      }

      const blueprint = await blueprintService.getBlueprintById(id);

      if (!blueprint) {
        return res.status(404).json({ error: 'Blueprint not found' });
      }

      res.json(blueprint);
    } catch (error) {
      console.error('Error fetching blueprint by ID:', error);
      res.status(500).json({ error: 'Failed to fetch blueprint' });
    }
  }

  // Update a blueprint
  async updateBlueprint(req, res) {
    try {
      const { id } = req.params;
      const { name, dimensions, elements } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Blueprint ID is required' });
      }

      // Check if blueprint exists and user has permission
      const existingBlueprint = await blueprintService.getBlueprintById(id);
      if (!existingBlueprint) {
        return res.status(404).json({ error: 'Blueprint not found' });
      }

      if (existingBlueprint.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this blueprint' });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (dimensions !== undefined) updateData.dimensions = dimensions;
      if (elements !== undefined) updateData.elements = elements;

      const updatedBlueprint = await blueprintService.updateBlueprint(id, updateData);
      res.json(updatedBlueprint);
    } catch (error) {
      console.error('Error updating blueprint:', error);
      res.status(500).json({ error: 'Failed to update blueprint' });
    }
  }

  // Delete a blueprint
  async deleteBlueprint(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Blueprint ID is required' });
      }

      // Check if blueprint exists and user has permission
      const existingBlueprint = await blueprintService.getBlueprintById(id);
      if (!existingBlueprint) {
        return res.status(404).json({ error: 'Blueprint not found' });
      }

      if (existingBlueprint.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this blueprint' });
      }

      await blueprintService.deleteBlueprint(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting blueprint:', error);
      res.status(500).json({ error: 'Failed to delete blueprint' });
    }
  }

  // Get blueprints created by the current user
  async getMyBlueprints(req, res) {
    try {
      const userId = req.user.id;
      const blueprints = await blueprintService.getBlueprintsByUser(userId);
      res.json(blueprints);
    } catch (error) {
      console.error('Error fetching user blueprints:', error);
      res.status(500).json({ error: 'Failed to fetch blueprints' });
    }
  }
}

module.exports = new BlueprintController(); 