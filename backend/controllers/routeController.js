const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const polyline = require('@mapbox/polyline');

// POST /routes/optimize
exports.optimizeRoute = async (req, res) => {
  const { transporterId, shipmentIds } = req.body;
  if (!transporterId || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    return res.status(400).json({ error: 'transporterId and shipmentIds are required' });
  }
  try {
    // Fetch company settings
    const settings = await prisma.companySettings.findFirst();

    // Fetch shipments in provided order
    let shipments = await prisma.shipment.findMany({ where: { id: { in: shipmentIds } } });
    // sort shipments by input order
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

    // Fallback nearest-neighbor if Google disabled or failed
    if (!settings.useGoogleRouteOptimization || !settings.googleApiKey || !geometry) {
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

    // Create Route record and ordered linking
    const routeRec = await prisma.route.create({ data: { transporterId, geometry } });
    const routeShipments = shipments.map((s, idx) => ({ routeId: routeRec.id, shipmentId: s.id, order: idx }));
    await prisma.routeShipment.createMany({ data: routeShipments });

    // Return full route with mapped shipments
    const result = await prisma.route.findUnique({
      where: { id: routeRec.id },
      include: {
        transporter: true,
        shipments: { orderBy: { order: 'asc' }, include: { shipment: true } }
      }
    });
    return res.json(result);
  } catch (err) {
    console.error('Error optimizing route:', err);
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
        transporter: true,
        shipments: { orderBy: { order: 'asc' }, include: { shipment: true } }
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
        transporter: true,
        shipments: { orderBy: { order: 'asc' }, include: { shipment: true } }
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