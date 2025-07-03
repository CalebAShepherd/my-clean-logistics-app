const { PrismaClient } = require('@prisma/client');
const analyticsService = require('../services/analyticsService');
const prisma = new PrismaClient();

/**
 * GET /space-optimization/analysis
 * Comprehensive space utilization analysis and optimization recommendations
 */
const getSpaceOptimizationAnalysis = async (req, res) => {
  try {
    const { facilityId, warehouseId } = req.query;
    
    const analysis = await analyticsService.getSpaceOptimizationAnalysis({ 
      facilityId, 
      warehouseId 
    });
    
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching space optimization analysis:', error);
    res.status(500).json({ error: 'Failed to fetch space optimization analysis' });
  }
};

/**
 * GET /space-optimization/slotting
 * Slotting optimization recommendations based on ABC analysis and velocity
 */
const getSlottingOptimization = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    
    const slottingData = await analyticsService.getSlottingOptimization({ warehouseId });
    
    res.json(slottingData);
  } catch (error) {
    console.error('Error fetching slotting optimization:', error);
    res.status(500).json({ error: 'Failed to fetch slotting optimization' });
  }
};

/**
 * GET /space-optimization/trends
 * Space trend analysis and future capacity predictions
 */
const getSpaceTrendAnalysis = async (req, res) => {
  try {
    const { warehouseId, facilityId } = req.query;
    
    const trendData = await analyticsService.getSpaceTrendAnalysis({ 
      warehouseId, 
      facilityId 
    });
    
    res.json(trendData);
  } catch (error) {
    console.error('Error fetching space trend analysis:', error);
    res.status(500).json({ error: 'Failed to fetch space trend analysis' });
  }
};

/**
 * GET /space-optimization/layout
 * Layout optimization based on movement patterns and product flow
 */
const getLayoutOptimization = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    
    const layoutData = await analyticsService.getLayoutOptimization({ warehouseId });
    
    res.json(layoutData);
  } catch (error) {
    console.error('Error fetching layout optimization:', error);
    res.status(500).json({ error: 'Failed to fetch layout optimization' });
  }
};

/**
 * POST /space-optimization/facility-areas/:id/utilization
 * Update facility area utilization manually
 */
const updateFacilityAreaUtilization = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentUtilization, notes } = req.body;
    
    if (currentUtilization < 0 || currentUtilization > 100) {
      return res.status(400).json({ 
        error: 'Utilization must be between 0 and 100' 
      });
    }
    
    const updatedArea = await prisma.facilityArea.update({
      where: { id },
      data: { 
        currentUtilization,
        updatedAt: new Date()
      },
      include: {
        facility: {
          select: { id: true, name: true }
        }
      }
    });
    
    // Log the update for audit trail
    if (notes) {
      await prisma.stockMovement.create({
        data: {
          type: 'UTILIZATION_UPDATE',
          quantity: currentUtilization,
          notes: `Facility area utilization updated: ${notes}`,
          timestamp: new Date(),
          warehouseId: updatedArea.facility.id // Using facilityId as reference
        }
      });
    }
    
    res.json(updatedArea);
  } catch (error) {
    console.error('Error updating facility area utilization:', error);
    res.status(500).json({ error: 'Failed to update facility area utilization' });
  }
};

/**
 * GET /space-optimization/recommendations
 * Get prioritized space optimization recommendations
 */
const getOptimizationRecommendations = async (req, res) => {
  try {
    const { facilityId, warehouseId, priority = 'all' } = req.query;
    
    // Get multiple optimization analyses
    const [spaceAnalysis, slottingData, trendData, layoutData] = await Promise.all([
      analyticsService.getSpaceOptimizationAnalysis({ facilityId, warehouseId }),
      analyticsService.getSlottingOptimization({ warehouseId }),
      analyticsService.getSpaceTrendAnalysis({ warehouseId, facilityId }),
      analyticsService.getLayoutOptimization({ warehouseId })
    ]);
    
    // Combine all recommendations
    const allRecommendations = [
      ...spaceAnalysis.optimizationRecommendations.map(rec => ({
        ...rec,
        category: 'SPACE_UTILIZATION',
        impact: rec.potentialSavings ? `Potential savings: $${rec.potentialSavings.toFixed(0)}` : 'Space efficiency improvement'
      })),
      ...trendData.recommendations.map(rec => ({
        ...rec,
        category: 'CAPACITY_PLANNING'
      })),
      ...layoutData.layoutRecommendations.map(rec => ({
        ...rec,
        category: 'LAYOUT_OPTIMIZATION'
      })),
      // Add slotting recommendations for high-priority items
      ...(slottingData.itemAnalysis
        .filter(item => item.shouldRelocate && item.priority === 'HIGH')
        .slice(0, 5)
        .map(item => ({
          type: 'SLOTTING_OPTIMIZATION',
          priority: item.priority,
          category: 'SLOTTING',
          item: item.name,
          currentLocation: item.currentLocation ? 
            `${item.currentLocation.zone}-${item.currentLocation.aisle}-${item.currentLocation.shelf}-${item.currentLocation.bin}` : 
            'Unknown',
          recommendation: item.recommendation,
          impact: `Velocity: ${item.velocity.toFixed(1)} picks/day`
        }))
      )
    ];
    
    // Filter by priority if specified
    const filteredRecommendations = priority === 'all' ? 
      allRecommendations : 
      allRecommendations.filter(rec => rec.priority?.toLowerCase() === priority.toLowerCase());
    
    // Sort by priority
    const priorityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
    const sortedRecommendations = filteredRecommendations.sort((a, b) => 
      (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5)
    );
    
    res.json({
      recommendations: sortedRecommendations,
      summary: {
        total: allRecommendations.length,
        critical: allRecommendations.filter(rec => rec.priority === 'CRITICAL').length,
        high: allRecommendations.filter(rec => rec.priority === 'HIGH').length,
        medium: allRecommendations.filter(rec => rec.priority === 'MEDIUM').length,
        low: allRecommendations.filter(rec => rec.priority === 'LOW').length,
        byCategory: {
          spaceUtilization: allRecommendations.filter(rec => rec.category === 'SPACE_UTILIZATION').length,
          capacityPlanning: allRecommendations.filter(rec => rec.category === 'CAPACITY_PLANNING').length,
          layoutOptimization: allRecommendations.filter(rec => rec.category === 'LAYOUT_OPTIMIZATION').length,
          slotting: allRecommendations.filter(rec => rec.category === 'SLOTTING').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching optimization recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch optimization recommendations' });
  }
};

/**
 * GET /space-optimization/dashboard
 * Get space optimization dashboard data
 */
const getSpaceOptimizationDashboard = async (req, res) => {
  try {
    const { facilityId, warehouseId } = req.query;
    
    // Get all optimization data for dashboard
    const [
      spaceAnalysis,
      slottingData,
      trendData,
      layoutData,
      facilityAreas,
      warehouseCount
    ] = await Promise.all([
      analyticsService.getSpaceOptimizationAnalysis({ facilityId, warehouseId }),
      analyticsService.getSlottingOptimization({ warehouseId }),
      analyticsService.getSpaceTrendAnalysis({ warehouseId, facilityId }),
      analyticsService.getLayoutOptimization({ warehouseId }),
      prisma.facilityArea.findMany({
        where: facilityId ? { facilityId } : {},
        include: { facility: true }
      }),
      prisma.warehouse.count()
    ]);
    
    // Calculate KPIs
    const kpis = {
      totalFacilities: new Set(facilityAreas.map(area => area.facilityId)).size,
      totalWarehouses: warehouseCount,
      averageUtilization: spaceAnalysis.overallMetrics.averageUtilization,
      totalSquareFeet: spaceAnalysis.overallMetrics.totalSquareFeet,
      occupiedLocations: spaceAnalysis.overallMetrics.occupiedLocations,
      totalLocations: spaceAnalysis.overallMetrics.totalLocations,
      occupancyRate: (spaceAnalysis.overallMetrics.occupiedLocations / spaceAnalysis.overallMetrics.totalLocations) * 100,
      capacityGrowth: trendData.analysis.totalGrowthPercent,
      layoutEfficiency: layoutData.optimizationPotential.efficiencyScore,
      itemsNeedingRelocation: slottingData.optimizationSummary.itemsNeedingRelocation
    };
    
    // Get top areas by utilization
    const topUtilizedAreas = facilityAreas
      .sort((a, b) => (b.currentUtilization || 0) - (a.currentUtilization || 0))
      .slice(0, 5);
      
    const underUtilizedAreas = facilityAreas
      .filter(area => (area.currentUtilization || 0) < 50)
      .sort((a, b) => (a.currentUtilization || 0) - (b.currentUtilization || 0))
      .slice(0, 5);
    
    res.json({
      kpis,
      spaceAnalysis: {
        zoneUtilization: spaceAnalysis.zoneUtilization,
        facilityMetrics: spaceAnalysis.facilityMetrics.slice(0, 10) // Top 10 areas
      },
      trends: {
        growthTrend: trendData.analysis.totalGrowthPercent,
        projectedCapacity: trendData.analysis.projectedCapacityUtilization,
        capacityAlert: trendData.analysis.capacityAlert
      },
      recommendations: {
        total: spaceAnalysis.optimizationRecommendations.length + trendData.recommendations.length + layoutData.layoutRecommendations.length,
        critical: spaceAnalysis.optimizationRecommendations.filter(rec => rec.priority === 'CRITICAL').length
      },
      topAreas: {
        mostUtilized: topUtilizedAreas,
        underUtilized: underUtilizedAreas
      },
      slottingInsights: {
        totalItems: slottingData.optimizationSummary.totalItems,
        needRelocation: slottingData.optimizationSummary.itemsNeedingRelocation,
        classificationBreakdown: slottingData.optimizationSummary.classificationBreakdown,
        potentialTimeSavings: slottingData.optimizationSummary.potentialPickTimeReduction
      }
    });
  } catch (error) {
    console.error('Error fetching space optimization dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch space optimization dashboard' });
  }
};

module.exports = {
  getSpaceOptimizationAnalysis,
  getSlottingOptimization,
  getSpaceTrendAnalysis,
  getLayoutOptimization,
  updateFacilityAreaUtilization,
  getOptimizationRecommendations,
  getSpaceOptimizationDashboard
}; 