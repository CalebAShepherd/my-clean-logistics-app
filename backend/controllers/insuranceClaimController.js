const prisma = require('../services/prisma');

// Get insurance claims with filtering and pagination
exports.getInsuranceClaims = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      status,
      facilityId,
      insurer,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'dateFiled',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };
    if (status && status !== 'all') where.status = status;
    if (facilityId && facilityId !== 'all') where.facilityId = facilityId;
    if (insurer) where.insurer = insurer;
    if (startDate || endDate) {
      where.dateFiled = {};
      if (startDate) where.dateFiled.gte = new Date(startDate);
      if (endDate) where.dateFiled.lte = new Date(endDate);
    }

    const [claims, totalCount] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          facility: { select: { id: true, name: true } }
        }
      }),
      prisma.insuranceClaim.count({ where })
    ]);

    res.json({
      claims,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching insurance claims:', error);
    res.status(500).json({ error: 'Failed to fetch insurance claims' });
  }
};

exports.createInsuranceClaim = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      claimNumber,
      referenceId,
      referenceType,
      facilityId,
      insurer,
      dateFiled,
      claimAmount,
      description,
      documentsUrls
    } = req.body;

    if (!claimNumber || !insurer || !dateFiled || !claimAmount) {
      return res.status(400).json({ error: 'claimNumber, insurer, dateFiled, and claimAmount are required' });
    }

    const claim = await prisma.insuranceClaim.create({
      data: {
        claimNumber,
        referenceId,
        referenceType,
        facilityId,
        insurer,
        dateFiled: new Date(dateFiled),
        claimAmount,
        description,
        documentsUrls: documentsUrls || [],
        tenantId
      },
      include: {
        facility: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error('Error creating insurance claim:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'claimNumber must be unique' });
    }
    res.status(500).json({ error: 'Failed to create insurance claim' });
  }
};

exports.updateInsuranceClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const claim = await prisma.insuranceClaim.update({
      where: { id },
      data: { status }
    });

    res.json(claim);
  } catch (error) {
    console.error('Error updating insurance claim:', error);
    res.status(500).json({ error: 'Failed to update insurance claim' });
  }
}; 