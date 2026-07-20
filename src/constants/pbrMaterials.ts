export interface PBRMaterialMapping {
  category: string | RegExp;
  color: number;
  metalness: number;
  roughness: number;
  transmission?: number;
  transparent?: boolean;
  opacity?: number;
  isPhysical?: boolean;
}

export const PBR_MATERIAL_MAPPINGS: PBRMaterialMapping[] = [
  {
    category: /IfcWindow/i,
    color: 0xdfe9f0,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.9,
    transparent: true,
    opacity: 0.35,
    isPhysical: true,
  },
  {
    category: /IfcCurtainWall|IfcMember/i,
    color: 0xb8bec4,
    metalness: 0.9,
    roughness: 0.35,
  },
  {
    category: /IfcWall/i,
    color: 0xf2f1ec,
    metalness: 0.0,
    roughness: 0.85,
  },
  {
    category: /IfcSlab|IfcColumn/i,
    color: 0xc9c7c2,
    metalness: 0.0,
    roughness: 0.9,
  },
  {
    category: /IfcCovering/i,
    color: 0x9a9ba0,
    metalness: 0.0,
    roughness: 0.95,
  },
  {
    category: /IfcDuctSegment|IfcDuctFitting/i,
    color: 0xaeb4b8,
    metalness: 0.85,
    roughness: 0.45,
  },
  {
    category: /IfcPipeSegment|IfcFlowFitting/i,
    color: 0x7a8288,
    metalness: 0.6,
    roughness: 0.5,
  },
  {
    category: /IfcDoor/i,
    color: 0xc4c8cc,
    metalness: 1.0,
    roughness: 0.3,
  },
  {
    category: /IfcFurniture/i,
    color: 0x8b6a4a,
    metalness: 0.0,
    roughness: 0.6,
  },
  {
    category: /IfcEnergyConversionDevice/i,
    color: 0x5e6a75,
    metalness: 0.4,
    roughness: 0.55,
  },
];
