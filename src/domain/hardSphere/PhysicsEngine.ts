import type {
  SimulationParams,
  Particle,
  HistogramBin,
  ChartData,
  SimulationStats,
  PressureMeasurementSummary,
  PressureWindowPoint,
} from '../../shared/types.ts';
import {
  HARD_SPHERE_MAX_COLLECTED_SAMPLES,
  HARD_SPHERE_MAX_PRESSURE_HISTORY,
  HARD_SPHERE_MAX_TEMPERATURE_HISTORY,
  validateHardSphereSimulationParams,
} from './hardSphereSimulationValidation.ts';

const PRESSURE_EPSILON = 1e-9;
export const HARD_SPHERE_PRESSURE_SAMPLE_WINDOW_S = 0.1;
export const PHYSICS_ENGINE_SNAPSHOT_VERSION = 2 as const;
export type HardSphereThermostatTargetMode = 'explicit' | 'canonical-default' | 'legacy-v1';

export interface PhysicsEngineSnapshotV2 {
  schemaVersion: typeof PHYSICS_ENGINE_SNAPSHOT_VERSION;
  params: SimulationParams;
  particles: Particle[];
  time: number;
  targetTemperature: number;
  targetMode: HardSphereThermostatTargetMode;
  collectedSpeeds: number[];
  collectedEnergies: number[];
  collectedSampleWindowTotal: number;
  tempHistory: { time: number; error: number; totalEnergy: number }[];
  lastSampleTime: number;
  pressureWindowStartTime: number;
  pressureWindowMomentum: number;
  pressureHistory: PressureWindowPoint[];
  latestMeasuredPressure: number;
}

const cloneParams = (params: SimulationParams): SimulationParams => ({ ...params });

const cloneParticles = (particles: Particle[]): Particle[] => (
  particles.map((particle) => ({ ...particle }))
);

const clonePressureHistory = (history: PressureWindowPoint[]): PressureWindowPoint[] => (
  history.map((point) => ({ ...point }))
);

export class PhysicsEngine {
  params: SimulationParams;
  particles: Particle[] = [];
  time: number = 0;
  targetTemperature: number = 0;
  targetMode: HardSphereThermostatTargetMode = 'canonical-default';
  
  // Accumulated data for final statistics
  // Optimization: Limit size to prevent memory leaks over long runs
  private readonly MAX_SAMPLES = HARD_SPHERE_MAX_COLLECTED_SAMPLES;
  private readonly MAX_HISTORY = HARD_SPHERE_MAX_TEMPERATURE_HISTORY;
  private readonly MAX_PRESSURE_HISTORY = HARD_SPHERE_MAX_PRESSURE_HISTORY;
  private readonly PRESSURE_SAMPLE_WINDOW = HARD_SPHERE_PRESSURE_SAMPLE_WINDOW_S;

  collectedSpeeds: number[] = [];
  collectedEnergies: number[] = [];
  collectedSampleWindowTotal: number = 0;
  tempHistory: { time: number; error: number; totalEnergy: number }[] = [];

  // Fixed Bins for Stable Charts
  private speedBins: HistogramBin[] = [];
  private energyBins: HistogramBin[] = [];
  private lastSampleTime: number = -1;
  private pressureWindowStartTime: number = 0;
  private pressureWindowMomentum: number = 0;
  private pressureHistory: PressureWindowPoint[] = [];
  private latestMeasuredPressure: number = 0;

  constructor(params: SimulationParams) {
    const validation = validateHardSphereSimulationParams(params);
    if (!validation.valid) {
      throw new RangeError(`Invalid hard-sphere simulation parameters: ${validation.errors.join(' ')}`);
    }
    this.params = cloneParams(params);
    this.initSystem();
  }

  private initSystem() {
    this.particles = [];
    this.time = 0;
    this.collectedSpeeds = [];
    this.collectedEnergies = [];
    this.collectedSampleWindowTotal = 0;
    this.tempHistory = [];
    this.lastSampleTime = -1;
    this.pressureWindowStartTime = 0;
    this.pressureWindowMomentum = 0;
    this.pressureHistory = [];
    this.latestMeasuredPressure = 0;

    // Safety: Prevent infinite loop if N is too high for Box L
    // Packing fraction check approx (Volume of spheres / Volume of box)
    const volParticles = this.params.N * (4/3) * Math.PI * Math.pow(this.params.r, 3);
    const volBox = Math.pow(this.params.L, 3);
    if (volParticles > volBox * 0.5) {
        console.warn("Density too high, reducing N or resetting layout strategy");
        // Fallback or warning could go here, but we will try best effort placement
    }

    // Initialize positions (Grid to avoid overlap, then jitter)
    const perSide = Math.ceil(Math.pow(this.params.N, 1/3));
    const spacing = this.params.L / perSide;
    const jitterLimit = Math.max(0, Math.min(
      spacing * 0.2,
      (spacing - 2 * this.params.r) * 0.49,
      spacing / 2 - this.params.r,
    ));
    
    let count = 0;

    // Grid placement strategy
    for (let i = 0; i < perSide && count < this.params.N; i++) {
      for (let j = 0; j < perSide && count < this.params.N; j++) {
        for (let k = 0; k < perSide && count < this.params.N; k++) {
          
          const x = (i * spacing) + spacing/2 + (Math.random() * 2 - 1) * jitterLimit;
          const y = (j * spacing) + spacing/2 + (Math.random() * 2 - 1) * jitterLimit;
          const z = (k * spacing) + spacing/2 + (Math.random() * 2 - 1) * jitterLimit;
          
          const vx = this.gaussianRandom();
          const vy = this.gaussianRandom();
          const vz = this.gaussianRandom();
          const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);
          
          this.particles.push({
            x: Math.max(this.params.r, Math.min(this.params.L - this.params.r, x)),
            y: Math.max(this.params.r, Math.min(this.params.L - this.params.r, y)),
            z: Math.max(this.params.r, Math.min(this.params.L - this.params.r, z)),
            vx, vy, vz,
            speed,
            energy: 0.5 * this.params.m * speed * speed
          });
          count++;
        }
      }
    }

    // Keep the thermostat target canonical and reproducible. Deriving it from
    // a finite random sample made otherwise identical standard files persist
    // different numerical contracts, and Gaussian tails could leave the
    // supported snapshot range.
    const explicitTargetTemperature =
      typeof this.params.targetTemperature === 'number' && Number.isFinite(this.params.targetTemperature)
        ? this.params.targetTemperature
        : null;

    this.targetTemperature =
      explicitTargetTemperature && explicitTargetTemperature > 0
        ? explicitTargetTemperature
        : this.params.m / this.params.k;
    this.targetMode = explicitTargetTemperature && explicitTargetTemperature > 0
      ? 'explicit'
      : 'canonical-default';

    // Initialize Fixed Bins (Locks the Chart Axes)
    this.initBins();
  }

  private initBins() {
      const T = this.targetTemperature > 0 ? this.targetTemperature : 1; // Safety
      const m = this.params.m;
      const k = this.params.k;

      // Define Speed Range based on T (approx 3.5 * v_rms covers >99%)
      const v_rms = Math.sqrt(3 * k * T / m);
      const maxSpeed = v_rms * 3.5;
      const speedBinsCount = 30;
      const speedBinSize = maxSpeed / speedBinsCount;

      this.speedBins = [];
      for(let i=0; i<speedBinsCount; i++) {
          const binStart = i * speedBinSize;
          const binEnd = (i+1) * speedBinSize;
          const v = (binStart + binEnd) / 2;
          // Pre-calculate theoretical probability for this bin (Stable Theoretical Curve)
          const coeff = 4 * Math.PI * Math.pow(m / (2 * Math.PI * k * T), 1.5);
          const theoretical = coeff * v * v * Math.exp((-m * v * v) / (2 * k * T));

          this.speedBins.push({ 
              binStart, binEnd, count: 0, probability: 0, theoretical 
          });
      }

      // Define Energy Range
      const maxEnergy = 0.5 * m * maxSpeed * maxSpeed;
      const energyBinsCount = 30;
      const energyBinSize = maxEnergy / energyBinsCount;

      this.energyBins = [];
      for(let i=0; i<energyBinsCount; i++) {
          const binStart = i * energyBinSize;
          const binEnd = (i+1) * energyBinSize;
          const E = (binStart + binEnd) / 2;
          
          const coeffE = 2 * Math.pow(1 / (k*T), 1.5) / Math.sqrt(Math.PI);
          let theoretical = 0;
          if (E > 0) {
              theoretical = coeffE * Math.sqrt(E) * Math.exp(-E / (k*T));
          }

          this.energyBins.push({ 
              binStart, binEnd, count: 0, probability: 0, theoretical 
          });
      }
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); 
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
  }

  private getCurrentTemperature(): number {
    const totalEnergy = this.particles.reduce((sum, p) => sum + p.energy, 0);
    return this.params.N > 0 ? (2 * totalEnergy) / (3 * this.params.N * this.params.k) : 0;
  }

  private getIdealPressureFromTemperature(temperature: number): number {
    const volume = Math.pow(this.params.L, 3);
    if (volume <= 0) return 0;
    return (this.params.N * this.params.k * temperature) / volume;
  }

  private finalizePressureWindow(windowEndTime: number) {
    const duration = windowEndTime - this.pressureWindowStartTime;
    if (duration <= PRESSURE_EPSILON) return;

    const wallArea = 6 * this.params.L * this.params.L;
    const measuredPressure = wallArea > 0 ? this.pressureWindowMomentum / (wallArea * duration) : 0;
    const idealPressure = this.getIdealPressureFromTemperature(this.getCurrentTemperature());
    const statsEnd = this.params.equilibriumTime + this.params.statsDuration;

    this.latestMeasuredPressure = measuredPressure;
    this.pressureHistory.push({
      time: windowEndTime,
      duration,
      measuredPressure,
      idealPressure,
      isCollectionWindow:
        this.pressureWindowStartTime >= this.params.equilibriumTime - PRESSURE_EPSILON &&
        windowEndTime <= statsEnd + PRESSURE_EPSILON,
    });

    if (this.pressureHistory.length > this.MAX_PRESSURE_HISTORY) {
      this.pressureHistory.shift();
    }
  }

  private commitPressureStep(startTime: number, endTime: number, wallMomentum: number) {
    const totalDuration = endTime - startTime;
    if (totalDuration <= PRESSURE_EPSILON) return;

    let cursor = startTime;
    const collectionStart = this.params.equilibriumTime;
    const collectionEnd = this.params.equilibriumTime + this.params.statsDuration;

    while (cursor < endTime - PRESSURE_EPSILON) {
      const sampleBoundary = this.pressureWindowStartTime + this.PRESSURE_SAMPLE_WINDOW;
      let nextBoundary = Math.min(endTime, sampleBoundary);

      if (collectionStart > cursor + PRESSURE_EPSILON && collectionStart < nextBoundary - PRESSURE_EPSILON) {
        nextBoundary = collectionStart;
      }
      if (collectionEnd > cursor + PRESSURE_EPSILON && collectionEnd < nextBoundary - PRESSURE_EPSILON) {
        nextBoundary = collectionEnd;
      }

      const segmentDuration = nextBoundary - cursor;
      this.pressureWindowMomentum += wallMomentum * (segmentDuration / totalDuration);
      cursor = nextBoundary;

      const hitSampleBoundary = Math.abs(nextBoundary - sampleBoundary) <= PRESSURE_EPSILON;
      const hitCollectionStart = Math.abs(nextBoundary - collectionStart) <= PRESSURE_EPSILON;
      const hitCollectionEnd = Math.abs(nextBoundary - collectionEnd) <= PRESSURE_EPSILON;

      if (hitSampleBoundary || hitCollectionStart || hitCollectionEnd) {
        this.finalizePressureWindow(nextBoundary);
        this.pressureWindowStartTime = nextBoundary;
        this.pressureWindowMomentum = 0;
      }
    }
  }

  public flushPressureMeasurement() {
    if (this.time - this.pressureWindowStartTime <= PRESSURE_EPSILON) return;
    this.finalizePressureWindow(this.time);
    this.pressureWindowStartTime = this.time;
    this.pressureWindowMomentum = 0;
  }

  public getPressureMeasurementSummary(): PressureMeasurementSummary {
    const collectionHistory = this.pressureHistory.filter((point) => point.isCollectionWindow);
    const totalDuration = collectionHistory.reduce((sum, point) => sum + point.duration, 0);

    if (totalDuration <= PRESSURE_EPSILON) {
      return {
        latestPressure: this.latestMeasuredPressure,
        meanPressure: null,
        meanIdealPressure: null,
        meanTemperature: null,
        relativeGap: null,
        sampleCount: 0,
        history: [...this.pressureHistory],
      };
    }

    const meanPressure = collectionHistory.reduce(
      (sum, point) => sum + point.measuredPressure * point.duration,
      0,
    ) / totalDuration;
    const meanIdealPressure = collectionHistory.reduce(
      (sum, point) => sum + point.idealPressure * point.duration,
      0,
    ) / totalDuration;
    const meanTemperature =
      this.params.N > 0 && this.params.k > 0
        ? (meanIdealPressure * Math.pow(this.params.L, 3)) / (this.params.N * this.params.k)
        : null;
    const relativeGap =
      meanIdealPressure > PRESSURE_EPSILON
        ? ((meanPressure - meanIdealPressure) / meanIdealPressure) * 100
        : null;

    return {
      latestPressure: this.latestMeasuredPressure,
      meanPressure,
      meanIdealPressure,
      meanTemperature,
      relativeGap,
      sampleCount: collectionHistory.length,
      history: [...this.pressureHistory],
    };
  }

  public step() {
    const { dt, L, r, nu, m, k } = this.params;
    const pColl = nu * dt; 
    const thermalSigma = Math.sqrt(k * this.targetTemperature / m);
    const stepStartTime = this.time;
    let wallMomentumTransfer = 0;
    
    // Pre-calculate squares for efficiency
    const minDist = 2 * r;

    // 1. Move and Wall Collisions
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;

      // Simple wall reflection
      if (p.x < r) {
        wallMomentumTransfer += 2 * m * Math.abs(p.vx);
        p.x = r;
        p.vx *= -1;
      }
      else if (p.x > L - r) {
        wallMomentumTransfer += 2 * m * Math.abs(p.vx);
        p.x = L - r;
        p.vx *= -1;
      }
      
      if (p.y < r) {
        wallMomentumTransfer += 2 * m * Math.abs(p.vy);
        p.y = r;
        p.vy *= -1;
      }
      else if (p.y > L - r) {
        wallMomentumTransfer += 2 * m * Math.abs(p.vy);
        p.y = L - r;
        p.vy *= -1;
      }
      
      if (p.z < r) {
        wallMomentumTransfer += 2 * m * Math.abs(p.vz);
        p.z = r;
        p.vz *= -1;
      }
      else if (p.z > L - r) {
        wallMomentumTransfer += 2 * m * Math.abs(p.vz);
        p.z = L - r;
        p.vz *= -1;
      }

      // Andersen Thermostat (Randomizes velocity)
      if (Math.random() < pColl) {
        p.vx = this.gaussianRandom() * thermalSigma;
        p.vy = this.gaussianRandom() * thermalSigma;
        p.vz = this.gaussianRandom() * thermalSigma;
      }
    }

    // 2. Collisions (O(N^2) - Optimized Inner Loop)
    // Note: For N=200, O(N^2) is ~20k checks, which is negligible for JS engines (sub-1ms).
    // Spatial grid optimization is only needed if N > 1000.
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        
        const dx = p1.x - p2.x;
        // Optimization: Early exit if X distance is too big (avoids expensive sq calculation)
        if (dx > minDist || dx < -minDist) continue;

        const dy = p1.y - p2.y;
        if (dy > minDist || dy < -minDist) continue;
        
        const dz = p1.z - p2.z;
        if (dz > minDist || dz < -minDist) continue;
        
        const dist = Math.hypot(dx, dy, dz);

        if (dist < minDist) {
          const dvx = p1.vx - p2.vx;
          const dvy = p1.vy - p2.vy;
          const dvz = p1.vz - p2.vz;
          let nx: number;
          let ny: number;
          let nz: number;
          if (dist === 0) {
            const relativeSpeed = Math.hypot(dvx, dvy, dvz);
            if (relativeSpeed > 0) {
              nx = -dvx / relativeSpeed;
              ny = -dvy / relativeSpeed;
              nz = -dvz / relativeSpeed;
            } else {
              const axis = (i + j) % 3;
              const direction = (i + j) % 2 === 0 ? 1 : -1;
              nx = axis === 0 ? direction : 0;
              ny = axis === 1 ? direction : 0;
              nz = axis === 2 ? direction : 0;
            }
          } else {
            nx = dx / dist;
            ny = dy / dist;
            nz = dz / dist;
          }
          
          // Impact speed
          const velAlongNormal = dvx * nx + dvy * ny + dvz * nz;

          // Do not resolve if particles are separating
          if (velAlongNormal > 0) continue;

          // Perfectly elastic collision impulse
          const impulseX = velAlongNormal * nx;
          const impulseY = velAlongNormal * ny;
          const impulseZ = velAlongNormal * nz;

          p1.vx -= impulseX; p1.vy -= impulseY; p1.vz -= impulseZ;
          p2.vx += impulseX; p2.vy += impulseY; p2.vz += impulseZ;

          // Overlap correction (Prevents sticking)
          const overlap = minDist - dist;
          if (overlap > 0) {
             // Cap correction to prevent explosions in high energy
             const corr = Math.min(overlap * 0.5, r * 0.5); 
             p1.x += corr*nx; p1.y += corr*ny; p1.z += corr*nz;
             p2.x -= corr*nx; p2.y -= corr*ny; p2.z -= corr*nz;
          }
        }
      }
    }

    // Pair separation can push a near-wall particle outside the box. Re-apply
    // the wall constraint before snapshots and account for any outward impulse.
    for (const particle of this.particles) {
      if (particle.x < r) {
        particle.x = r;
        if (particle.vx < 0) {
          wallMomentumTransfer += 2 * m * Math.abs(particle.vx);
          particle.vx *= -1;
        }
      } else if (particle.x > L - r) {
        particle.x = L - r;
        if (particle.vx > 0) {
          wallMomentumTransfer += 2 * m * Math.abs(particle.vx);
          particle.vx *= -1;
        }
      }
      if (particle.y < r) {
        particle.y = r;
        if (particle.vy < 0) {
          wallMomentumTransfer += 2 * m * Math.abs(particle.vy);
          particle.vy *= -1;
        }
      } else if (particle.y > L - r) {
        particle.y = L - r;
        if (particle.vy > 0) {
          wallMomentumTransfer += 2 * m * Math.abs(particle.vy);
          particle.vy *= -1;
        }
      }
      if (particle.z < r) {
        particle.z = r;
        if (particle.vz < 0) {
          wallMomentumTransfer += 2 * m * Math.abs(particle.vz);
          particle.vz *= -1;
        }
      } else if (particle.z > L - r) {
        particle.z = L - r;
        if (particle.vz > 0) {
          wallMomentumTransfer += 2 * m * Math.abs(particle.vz);
          particle.vz *= -1;
        }
      }
    }

    // 3. Update energy stats
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy + p.vz*p.vz);
      p.energy = 0.5 * m * p.speed * p.speed;
    }

    this.time += dt;
    this.commitPressureStep(stepStartTime, this.time, wallMomentumTransfer);
  }

  public collectSamples() {
    // Throttle: Only collect samples every 0.1s to avoid excessive data and duplicate frames
    if (this.time - this.lastSampleTime < 0.1) return;
    this.lastSampleTime = this.time;

    for (const p of this.particles) {
      this.collectedSpeeds.push(p.speed);
      this.collectedEnergies.push(p.energy);
    }
    this.collectedSampleWindowTotal += 1;
    
    // MEMORY OPTIMIZATION: Shift old data if array gets too big
    if (this.collectedSpeeds.length > this.MAX_SAMPLES) {
        // Remove oldest N items to keep size constant
        this.collectedSpeeds.splice(0, this.params.N); 
        this.collectedEnergies.splice(0, this.params.N);
    }
    
    // Calculate current stats for history
    const totalEnergy = this.particles.reduce((s, p) => s + p.energy, 0);
    const currentT = this.params.N > 0 ? (2 * totalEnergy) / (3 * this.params.N * this.params.k) : 0;
    const error = this.targetTemperature > 0 ? ((currentT - this.targetTemperature) / this.targetTemperature) * 100 : 0;
    
    this.tempHistory.push({ time: this.time, error, totalEnergy });
    
    // MEMORY OPTIMIZATION: Limit history history
    if (this.tempHistory.length > this.MAX_HISTORY) {
        this.tempHistory.shift();
    }
  }

  public getCollectedSampleCount(): number {
    return this.collectedSampleWindowTotal;
  }

  public createSnapshot(): PhysicsEngineSnapshotV2 {
    return {
      schemaVersion: PHYSICS_ENGINE_SNAPSHOT_VERSION,
      params: cloneParams(this.params),
      particles: cloneParticles(this.particles),
      time: this.time,
      targetTemperature: this.targetTemperature,
      targetMode: this.targetMode,
      collectedSpeeds: [...this.collectedSpeeds],
      collectedEnergies: [...this.collectedEnergies],
      collectedSampleWindowTotal: this.collectedSampleWindowTotal,
      tempHistory: this.tempHistory.map((point) => ({ ...point })),
      lastSampleTime: this.lastSampleTime,
      pressureWindowStartTime: this.pressureWindowStartTime,
      pressureWindowMomentum: this.pressureWindowMomentum,
      pressureHistory: clonePressureHistory(this.pressureHistory),
      latestMeasuredPressure: this.latestMeasuredPressure,
    };
  }

  public static fromSnapshot(snapshot: PhysicsEngineSnapshotV2): PhysicsEngine {
    const validation = validateHardSphereSimulationParams(snapshot.params);
    if (!validation.valid) {
      throw new RangeError(`Invalid hard-sphere snapshot parameters: ${validation.errors.join(' ')}`);
    }
    if (
      !Array.isArray(snapshot.particles) ||
      snapshot.particles.length !== snapshot.params.N ||
      !Array.isArray(snapshot.collectedSpeeds) ||
      snapshot.collectedSpeeds.length > HARD_SPHERE_MAX_COLLECTED_SAMPLES ||
      !Array.isArray(snapshot.collectedEnergies) ||
      snapshot.collectedEnergies.length > HARD_SPHERE_MAX_COLLECTED_SAMPLES ||
      !Array.isArray(snapshot.tempHistory) ||
      snapshot.tempHistory.length > HARD_SPHERE_MAX_TEMPERATURE_HISTORY ||
      !Array.isArray(snapshot.pressureHistory) ||
      snapshot.pressureHistory.length > HARD_SPHERE_MAX_PRESSURE_HISTORY
    ) {
      throw new RangeError('Hard-sphere snapshot exceeds its runtime resource bounds.');
    }
    const engine = new PhysicsEngine(cloneParams(snapshot.params));
    engine.params = cloneParams(snapshot.params);
    engine.particles = cloneParticles(snapshot.particles);
    engine.time = snapshot.time;
    engine.targetTemperature = snapshot.targetTemperature;
    engine.targetMode = snapshot.targetMode;
    engine.collectedSpeeds = [...snapshot.collectedSpeeds];
    engine.collectedEnergies = [...snapshot.collectedEnergies];
    engine.collectedSampleWindowTotal = snapshot.collectedSampleWindowTotal;
    engine.tempHistory = snapshot.tempHistory.map((point) => ({ ...point }));
    engine.lastSampleTime = snapshot.lastSampleTime;
    engine.pressureWindowStartTime = snapshot.pressureWindowStartTime;
    engine.pressureWindowMomentum = snapshot.pressureWindowMomentum;
    engine.pressureHistory = clonePressureHistory(snapshot.pressureHistory);
    engine.latestMeasuredPressure = snapshot.latestMeasuredPressure;
    engine.initBins();
    return engine;
  }

  public getStats(): SimulationStats {
    const totalEnergy = this.particles.reduce((s, p) => s + p.energy, 0);
    const temp = this.params.N > 0 ? (2 * totalEnergy) / (3 * this.params.N * this.params.k) : 0;
    const pressure = (this.params.N * this.params.k * temp) / Math.pow(this.params.L, 3);
    const speeds = this.particles.map(p => p.speed);
    
    const meanSpeed = this.params.N > 0 ? speeds.reduce((a, b) => a + b, 0) / this.params.N : 0;
    const rmsSpeed = this.params.N > 0 ? Math.sqrt(speeds.reduce((a, b) => a + b*b, 0) / this.params.N) : 0;

    let phase: SimulationStats['phase'] = 'equilibrating';
    let progress = 0;

    if (this.time < this.params.equilibriumTime) {
      phase = 'equilibrating';
      progress = this.params.equilibriumTime > 0 ? this.time / this.params.equilibriumTime : 1;
    } else if (this.time < this.params.equilibriumTime + this.params.statsDuration) {
      phase = 'collecting';
      progress = this.params.statsDuration > 0 ? (this.time - this.params.equilibriumTime) / this.params.statsDuration : 1;
    } else {
      phase = 'finished';
      progress = 1;
    }

    return {
      time: this.time,
      temperature: temp,
      pressure,
      meanSpeed,
      rmsSpeed,
      isEquilibrated: this.time >= this.params.equilibriumTime,
      phase,
      progress
    };
  }

  public getHistogramData(useAccumulated: boolean = false): ChartData {
    const sourceSpeeds = useAccumulated ? this.collectedSpeeds : this.particles.map(p => p.speed);
    const sourceEnergies = useAccumulated ? this.collectedEnergies : this.particles.map(p => p.energy);
    const sampleCount = sourceSpeeds.length;
    
    if (sampleCount === 0) return { speed: [], energy: [], energyLog: [], tempHistory: [] };

    // Reset Counts
    this.speedBins.forEach(b => { b.count = 0; b.probability = 0; });
    this.energyBins.forEach(b => { b.count = 0; b.probability = 0; });

    // --- Fill Speed Histogram ---
    if (this.speedBins.length > 0) {
        const speedBinSize = this.speedBins[0].binEnd - this.speedBins[0].binStart;
        for (const v of sourceSpeeds) {
            let idx = Math.floor(v / speedBinSize);
            if (idx >= this.speedBins.length) idx = this.speedBins.length - 1; 
            if (idx >= 0) this.speedBins[idx].count++;
        }
    }

    // --- Fill Energy Histogram ---
    if (this.energyBins.length > 0) {
        const energyBinSize = this.energyBins[0].binEnd - this.energyBins[0].binStart;
        for (const e of sourceEnergies) {
            let idx = Math.floor(e / energyBinSize);
            if (idx >= this.energyBins.length) idx = this.energyBins.length - 1;
            if (idx >= 0) this.energyBins[idx].count++;
        }
    }

    // Normalize
    const speedBinSize = this.speedBins.length > 0 ? this.speedBins[0].binEnd - this.speedBins[0].binStart : 1;
    const energyBinSize = this.energyBins.length > 0 ? this.energyBins[0].binEnd - this.energyBins[0].binStart : 1;

    this.speedBins.forEach(bin => {
        bin.probability = bin.count / (sampleCount * speedBinSize);
    });
    this.energyBins.forEach(bin => {
        bin.probability = bin.count / (sampleCount * energyBinSize);
    });

    // --- Semi-Log Energy ---
    const energyLog = this.energyBins
        .filter(bin => bin.probability > 0.001)
        .map(bin => {
            const E = (bin.binStart + bin.binEnd) / 2;
            return {
                energy: E,
                logProb: Math.log(bin.probability),
                theoreticalLog: Math.log(bin.theoretical || 0.0001)
            };
        });

    return { 
        speed: [...this.speedBins], 
        energy: [...this.energyBins], 
        energyLog, 
        tempHistory: this.tempHistory 
    };
  }
}
