// USD Exporter - Generates USDA format

export class USDExporter {
  constructor() {
    this.version = 'VOID-0.1.0';
  }
  
  exportScene(objects, options = {}) {
    const lines = [];
    
    lines.push(`# USD Export from ${this.version}`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('usdaVersion "2.0"');
    lines.push('');
    lines.push('def "World" (');
    lines.push('    kind = "group"');
    lines.push(') {');
    
    for (const obj of objects) {
      const objBlock = this.exportObject(obj);
      lines.push(objBlock);
    }
    
    lines.push('}');
    
    return lines.join('\n');
  }
  
  exportObject(obj) {
    const lines = [];
    const safeName = this.sanitizeName(obj.name);
    
    lines.push(`    def Xform "${safeName}_Xform" (`);
    lines.push('        kind = "component"');
    lines.push('    ) {');
    
    // Transform
    const { position, rotation, scale } = obj.transform;
    lines.push(`        double3 xformOp:translate = (${this.formatNumber(position[0])}, ${this.formatNumber(position[1])}, ${this.formatNumber(position[2])})`);
    lines.push(`        double3 xformOp:rotateXYZ = (${this.formatNumber(rotation[0])}, ${this.formatNumber(rotation[1])}, ${this.formatNumber(rotation[2])})`);
    lines.push(`        double3 xformOp:scale = (${this.formatNumber(scale[0])}, ${this.formatNumber(scale[1])}, ${this.formatNumber(scale[2])})`);
    
    lines.push('');
    
    // Geometry
    if (obj.geometry) {
      const meshBlock = this.exportMesh(obj);
      lines.push(meshBlock);
    }
    
    lines.push('    }');
    
    return lines.join('\n');
  }
  
  exportMesh(obj) {
    const lines = [];
    const safeName = this.sanitizeName(obj.name);
    const { geometry } = obj;
    
    lines.push(`        def Mesh "${safeName}_Mesh" {`);
    
    // Face vertex counts (assuming triangulated)
    const faceCounts = [];
    for (let i = 0; i < geometry.faceCount; i++) {
      faceCounts.push('3');
    }
    lines.push(`            int[] faceVertexCounts = [${faceCounts.join(', ')}]`);
    
    // Face vertex indices
    const indices = [];
    for (let i = 0; i < geometry.faces.length; i++) {
      indices.push(geometry.faces[i]);
    }
    lines.push(`            int[] faceVertexIndices = [${indices.join(', ')}]`);
    
    // Points (vertices)
    const points = [];
    for (let i = 0; i < geometry.vertices.length; i += 3) {
      points.push(`(${this.formatNumber(geometry.vertices[i])}, ${this.formatNumber(geometry.vertices[i+1])}, ${this.formatNumber(geometry.vertices[i+2])})`);
    }
    lines.push(`            point3f[] points = [${points.join(', ')}]`);
    
    // Normals (if available)
    if (geometry.normals && geometry.normals.length > 0) {
      const normals = [];
      for (let i = 0; i < geometry.normals.length; i += 3) {
        normals.push(`(${this.formatNumber(geometry.normals[i])}, ${this.formatNumber(geometry.normals[i+1])}, ${this.formatNumber(geometry.normals[i+2])})`);
      }
      lines.push(`            normal3f[] normals = [${normals.join(', ')}]`);
    }
    
    // UVs
    if (geometry.uvs && geometry.uvs.length > 0) {
      const uvs = [];
      for (let i = 0; i < geometry.uvs.length; i += 2) {
        uvs.push(`(${this.formatNumber(geometry.uvs[i])}, ${this.formatNumber(geometry.uvs[i+1])})`);
      }
      lines.push(`            texcoord2f[] primvars:st = [${uvs.join(', ')}]`);
    }
    
    lines.push('            uniform token subdivisionScheme = "none"');
    lines.push('            uniform bool doubleSided = true');
    lines.push('');
    
    // Material
    if (obj.material) {
      const matBlock = this.exportMaterial(obj.material);
      lines.push(matBlock);
    }
    
    lines.push('        }');
    
    return lines.join('\n');
  }
  
  exportMaterial(material) {
    const lines = [];
    const safeName = this.sanitizeName(material.name);
    
    lines.push('');
    lines.push(`            def Material "${safeName}" {`);
    lines.push('                token outputs:surface.connect = </World/' + safeName + '_Xform/' + safeName + '_Mesh/PreviewSurface>');
    lines.push('');
    lines.push('                def Shader "PreviewSurface" {');
    lines.push('                    uniform token id = "UsdPreviewSurface"');
    
    const { diffuseColor, opacity, diffuseTexture } = material;
    lines.push(`                    color3f inputs:diffuseColor = (${this.formatNumber(diffuseColor[0])}, ${this.formatNumber(diffuseColor[1])}, ${this.formatNumber(diffuseColor[2])})`);
    lines.push(`                    float inputs:roughness = 0.5`);
    lines.push(`                    float inputs:metallic = 0.0`);
    
    if (opacity !== undefined && opacity < 1.0) {
      lines.push(`                    float inputs:opacity = ${this.formatNumber(opacity)}`);
    }
    
    lines.push('                }');
    lines.push('            }');
    lines.push('');
    lines.push(`            rel material:binding = </World/${safeName}_Xform/${safeName}_Mesh/${safeName}>`);
    
    return lines.join('\n');
  }
  
  sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  formatNumber(n) {
    if (typeof n !== 'number') return '0';
    const rounded = Math.round(n * 10000) / 10000;
    return rounded.toString();
  }
}

export const usdExporter = new USDExporter();
