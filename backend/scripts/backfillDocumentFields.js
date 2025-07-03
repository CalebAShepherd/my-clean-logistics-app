const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting to backfill document fields...');

  const documentsToUpdate = await prisma.document.findMany({
    where: {
      OR: [
        { name: null },
        { relatedId: null },
        { relatedType: null },
        { updatedAt: null },
      ],
    },
  });

  if (documentsToUpdate.length === 0) {
    console.log('No documents found that need backfilling. Exiting.');
    return;
  }

  console.log(`Found ${documentsToUpdate.length} documents to update.`);

  for (const doc of documentsToUpdate) {
    try {
      // Assuming existing documents are related to shipments, as per the old schema.
      const updatedData = {
        name: doc.name || doc.url.split('/').pop() || 'Untitled Document',
        relatedId: doc.relatedId || doc.shipmentId,
        relatedType: doc.relatedType || 'SHIPMENT',
        updatedAt: doc.updatedAt || doc.createdAt || new Date(),
      };

      if (!updatedData.relatedId) {
          console.warn(`Document with ID ${doc.id} has no shipmentId. Cannot set relatedId. Skipping related fields.`);
          delete updatedData.relatedId;
          delete updatedData.relatedType;
      }


      await prisma.document.update({
        where: { id: doc.id },
        data: updatedData,
      });

      console.log(`Successfully updated document with ID: ${doc.id}`);
    } catch (error) {
      console.error(`Failed to update document with ID ${doc.id}:`, error);
    }
  }

  console.log('Backfill process completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 