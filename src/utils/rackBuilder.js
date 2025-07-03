import * as THREE from 'three';

export function buildRackMesh(rackSpec) {
  const {
    size: { x: width, y: height, z: depth },
    position: { x: posX, y: posY, z: posZ },
    levels = 3,
    columns = 3,
    shelfThickness = 0.05,
    postThickness = 0.05,
    beamThickness = 0.05,
    color = 0x8B4513
  } = rackSpec;

  const group = new THREE.Group();
  group.position.set(posX, posY, posZ);

  // Materials
  const postMaterial = new THREE.MeshStandardMaterial({ color });
  const beamMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0xDEB887 });

  // Vertical posts at 4 corners
  const halfWidth = width / 2 - postThickness / 2;
  const halfDepth = depth / 2 - postThickness / 2;
  const postGeo = new THREE.BoxGeometry(postThickness, height, postThickness);
  [[-halfWidth, height / 2, -halfDepth],
   [ halfWidth, height / 2, -halfDepth],
   [-halfWidth, height / 2,  halfDepth],
   [ halfWidth, height / 2,  halfDepth]
  ].forEach(([x, y, z]) => {
    const mesh = new THREE.Mesh(postGeo, postMaterial);
    mesh.position.set(x, y, z);
    group.add(mesh);
  });

  // Shelves and beams
  for (let lvl = 0; lvl < levels; lvl++) {
    const y = (lvl + 1) * (height / (levels + 1));

    // Beams front and back
    const beamLength = width - postThickness * 2;
    const beamGeo = new THREE.BoxGeometry(beamLength, beamThickness, postThickness);
    const frontBeam = new THREE.Mesh(beamGeo, beamMaterial);
    frontBeam.position.set(0, y + beamThickness / 2, -halfDepth);
    const backBeam = frontBeam.clone();
    backBeam.position.set(0, y + beamThickness / 2, halfDepth);
    group.add(frontBeam, backBeam);

    // Shelf panel
    const shelfGeo = new THREE.BoxGeometry(beamLength, shelfThickness, depth - postThickness * 2);
    const shelfMesh = new THREE.Mesh(shelfGeo, shelfMaterial);
    shelfMesh.position.set(0, y, 0);
    // Tag for selection
    shelfMesh.userData = { rackId: rackSpec.id, shelfIndex: lvl };
    group.add(shelfMesh);
  }

  return group;
} 