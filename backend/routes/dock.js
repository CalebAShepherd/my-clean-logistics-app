const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
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
} = require('../controllers/dockController');

// Apply authentication middleware to all routes
router.use(requireAuth);

// === DOCK DOOR MANAGEMENT ===
router.get('/doors/:warehouseId', getDockDoors);      // GET /dock/doors/:warehouseId - Get all dock doors
router.get('/door/:id', getDockDoorById);            // GET /dock/door/:id - Get single dock door
router.post('/doors', createDockDoor);                // POST /dock/doors - Create new dock door
router.put('/doors/:id/status', updateDockDoorStatus); // PUT /dock/doors/:id/status - Update dock door status

// === APPOINTMENT MANAGEMENT ===
router.get('/appointments', getAppointments);         // GET /dock/appointments - Get all appointments with filtering
router.get('/appointments/stats/:warehouseId', getDockStats); // GET /dock/appointments/stats/:warehouseId - Get dock statistics
router.get('/appointments/time-slots', getAvailableTimeSlots); // GET /dock/appointments/time-slots - Get available time slots
router.get('/appointments/:id', getAppointmentById);  // GET /dock/appointments/:id - Get single appointment
router.post('/appointments', createAppointment);      // POST /dock/appointments - Create new appointment
router.put('/appointments/:id', updateAppointment);   // PUT /dock/appointments/:id - Update appointment
router.put('/appointments/:id/checkin', checkInAppointment);  // PUT /dock/appointments/:id/checkin - Check-in appointment
router.put('/appointments/:id/checkout', checkOutAppointment); // PUT /dock/appointments/:id/checkout - Check-out appointment
router.put('/appointments/:id/cancel', cancelAppointment);    // PUT /dock/appointments/:id/cancel - Cancel appointment

module.exports = router; 