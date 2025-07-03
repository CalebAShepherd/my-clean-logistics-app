const prisma = require('../services/prisma');

// ===================== SOX CONTROLS ===================== //

// Get SOX controls with filtering and pagination
exports.getSoxControls = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      area,
      status,
      owner,
      page = 1,
      limit = 20,
      sortBy = 'controlNumber',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };
    if (area && area !== 'all') where.area = area;
    if (status && status !== 'all') where.status = status;
    if (owner) where.owner = owner;

    const [controls, totalCount] = await Promise.all([
      prisma.soxControl.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          ownerUser: { select: { id: true, username: true, email: true } },
          _count: {
            select: { tests: true }
          }
        }
      }),
      prisma.soxControl.count({ where })
    ]);

    res.json({
      controls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching SOX controls:', error);
    res.status(500).json({ error: 'Failed to fetch SOX controls' });
  }
};

// Create a SOX control
exports.createSoxControl = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      controlNumber,
      name,
      description,
      area,
      frequency,
      owner,
      status
    } = req.body;

    if (!controlNumber || !name || !area || !frequency) {
      return res.status(400).json({ error: 'controlNumber, name, area, and frequency are required' });
    }

    const control = await prisma.soxControl.create({
      data: {
        controlNumber,
        name,
        description,
        area,
        frequency,
        owner: owner || userId,
        status: status || 'DESIGN',
        tenantId
      },
      include: {
        ownerUser: { select: { id: true, username: true, email: true } }
      }
    });

    res.status(201).json(control);
  } catch (error) {
    console.error('Error creating SOX control:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'controlNumber already exists' });
    }
    res.status(500).json({ error: 'Failed to create SOX control' });
  }
};

// ===================== SOX TESTS ===================== //

exports.getSoxTests = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      controlId,
      result,
      page = 1,
      limit = 20,
      sortBy = 'testDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };
    if (controlId) where.controlId = controlId;
    if (result && result !== 'all') where.result = result;

    const [tests, totalCount] = await Promise.all([
      prisma.soxTest.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          control: {
            select: { id: true, controlNumber: true, name: true }
          },
          testerUser: { select: { id: true, username: true, email: true } }
        }
      }),
      prisma.soxTest.count({ where })
    ]);

    res.json({
      tests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching SOX tests:', error);
    res.status(500).json({ error: 'Failed to fetch SOX tests' });
  }
};

exports.createSoxTest = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { controlId, testDate, result, issuesFound, remediationPlan, retestDate } = req.body;

    if (!controlId || !testDate) {
      return res.status(400).json({ error: 'controlId and testDate are required' });
    }

    const test = await prisma.soxTest.create({
      data: {
        controlId,
        testDate: new Date(testDate),
        testedBy: userId,
        result: result || 'PASS',
        issuesFound,
        remediationPlan,
        retestDate: retestDate ? new Date(retestDate) : null,
        tenantId
      },
      include: {
        control: {
          select: { id: true, controlNumber: true, name: true }
        },
        testerUser: { select: { id: true, username: true, email: true } }
      }
    });

    // Optionally update control status if test failed
    if (result === 'FAIL') {
      await prisma.soxControl.update({
        where: { id: controlId },
        data: { status: 'INEFFECTIVE', lastTested: new Date(testDate) }
      });
    } else {
      await prisma.soxControl.update({
        where: { id: controlId },
        data: { status: 'TESTED', lastTested: new Date(testDate) }
      });
    }

    res.status(201).json(test);
  } catch (error) {
    console.error('Error creating SOX test:', error);
    res.status(500).json({ error: 'Failed to create SOX test' });
  }
}; 