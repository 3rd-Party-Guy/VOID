// GeometryFactory - Generates primitive geometries

export const GeometryTypes = {
  CUBE: 'cube',
  SPHERE: 'sphere',
  CYLINDER: 'cylinder',
  CONE: 'cone',
  PYRAMID: 'pyramid',
  PLANE: 'plane',
  TORUS: 'torus',
  TRIANGLE: 'triangle'
};

export function createCube(params = {}) {
  const size = params.size || 1;
  const halfSize = size / 2;
  
  // 8 shared vertices (one per corner)
  const vertices = new Float32Array([
    // Order: +X+Y+Z, -X+Y+Z, -X-Y+Z, +X-Y+Z, +X+Y-Z, -X+Y-Z, -X-Y-Z, +X-Y-Z
    // Cube corners (8 vertices)
     halfSize,  halfSize,  halfSize,  // 0: +X+Y+Z (front top right)
    -halfSize,  halfSize,  halfSize,  // 1: -X+Y+Z (front top left)
    -halfSize, -halfSize,  halfSize,  // 2: -X-Y+Z (front bottom left)
     halfSize, -halfSize,  halfSize,  // 3: +X-Y+Z (front bottom right)
     halfSize,  halfSize, -halfSize,  // 4: +X+Y-Z (back top right)
    -halfSize,  halfSize, -halfSize,  // 5: -X+Y-Z (back top left)
    -halfSize, -halfSize, -halfSize,  // 6: -X-Y-Z (back bottom left)
     halfSize, -halfSize, -halfSize,  // 7: +X-Y-Z (back bottom right)
  ]);
  
  // 12 triangles (2 per face * 6 faces)
  const faces = new Uint16Array([
    // Front (+Z)
    0, 1, 2,  0, 2, 3,
    // Back (-Z)
    4, 6, 5,  4, 7, 6,
    // Top (+Y)
    0, 4, 5,  0, 5, 1,
    // Bottom (-Y)
    2, 6, 7,  2, 7, 3,
    // Right (+X)
    0, 3, 7,  0, 7, 4,
    // Left (-X)
    1, 5, 6,  1, 6, 2
  ]);
  
  const uvs = new Float32Array([
    // 8 shared vertices - assign UVs based on position
    // +X+Y+Z: 1,1
    1, 1,
    // -X+Y+Z: 0,1
    0, 1,
    // -X-Y+Z: 0,0
    0, 0,
    // +X-Y+Z: 1,0
    1, 0,
    // +X+Y-Z: 1,1
    1, 1,
    // -X+Y-Z: 0,1
    0, 1,
    // -X-Y-Z: 0,0
    0, 0,
    // +X-Y-Z: 1,0
    1, 0,
  ]);

  return { vertices, faces, uvs, vertexCount: 8, faceCount: 12, edgeCount: 12 };
}

export function createSphere(params = {}) {
  const radius = params.radius || 0.5;
  const segments = params.segments || 32;
  const rings = params.rings || 16;
  
  const vertices = [];
  const uvs = [];
  const faces = [];
  
  for (let lat = 0; lat <= rings; lat++) {
    const theta = (lat * Math.PI) / rings;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    
    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;
      
      vertices.push(radius * x, radius * y, radius * z);
      uvs.push(lon / segments, lat / rings);
    }
  }
  
  for (let lat = 0; lat < rings; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const first = lat * (segments + 1) + lon;
      const second = first + segments + 1;
      
      faces.push(first, second, first + 1);
      faces.push(second, second + 1, first + 1);
    }
  }
  
  return {
    vertices: new Float32Array(vertices),
    faces: new Uint16Array(faces),
    uvs: new Float32Array(uvs),
    vertexCount: vertices.length / 3,
    faceCount: faces.length / 3,
    edgeCount: computeEdgeCount(faces)
  };
}

export function createCylinder(params = {}) {
  const radius = params.radius || 0.5;
  const height = params.height || 1;
  const segments = params.segments || 32;
  
  const vertices = [];
  const uvs = [];
  const faces = [];
  const halfHeight = height / 2;
  
  // Side vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    vertices.push(x, -halfHeight, z);
    vertices.push(x, halfHeight, z);
    uvs.push(i / segments, 0);
    uvs.push(i / segments, 1);
  }
  
  // Side faces
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i * 2 + 2;
    const d = i * 2 + 3;
    faces.push(a, c, b);
    faces.push(b, c, d);
  }
  
  return {
    vertices: new Float32Array(vertices),
    faces: new Uint16Array(faces),
    uvs: new Float32Array(uvs),
    vertexCount: vertices.length / 3,
    faceCount: faces.length / 3,
    edgeCount: computeEdgeCount(faces)
  };
}

export function createCone(params = {}) {
  const radius = params.radius || 0.5;
  const height = params.height || 1;
  const segments = params.segments || 32;
  
  const vertices = [];
  const uvs = [];
  const faces = [];
  const halfHeight = height / 2;
  
  // Tip vertex
  vertices.push(0, halfHeight, 0);
  uvs.push(0.5, 1);
  
  // Base center
  vertices.push(0, -halfHeight, 0);
  uvs.push(0.5, 0);
  
  // Base vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    vertices.push(x, -halfHeight, z);
    uvs.push(i / segments, 0);
  }
  
  // Tip triangles
  for (let i = 0; i < segments; i++) {
    faces.push(0, i + 2, i + 3);
  }
  
  // Base triangles (winding reversed for proper normal)
  for (let i = 0; i < segments; i++) {
    faces.push(1, i + 3, i + 2);
  }
  
  return {
    vertices: new Float32Array(vertices),
    faces: new Uint16Array(faces),
    uvs: new Float32Array(uvs),
    vertexCount: vertices.length / 3,
    faceCount: faces.length / 3,
    edgeCount: computeEdgeCount(faces)
  };
}

export function createPyramid(params = {}) {
  const baseSize = params.baseSize || 1;
  const height = params.height || 1;
  
  const halfBase = baseSize / 2;
  const halfHeight = height / 2;
  
  const vertices = new Float32Array([
    // Base (0-3)
    -halfBase, -halfHeight, -halfBase,
     halfBase, -halfHeight, -halfBase,
     halfBase, -halfHeight,  halfBase,
    -halfBase, -halfHeight,  halfBase,
    // Tip (4)
    0, halfHeight, 0
  ]);
  
  const faces = new Uint16Array([
    0, 2, 1, 0, 3, 2,  // Base (reversed winding)
    0, 1, 4,            // Front
    1, 2, 4,            // Right
    2, 3, 4,            // Back
    3, 0, 4             // Left
  ]);
  
  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    0.5, 1
  ]);
  
  return {
    vertices,
    faces,
    uvs,
    vertexCount: 5,
    faceCount: 5,
    edgeCount: computeEdgeCount(faces)
  };
}

export function createPlane(params = {}) {
  const size = params.size || 1;
  const halfSize = size / 2;
  
  const vertices = new Float32Array([
    -halfSize, 0, -halfSize,
     halfSize, 0, -halfSize,
     halfSize, 0,  halfSize,
    -halfSize, 0,  halfSize
  ]);
  
  const faces = new Uint16Array([0, 1, 2, 0, 2, 3]);
  
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1
  ]);
  
  return { vertices, faces, uvs, vertexCount: 4, faceCount: 1, edgeCount: 4 };
}

export function createTorus(params = {}) {
  const majorRadius = params.majorRadius || 0.5;
  const minorRadius = params.minorRadius || 0.2;
  const segments = params.segments || 48;
  const sides = params.sides || 12;
  
  const vertices = [];
  const uvs = [];
  const faces = [];
  
  for (let j = 0; j <= sides; j++) {
    for (let i = 0; i <= segments; i++) {
      const u = i / segments * Math.PI * 2;
      const v = j / sides * Math.PI * 2;
      
      const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
      const y = minorRadius * Math.sin(v);
      const z = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
      
      vertices.push(x, y, z);
      uvs.push(i / segments, j / sides);
    }
  }
  
  for (let j = 0; j < sides; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + segments + 1;
      
      faces.push(a, b, a + 1);
      faces.push(b, b + 1, a + 1);
    }
  }
  
  return {
    vertices: new Float32Array(vertices),
    faces: new Uint16Array(faces),
    uvs: new Float32Array(uvs),
    vertexCount: vertices.length / 3,
    faceCount: faces.length / 3,
    edgeCount: computeEdgeCount(faces)
  };
}

export function createTriangle(params = {}) {
  const side = params.side || 1;
  const height = side * Math.sqrt(3) / 2;
  
  const vertices = new Float32Array([
    0, height * 2/3, 0,
    -side/2, -height/3, 0,
    side/2, -height/3, 0
  ]);
  
  const faces = new Uint16Array([0, 1, 2]);
  
  const uvs = new Float32Array([
    0.5, 1,
    0, 0,
    1, 0
  ]);
  
  return { vertices, faces, uvs, vertexCount: 3, faceCount: 1, edgeCount: 3 };
}

export function createGeometry(type, params = {}) {
  switch (type) {
    case GeometryTypes.CUBE:
      return createCube(params);
    case GeometryTypes.SPHERE:
      return createSphere(params);
    case GeometryTypes.CYLINDER:
      return createCylinder(params);
    case GeometryTypes.CONE:
      return createCone(params);
    case GeometryTypes.PYRAMID:
      return createPyramid(params);
    case GeometryTypes.PLANE:
      return createPlane(params);
    case GeometryTypes.TORUS:
      return createTorus(params);
    case GeometryTypes.TRIANGLE:
      return createTriangle(params);
    default:
      throw new Error(`Unknown geometry type: ${type}`);
  }
}

export function computeNormals(vertices, faces) {
  const normals = new Float32Array(vertices.length);
  const vertexCount = vertices.length / 3;
  
  for (let i = 0; i < faces.length; i += 3) {
    const i0 = faces[i] * 3;
    const i1 = faces[i + 1] * 3;
    const i2 = faces[i + 2] * 3;
    
    const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
    const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
    const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
    
    const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    
    const normal = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0]
    ];
    
    for (const idx of [i0, i1, i2]) {
      normals[idx] += normal[0];
      normals[idx + 1] += normal[1];
      normals[idx + 2] += normal[2];
    }
  }
  
  for (let i = 0; i < vertexCount; i++) {
    const idx = i * 3;
    const len = Math.sqrt(
      normals[idx] ** 2 + 
      normals[idx + 1] ** 2 + 
      normals[idx + 2] ** 2
    );
    if (len > 0) {
      normals[idx] /= len;
      normals[idx + 1] /= len;
      normals[idx + 2] /= len;
    }
  }
  
  return normals;
}

export function computeEdgeCount(faces) {
  if (!faces) return 0;
  const edgeSet = new Set();
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i];
    const b = faces[i + 1];
    const c = faces[i + 2];
    const edges = [
      [Math.min(a, b), Math.max(a, b)],
      [Math.min(b, c), Math.max(b, c)],
      [Math.min(c, a), Math.max(c, a)]
    ];
    edges.forEach(([v1, v2]) => edgeSet.add(`${v1}:${v2}`));
  }
  return edgeSet.size;
}
