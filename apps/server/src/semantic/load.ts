import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { SemanticLayerSchema, type SemanticLayer } from '@vd/shared';

let cachedSemanticLayer: SemanticLayer | null = null;

export function loadSemanticLayer(): SemanticLayer {
  if (cachedSemanticLayer) return cachedSemanticLayer;

  const possiblePaths = [
    path.resolve(process.cwd(), 'semantic/semantic.yaml'),
    path.resolve(process.cwd(), '../../semantic/semantic.yaml'),
    path.resolve(process.cwd(), '../semantic/semantic.yaml'),
  ];

  let foundPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (!foundPath) {
    throw new Error(`semantic/semantic.yaml not found in any of: ${possiblePaths.join(', ')}`);
  }

  const raw = fs.readFileSync(foundPath, 'utf8');
  const parsed = yaml.parse(raw);
  cachedSemanticLayer = SemanticLayerSchema.parse(parsed);
  return cachedSemanticLayer;
}
