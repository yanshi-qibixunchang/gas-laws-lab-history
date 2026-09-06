import type { PhysicsEngine } from '../../domain/hardSphere/PhysicsEngine';

export interface StandardEngineRuntime {
  engine: PhysicsEngine;
  frameCount: number;
  simulationTimerId: number | null;
}
