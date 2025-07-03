const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createFacilityMaintenanceSampleData() {
  try {
    console.log('Creating facility maintenance sample data...');

    // Get or create facilities
    let facilities = await prisma.facility.findMany();
    if (facilities.length === 0) {
      facilities = await Promise.all([
        prisma.facility.create({
          data: {
            name: 'Main Distribution Center',
            address: '123 Industrial Blvd, Manufacturing City, TX 75001',
            facilityType: 'WAREHOUSE',
            size: 250000,
            operatingHours: '24/7',
            contactPerson: 'John Smith',
            contactPhone: '+1-555-0101',
            contactEmail: 'john.smith@facility.com',
            isActive: true
          }
        }),
        prisma.facility.create({
          data: {
            name: 'Cold Storage Facility',
            address: '456 Refrigeration Way, Cold Storage, FL 33101',
            facilityType: 'COLD_STORAGE',
            size: 150000,
            operatingHours: '24/7',
            contactPerson: 'Sarah Johnson',
            contactPhone: '+1-555-0102',
            contactEmail: 'sarah.johnson@facility.com',
            isActive: true
          }
        }),
        prisma.facility.create({
          data: {
            name: 'Manufacturing Plant',
            address: '789 Production Ave, Factory Town, OH 44101',
            facilityType: 'MANUFACTURING',
            size: 400000,
            operatingHours: 'Mon-Fri 6AM-10PM',
            contactPerson: 'Mike Wilson',
            contactPhone: '+1-555-0103',
            contactEmail: 'mike.wilson@facility.com',
            isActive: true
          }
        })
      ]);
    }

    // Create facility areas
    const areas = [];
    for (const facility of facilities) {
      const facilityAreas = await Promise.all([
        prisma.facilityArea.create({
          data: {
            facilityId: facility.id,
            name: 'Receiving Dock',
            areaType: 'RECEIVING_DOCK',
            squareFeet: 5000,
            height: 20,
            capacity: 100,
            currentUtilization: 65,
            maxUtilization: 90
          }
        }),
        prisma.facilityArea.create({
          data: {
            facilityId: facility.id,
            name: 'Storage Zone A',
            areaType: 'WAREHOUSE_FLOOR',
            squareFeet: 15000,
            height: 25,
            capacity: 500,
            currentUtilization: 78,
            maxUtilization: 85
          }
        }),
        prisma.facilityArea.create({
          data: {
            facilityId: facility.id,
            name: 'Shipping Dock',
            areaType: 'SHIPPING_DOCK',
            squareFeet: 4000,
            height: 18,
            capacity: 80,
            currentUtilization: 55,
            maxUtilization: 90
          }
        }),
        prisma.facilityArea.create({
          data: {
            facilityId: facility.id,
            name: 'Office Area',
            areaType: 'OFFICE_SPACE',
            squareFeet: 2000,
            height: 10,
            capacity: 50,
            currentUtilization: 40,
            maxUtilization: 75
          }
        }),
        prisma.facilityArea.create({
          data: {
            facilityId: facility.id,
            name: 'Equipment Room',
            areaType: 'MAINTENANCE_SHOP',
            squareFeet: 1000,
            height: 15,
            capacity: 25,
            currentUtilization: 70,
            maxUtilization: 80
          }
        })
      ]);
      areas.push(...facilityAreas);
    }

    console.log('✅ Created facilities and areas');

    // Get or create maintenance users
    const hashedPassword = await bcrypt.hash('maintenance123', 10);
    
    const maintenanceUsers = await Promise.all([
      prisma.user.upsert({
        where: { email: 'maintenance.manager@company.com' },
        update: {},
        create: {
          email: 'maintenance.manager@company.com',
          username: 'maintenance_manager',
          password: hashedPassword,
          role: 'warehouse_admin',
          phone: '+1-555-0201'
        }
      }),
      prisma.user.upsert({
        where: { email: 'hvac.tech@company.com' },
        update: {},
        create: {
          email: 'hvac.tech@company.com',
          username: 'hvac_tech',
          password: hashedPassword,
          role: 'warehouse_worker',
          phone: '+1-555-0202'
        }
      }),
      prisma.user.upsert({
        where: { email: 'electrical.tech@company.com' },
        update: {},
        create: {
          email: 'electrical.tech@company.com',
          username: 'electrical_tech',
          password: hashedPassword,
          role: 'warehouse_worker',
          phone: '+1-555-0203'
        }
      }),
      prisma.user.upsert({
        where: { email: 'safety.officer@company.com' },
        update: {},
        create: {
          email: 'safety.officer@company.com',
          username: 'safety_officer',
          password: hashedPassword,
          role: 'admin',
          phone: '+1-555-0204'
        }
      })
    ]);

    console.log('✅ Created maintenance users');

    // Create facility maintenance logs
    const maintenanceTypes = ['HVAC_MAINTENANCE', 'ELECTRICAL_MAINTENANCE', 'PLUMBING_MAINTENANCE', 'STRUCTURAL_MAINTENANCE', 'EQUIPMENT_MAINTENANCE', 'CLEANING', 'GROUNDS_MAINTENANCE', 'SECURITY_SYSTEM_MAINTENANCE'];
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const statuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

    const maintenanceLogs = [];
    for (let i = 0; i < 50; i++) {
      const facility = facilities[Math.floor(Math.random() * facilities.length)];
      const facilityAreas = areas.filter(a => a.facilityId === facility.id);
      const area = facilityAreas[Math.floor(Math.random() * facilityAreas.length)];
      const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const assignedUser = maintenanceUsers[Math.floor(Math.random() * maintenanceUsers.length)];

      const scheduledDate = new Date(Date.now() + (Math.random() - 0.5) * 30 * 24 * 60 * 60 * 1000);
      const estimatedCost = Math.floor(Math.random() * 5000) + 100;
      
      let completedDate = null;
      let actualCost = null;
      let laborHours = null;
      let performedBy = null;

      if (status === 'COMPLETED') {
        completedDate = new Date(scheduledDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
        actualCost = estimatedCost + (Math.random() - 0.5) * estimatedCost * 0.3;
        laborHours = Math.floor(Math.random() * 16) + 1;
        performedBy = assignedUser.id;
      }

      const log = await prisma.facilityMaintenanceLog.create({
        data: {
          facilityId: facility.id,
          areaId: area.id,
          maintenanceType,
          title: getMaintenanceTitle(maintenanceType),
          description: getMaintenanceDescription(maintenanceType),
          priority,
          status,
          scheduledDate,
          completedDate,
          assignedTo: assignedUser.id,
          performedBy,
          estimatedCost,
          actualCost,
          laborHours,
          isComplianceRequired: Math.random() > 0.7,
          complianceNotes: Math.random() > 0.7 ? 'OSHA compliance required' : null
        }
      });
      maintenanceLogs.push(log);
    }

    console.log('✅ Created facility maintenance logs');

    // Create facility compliance records
    const complianceTypes = ['FIRE_SAFETY', 'OSHA_COMPLIANCE', 'EPA_COMPLIANCE', 'BUILDING_CODE', 'HEALTH_DEPARTMENT', 'INSURANCE_COMPLIANCE'];
    const complianceStatuses = ['COMPLIANT', 'NON_COMPLIANT', 'PENDING', 'EXPIRED'];

    const complianceRecords = [];
    for (let i = 0; i < 30; i++) {
      const facility = facilities[Math.floor(Math.random() * facilities.length)];
      const complianceType = complianceTypes[Math.floor(Math.random() * complianceTypes.length)];
      const status = complianceStatuses[Math.floor(Math.random() * complianceStatuses.length)];
      
      const lastCheckDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
      const nextCheckDate = new Date(lastCheckDate.getTime() + getComplianceFrequency(complianceType) * 24 * 60 * 60 * 1000);

      const compliance = await prisma.facilityCompliance.create({
        data: {
          facilityId: facility.id,
          complianceType,
          name: getComplianceTitle(complianceType),
          description: getComplianceDescription(complianceType),
          regulatoryBody: getRegulatoryBody(complianceType),
          requirements: getComplianceDescription(complianceType),
          frequency: getComplianceEnumFrequency(complianceType),
          status,
          lastCheckDate,
          nextCheckDate,
          responsiblePerson: maintenanceUsers[Math.floor(Math.random() * maintenanceUsers.length)].id
        }
      });
      complianceRecords.push(compliance);
    }

    console.log('✅ Created facility compliance records');

    // Create compliance audits
    for (let i = 0; i < 15; i++) {
      const facility = facilities[Math.floor(Math.random() * facilities.length)];
      const compliance = complianceRecords[Math.floor(Math.random() * complianceRecords.length)];
      const auditDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
      const auditor = maintenanceUsers[Math.floor(Math.random() * maintenanceUsers.length)];

      await prisma.complianceAudit.create({
        data: {
          facilityId: facility.id,
          complianceId: compliance.id,
          auditDate,
          auditType: 'INTERNAL',
          auditor: auditor.id,
          overallScore: Math.floor(Math.random() * 40) + 60,
          passed: Math.random() > 0.3,
          findings: getAuditFindings(compliance.complianceType),
          correctiveActions: getCorrectiveActions(compliance.complianceType),
          followUpDate: new Date(auditDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    console.log('✅ Created compliance audits');

    // Create safety incidents
    const incidentTypes = ['SLIP_FALL', 'STRUCK_BY_OBJECT', 'CHEMICAL_EXPOSURE', 'FIRE_EXPLOSION', 'ELECTRICAL_SHOCK', 'VEHICLE_ACCIDENT', 'LIFTING_INJURY'];
    const severities = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

    for (let i = 0; i < 20; i++) {
      const facility = facilities[Math.floor(Math.random() * facilities.length)];
      const facilityAreas = areas.filter(a => a.facilityId === facility.id);
      const area = facilityAreas[Math.floor(Math.random() * facilityAreas.length)];
      const incidentType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const incidentDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const reporter = maintenanceUsers[Math.floor(Math.random() * maintenanceUsers.length)];

      await prisma.safetyIncident.create({
        data: {
          facilityId: facility.id,
          areaId: area.id,
          incidentType,
          severity,
          title: `${incidentType} Incident`,
          description: getIncidentDescription(incidentType),
          incidentDate,
          incidentTime: `${Math.floor(Math.random() * 12) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
          location: `${area.name} - Section ${Math.floor(Math.random() * 10) + 1}`,
          reportedBy: reporter.id,
          involvedPersons: [`Person ${Math.floor(Math.random() * 100) + 1}`],
          witnesses: Math.random() > 0.5 ? [`Witness ${Math.floor(Math.random() * 100) + 1}`] : [],
          medicalAttention: severity === 'HIGH' || severity === 'CRITICAL',
          lostTime: severity === 'CRITICAL',
          correctiveActions: getIncidentCorrectiveActions(incidentType),
          status: Math.random() > 0.3 ? 'INVESTIGATION_COMPLETE' : 'UNDER_INVESTIGATION'
        }
      });
    }

    console.log('✅ Created safety incidents');

    // Create environmental monitoring records
    const measurementTypes = ['TEMPERATURE', 'HUMIDITY', 'AIR_QUALITY', 'NOISE_LEVEL', 'LIGHT_LEVEL'];
    const alertLevels = ['NORMAL', 'WARNING', 'CRITICAL'];

    for (let i = 0; i < 100; i++) {
      const facility = facilities[Math.floor(Math.random() * facilities.length)];
      const facilityAreas = areas.filter(a => a.facilityId === facility.id);
      const area = facilityAreas[Math.floor(Math.random() * facilityAreas.length)];
      const measurementType = measurementTypes[Math.floor(Math.random() * measurementTypes.length)];
      const alertLevel = alertLevels[Math.floor(Math.random() * alertLevels.length)];
      const readingDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const recorder = maintenanceUsers[Math.floor(Math.random() * maintenanceUsers.length)];

      const { value, unit, minThreshold, maxThreshold } = getEnvironmentalReading(measurementType, alertLevel);

      await prisma.environmentalMonitoring.create({
        data: {
          facilityId: facility.id,
          areaId: area.id,
          monitoringType: measurementType,
          parameter: getParameterName(measurementType),
          value,
          unit,
          readingDate,
          minThreshold,
          maxThreshold,
          isWithinLimits: alertLevel === 'NORMAL',
          alertLevel,
          alertMessage: alertLevel !== 'NORMAL' ? getAlertMessage(measurementType, alertLevel) : null,
          recordedBy: recorder.id
        }
      });
    }

    console.log('✅ Created environmental monitoring records');

    console.log('\n🎉 Successfully created all facility maintenance sample data!');
    console.log('\nSample data includes:');
    console.log(`- ${facilities.length} facilities with ${areas.length} areas`);
    console.log(`- ${maintenanceUsers.length} maintenance users`);
    console.log(`- 50 maintenance logs`);
    console.log(`- 30 compliance records`);
    console.log(`- 15 compliance audits`);
    console.log(`- 20 safety incidents`);
    console.log(`- 100 environmental monitoring records`);

  } catch (error) {
    console.error('Error creating facility maintenance sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions for generating realistic data
function getMaintenanceTitle(type) {
  const titles = {
    HVAC_MAINTENANCE: ['HVAC System Maintenance', 'Air Filter Replacement', 'Thermostat Calibration', 'Ductwork Inspection'],
    ELECTRICAL_MAINTENANCE: ['Electrical Panel Inspection', 'Emergency Lighting Test', 'Circuit Breaker Maintenance', 'Outlet Replacement'],
    PLUMBING_MAINTENANCE: ['Pipe Leak Repair', 'Drain Cleaning', 'Water Heater Maintenance', 'Faucet Replacement'],
    STRUCTURAL_MAINTENANCE: ['Roof Inspection', 'Foundation Check', 'Wall Crack Repair', 'Door Alignment'],
    EQUIPMENT_MAINTENANCE: ['Forklift Maintenance', 'Conveyor Belt Service', 'Crane Inspection', 'Generator Test'],
    CLEANING: ['Deep Cleaning Service', 'Floor Waxing', 'Window Cleaning', 'Carpet Cleaning'],
    GROUNDS_MAINTENANCE: ['Lawn Maintenance', 'Tree Trimming', 'Snow Removal', 'Irrigation System Check'],
    SECURITY_SYSTEM_MAINTENANCE: ['Security Camera Check', 'Access Control Test', 'Alarm System Maintenance', 'Lock Replacement']
  };
  const typeOptions = titles[type] || ['General Maintenance'];
  return typeOptions[Math.floor(Math.random() * typeOptions.length)];
}

function getMaintenanceDescription(type) {
  const descriptions = {
    HVAC_MAINTENANCE: 'Routine maintenance of heating, ventilation, and air conditioning systems',
    ELECTRICAL_MAINTENANCE: 'Electrical system inspection and maintenance for safety compliance',
    PLUMBING_MAINTENANCE: 'Plumbing system maintenance and repair work',
    STRUCTURAL_MAINTENANCE: 'Building structural integrity inspection and maintenance',
    EQUIPMENT_MAINTENANCE: 'Industrial equipment maintenance and service',
    CLEANING: 'Facility cleaning and sanitation services',
    GROUNDS_MAINTENANCE: 'Grounds maintenance and landscaping services',
    SECURITY_SYSTEM_MAINTENANCE: 'Security system maintenance and testing'
  };
  return descriptions[type] || 'General facility maintenance work';
}

function getMaintenanceNotes(type, status) {
  if (status === 'COMPLETED') {
    return `${type} maintenance completed successfully. All systems operational.`;
  } else if (status === 'IN_PROGRESS') {
    return `${type} maintenance work in progress. Estimated completion within schedule.`;
  } else if (status === 'CANCELLED') {
    return `${type} maintenance cancelled due to operational requirements.`;
  }
  return `${type} maintenance scheduled and awaiting execution.`;
}

function getComplianceTitle(type) {
  const titles = {
    FIRE_SAFETY: 'Fire Safety Inspection',
    OSHA: 'OSHA Safety Compliance',
    EPA: 'Environmental Protection Compliance',
    BUILDING_CODE: 'Building Code Compliance',
    HEALTH_DEPARTMENT: 'Health Department Inspection',
    INSURANCE: 'Insurance Safety Audit'
  };
  return titles[type] || 'General Compliance Check';
}

function getComplianceDescription(type) {
  const descriptions = {
    FIRE_SAFETY: 'Fire safety systems inspection and compliance verification',
    OSHA: 'Occupational safety and health administration compliance check',
    EPA: 'Environmental protection agency regulations compliance',
    BUILDING_CODE: 'Local building code compliance verification',
    HEALTH_DEPARTMENT: 'Health department regulations compliance check',
    INSURANCE: 'Insurance company safety requirements audit'
  };
  return descriptions[type] || 'General regulatory compliance verification';
}

function getRegulatoryBody(type) {
  const bodies = {
    FIRE_SAFETY: 'Local Fire Department',
    OSHA: 'Occupational Safety and Health Administration',
    EPA: 'Environmental Protection Agency',
    BUILDING_CODE: 'City Building Department',
    HEALTH_DEPARTMENT: 'County Health Department',
    INSURANCE: 'Insurance Company'
  };
  return bodies[type] || 'Regulatory Authority';
}

function getComplianceFrequency(type) {
  const frequencies = {
    FIRE_SAFETY: 365, // Annual
    OSHA: 365, // Annual
    EPA: 180, // Semi-annual
    BUILDING_CODE: 365, // Annual
    HEALTH_DEPARTMENT: 90, // Quarterly
    INSURANCE: 365 // Annual
  };
  return frequencies[type] || 365;
}

function getComplianceEnumFrequency(type) {
  const frequencies = {
    FIRE_SAFETY: 'ANNUALLY',
    OSHA_COMPLIANCE: 'ANNUALLY',
    EPA_COMPLIANCE: 'SEMI_ANNUALLY',
    BUILDING_CODE: 'ANNUALLY',
    HEALTH_DEPARTMENT: 'QUARTERLY',
    INSURANCE_COMPLIANCE: 'ANNUALLY'
  };
  return frequencies[type] || 'ANNUALLY';
}

function getComplianceNotes(type, status) {
  if (status === 'NON_COMPLIANT') {
    return `${type} compliance issues identified. Corrective action required.`;
  } else if (status === 'PENDING_REVIEW') {
    return `${type} compliance review in progress. Awaiting final determination.`;
  } else if (status === 'EXPIRED') {
    return `${type} compliance certification has expired. Renewal required.`;
  }
  return `${type} compliance verified and up to date.`;
}

function getAuditFindings(type) {
  const findings = {
    FIRE_SAFETY: 'Fire extinguishers need recharging, emergency exits properly marked',
    OSHA: 'Safety training records up to date, minor PPE compliance issues',
    EPA: 'Waste disposal procedures compliant, air quality within limits',
    BUILDING_CODE: 'Structure meets current codes, minor electrical updates needed',
    HEALTH_DEPARTMENT: 'Sanitation procedures adequate, food storage compliant',
    INSURANCE: 'Safety protocols in place, equipment maintenance current'
  };
  return findings[type] || 'General audit findings documented';
}

function getCorrectiveActions(type) {
  const actions = {
    FIRE_SAFETY: 'Recharge fire extinguishers, update evacuation plans',
    OSHA: 'Provide additional PPE training, update safety signage',
    EPA: 'Review waste handling procedures, install air quality monitors',
    BUILDING_CODE: 'Update electrical panels, repair structural items',
    HEALTH_DEPARTMENT: 'Enhance cleaning protocols, update food safety training',
    INSURANCE: 'Implement additional safety measures, update equipment maintenance schedule'
  };
  return actions[type] || 'Implement recommended corrective actions';
}

function getIncidentDescription(type) {
  const descriptions = {
    SLIP_FALL: 'Employee slipped on wet floor in warehouse area',
    STRUCK_BY_OBJECT: 'Worker struck by falling object during loading operations',
    CHEMICAL_EXPOSURE: 'Brief exposure to cleaning chemicals during routine maintenance',
    FIRE_EXPLOSION: 'Small electrical fire in equipment room, quickly extinguished',
    ELECTRICAL_SHOCK: 'Electrical shock incident during maintenance work',
    VEHICLE_ACCIDENT: 'Forklift collision with warehouse structure',
    LIFTING_INJURY: 'Back strain injury while lifting heavy materials'
  };
  return descriptions[type] || 'Safety incident occurred during operations';
}

function getIncidentCorrectiveActions(type) {
  const actions = {
    SLIP_FALL: 'Install additional warning signs, improve floor drainage',
    STRUCK_BY_OBJECT: 'Review equipment safety procedures, provide additional training',
    CHEMICAL_EXPOSURE: 'Improve ventilation, update PPE requirements',
    FIRE_EXPLOSION: 'Inspect electrical systems, update fire safety protocols',
    ELECTRICAL_SHOCK: 'Review lockout/tagout procedures, provide electrical safety training',
    VEHICLE_ACCIDENT: 'Install safety barriers, provide defensive driving training',
    LIFTING_INJURY: 'Provide proper lifting training, install mechanical lifting aids'
  };
  return actions[type] || 'Implement safety improvements to prevent recurrence';
}

function getEnvironmentalReading(type, alertLevel) {
  const readings = {
    TEMPERATURE: {
      NORMAL: { value: 68 + Math.random() * 8, unit: '°F', min: 65, max: 80 },
      WARNING: { value: 85 + Math.random() * 10, unit: '°F', min: 65, max: 80 },
      CRITICAL: { value: 100 + Math.random() * 10, unit: '°F', min: 65, max: 80 }
    },
    HUMIDITY: {
      NORMAL: { value: 40 + Math.random() * 20, unit: '%', min: 30, max: 70 },
      WARNING: { value: 75 + Math.random() * 10, unit: '%', min: 30, max: 70 },
      CRITICAL: { value: 90 + Math.random() * 10, unit: '%', min: 30, max: 70 }
    },
    AIR_QUALITY: {
      NORMAL: { value: 25 + Math.random() * 25, unit: 'AQI', min: 0, max: 50 },
      WARNING: { value: 75 + Math.random() * 25, unit: 'AQI', min: 0, max: 50 },
      CRITICAL: { value: 150 + Math.random() * 50, unit: 'AQI', min: 0, max: 50 }
    },
    NOISE_LEVEL: {
      NORMAL: { value: 45 + Math.random() * 15, unit: 'dB', min: 0, max: 70 },
      WARNING: { value: 75 + Math.random() * 10, unit: 'dB', min: 0, max: 70 },
      CRITICAL: { value: 90 + Math.random() * 10, unit: 'dB', min: 0, max: 70 }
    },
    LIGHT_LEVEL: {
      NORMAL: { value: 300 + Math.random() * 200, unit: 'lux', min: 200, max: 800 },
      WARNING: { value: 100 + Math.random() * 50, unit: 'lux', min: 200, max: 800 },
      CRITICAL: { value: 50 + Math.random() * 30, unit: 'lux', min: 200, max: 800 }
    }
  };
  
  const reading = readings[type][alertLevel];
  return {
    value: Math.round(reading.value * 10) / 10,
    unit: reading.unit,
    minThreshold: reading.min,
    maxThreshold: reading.max
  };
}

function getParameterName(type) {
  const parameters = {
    TEMPERATURE: 'Ambient Temperature',
    HUMIDITY: 'Relative Humidity',
    AIR_QUALITY: 'Air Quality Index',
    NOISE_LEVEL: 'Sound Level',
    LIGHT_LEVEL: 'Illumination Level'
  };
  return parameters[type] || type;
}

function getAlertMessage(type, level) {
  const messages = {
    TEMPERATURE: {
      WARNING: 'Temperature above normal operating range',
      CRITICAL: 'Critical temperature - immediate attention required'
    },
    HUMIDITY: {
      WARNING: 'Humidity levels elevated - monitor equipment',
      CRITICAL: 'Critical humidity - risk of equipment damage'
    },
    AIR_QUALITY: {
      WARNING: 'Air quality degraded - increase ventilation',
      CRITICAL: 'Poor air quality - evacuate area if necessary'
    },
    NOISE_LEVEL: {
      WARNING: 'Noise levels above safe limits - hearing protection required',
      CRITICAL: 'Dangerous noise levels - evacuate area'
    },
    LIGHT_LEVEL: {
      WARNING: 'Insufficient lighting - safety hazard',
      CRITICAL: 'Critical lighting failure - operations suspended'
    }
  };
  
  return messages[type] && messages[type][level] || `${level} alert for ${type}`;
}

// Run the script
if (require.main === module) {
  createFacilityMaintenanceSampleData()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createFacilityMaintenanceSampleData };