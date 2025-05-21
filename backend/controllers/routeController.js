const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const polyline = require('@mapbox/polyline');

// Helper to compute optimized route without persisting
async function computeRoute(transporterId, shipmentIds) {
  // Fetch company settings
  const settings = await prisma.companySettings.findFirst();

  // Fetch shipments in provided order
  let shipments = await prisma.shipment.findMany({ where: { id: { in: shipmentIds } } });
  shipments.sort((a, b) => shipmentIds.indexOf(a.id) - shipmentIds.indexOf(b.id));
  let geometry = '';
  // Try Google optimization if enabled
  if (settings.useGoogleRouteOptimization && settings.googleApiKey) {
    const shipmentsForGoogle = shipments;
    if (shipmentsForGoogle.length >= 2) {
      const origin = encodeURIComponent(shipmentsForGoogle[0].origin);
      const destination = encodeURIComponent(shipmentsForGoogle[shipmentsForGoogle.length - 1].destination);
      const waypoints = shipmentsForGoogle.slice(1, -1)
        .map(s => encodeURIComponent(s.origin))
        .join('|');
      const url = `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin}&destination=${destination}` +
        `&waypoints=optimize:true|${waypoints}` +
        `&key=${settings.googleApiKey}`;
      const response = await axios.get(url);
      const route = response.data.routes?.[0];
      if (route?.overview_polyline?.points) {
        geometry = route.overview_polyline.points;
        // reorder shipments based on waypoint_order from Google
        const orderIndexes = route.waypoint_order;
        const reordered = [shipmentsForGoogle[0]];
        orderIndexes.forEach(idx => reordered.push(shipmentsForGoogle[idx + 1]));
        reordered.push(shipmentsForGoogle[shipmentsForGoogle.length - 1]);
        shipments = reordered;
      }
    }
  }
  // Fallback nearest-neighbor if needed
  if (!geometry) {
    // simple Haversine nearest-neighbor ordering on originLat/originLng
    const coordsList = shipments.filter(s => s.originLat != null && s.originLng != null);
    if (coordsList.length) {
      const remaining = [...coordsList];
      const ordered = [];
      let current = remaining.shift();
      ordered.push(current);
      while (remaining.length) {
        let nearestIdx = 0, shortest = Infinity;
        remaining.forEach((r, i) => {
          const dLat = current.originLat - r.originLat;
          const dLng = current.originLng - r.originLng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < shortest) { shortest = dist; nearestIdx = i; }
        });
        current = remaining.splice(nearestIdx, 1)[0];
        ordered.push(current);
      }
      // encode fallback polyline using origin coords
      geometry = polyline.encode(ordered.map(o => [o.originLat, o.originLng]));
      shipments = ordered;
    }
  }
  // Compute ETAs
  const SPEED_KMH = 50;
  const SPEED_MPS = SPEED_KMH * 1000 / 3600;
  function haversine(lat1, lon1, lat2, lon2) {
    const toRad = x => x * Math.PI / 180;
    const R = 6371e3; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // meters
  }
  let etas = [];
  let lastTime = shipments[0]?.shipmentDate ? new Date(shipments[0].shipmentDate) : new Date();
  etas.push(lastTime.toISOString());
  for (let i = 1; i < shipments.length; ++i) {
    const prev = shipments[i-1]; const curr = shipments[i];
    if (prev.originLat != null && prev.originLng != null && curr.originLat != null && curr.originLng != null) {
      const dist = haversine(prev.originLat, prev.originLng, curr.originLat, curr.originLng);
      lastTime = new Date(lastTime.getTime() + (dist / SPEED_MPS) * 1000);
    } else {
      lastTime = new Date(lastTime.getTime() + 30 * 60 * 1000);
    }
    etas.push(lastTime.toISOString());
  }
  return { shipments, geometry, etas };
}

// POST /routes/optimize
exports.optimizeRoute = async (req, res) => {
  const { transporterId, shipmentIds, persist } = req.body;
  if (!transporterId || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    return res.status(400).json({ error: 'transporterId and shipmentIds are required' });
  }
  try {
    // Fetch company settings
    const settings = await prisma.companySettings.findFirst();

    // [.. optimization logic ..]
    // Compute ETAs
    const resultComputed = await computeRoute(transporterId, shipmentIds); // assume helper existing
    const { shipments, geometry, etas } = resultComputed;

    // If not persisting, return only computed route data
    if (!persist) {
      return res.json({ shipments, geometry, etas });
    }

    // Persist route and routeShipments
    const routeRec = await prisma.route.create({ data: { transporterId, geometry } });
    const routeShipments = shipments.map((s, idx) => ({ routeId: routeRec.id, shipmentId: s.id, order: idx }));
    await prisma.routeShipment.createMany({ data: routeShipments });

    // Return full persisted route with ETAs
    const result = await prisma.route.findUnique({
      where: { id: routeRec.id },
      include: {
        User: true,
        Offer: true,
        RouteShipment: { orderBy: { order: 'asc' }, include: { Shipment: true } }
      }
    });
    return res.json({ ...result, etas });
  } catch (err) {
    console.error('Error optimizing route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /routes  (persist computed route)
exports.createRoute = async (req, res) => {
  const { transporterId, shipmentIds } = req.body;
  if (!transporterId || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    return res.status(400).json({ error: 'transporterId and shipmentIds are required' });
  }
  try {
    const { shipments, geometry, etas } = await computeRoute(transporterId, shipmentIds);
    // Persist route
    const routeRec = await prisma.route.create({ data: { transporterId, geometry } });
    const routeShipments = shipments.map((s, idx) => ({ routeId: routeRec.id, shipmentId: s.id, order: idx }));
    await prisma.routeShipment.createMany({ data: routeShipments });
    const result = await prisma.route.findUnique({
      where: { id: routeRec.id },
      include: {
        User: true,
        Offer: true,
        RouteShipment: { orderBy: { order: 'asc' }, include: { Shipment: true } }
      }
    });
    return res.json({ ...result, etas });
  } catch (err) {
    console.error('Error creating route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /routes
exports.listRoutes = async (req, res) => {
  const { transporterId } = req.query;
  const where = transporterId ? { transporterId } : undefined;
  try {
    const routes = await prisma.route.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        User: true,
        Offer: true,
        RouteShipment: {
          orderBy: { order: 'asc' },
          include: { Shipment: true }
        }
      }
    });
    return res.json(routes);
  } catch (err) {
    console.error('Error listing routes:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /routes/:id
exports.getRoute = async (req, res) => {
  const { id } = req.params;
  try {
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        User: true,
        Offer: true,
        RouteShipment: {
          orderBy: { order: 'asc' },
          include: { Shipment: true }
        }
      }
    });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    return res.json(route);
  } catch (err) {
    console.error('Error fetching route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /routes/:routeId/stops/:shipmentId/complete
exports.completeStop = async (req, res) => {
  const { routeId, shipmentId } = req.params;
  try {
    const updated = await prisma.routeShipment.update({
      where: { routeId_shipmentId: { routeId, shipmentId } },
      data: { status: 'COMPLETED' },
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error completing stop:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /routes/:routeId/stops/:shipmentId/skip
exports.skipStop = async (req, res) => {
  const { routeId, shipmentId } = req.params;
  try {
    const updated = await prisma.routeShipment.update({
      where: { routeId_shipmentId: { routeId, shipmentId } },
      data: { status: 'SKIPPED' },
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error skipping stop:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /routes/:id
exports.deleteRoute = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete all route–shipment associations
    await prisma.routeShipment.deleteMany({ where: { routeId: id } });
    // Delete the route itself
    await prisma.route.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting route:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 