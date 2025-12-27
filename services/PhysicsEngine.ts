import { SimulationParams, Particle, HistogramBin, ChartData, SimulationStats } from '../types';

export class PhysicsEngine {
  params: SimulationParams;
  particles: Particle[] = [];
  time: number = 0;
  targetTemperature: number = 0;
  
  // Accumulated data for final statistics
  // Optimization: Limit size to prevent memory leaks over long runs
  private readonly MAX_SAMPLES = 2000; 
  private readonly MAX_HISTORY = 300; 

  collectedSpeeds: number[] = [];
  collectedEnergies: number[] = [];
  tempHistory: { time: number; error: number; totalEnergy: number }[] = [];

  // Fixed Bins for Stable Charts
  private speedBins: HistogramBin[] = [];
  private energyBins: HistogramBin[] = [];
  private lastSampleTime: number = -1;

  constructor(params: SimulationParams) {
    this.params = params;
    this.initSystem();
  }

  private initSystem() {
    this.particles = [];
    this.time = 0;
    this.collectedSpeeds = [];
    this.collectedEnergies = [];
    this.tempHistory = [];
    this.lastSampleTime = -1;

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
    
    let count = 0;
    let attempts = 0;
    const maxAttempts = this.params.N * 100; // Prevent infinite loop

    // Grid placement strategy
    for (let i = 0; i < perSide && count < this.params.N; i++) {
      for (let j = 0; j < perSide && count < this.params.N; j++) {
        for (let k = 0; k < perSide && count < this.params.N; k++) {
          
          const jitter = (Math.random() - 0.5) * (spacing * 0.4); // Reduced jitter to 0.4 to stay safe
          const x = (i * spacing) + spacing/2 + jitter;
          const y = (j * spacing) + spacing/2 + jitter;
          const z = (k * spacing) + spacing/2 + jitter;
          
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

    // Calculate initial Target Temperature
    const totalEnergy = this.particles.reduce((sum, p) => sum + p.energy, 0);
    // Avoid divide by zero if N=0
    this.targetTemperature = this.params.N > 0 ? (2 * totalEnergy) / (3 * this.params.N * this.params.k) : 300;

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

  public step() {
    const { dt, L, r, nu, m, k } = this.params;
    const pColl = nu * dt; 
    const thermalSigma = Math.sqrt(k * this.targetTemperature / m);
    
    // Pre-calculate squares for efficiency
    const minDist = 2 * r;
    const minDistSq = minDist * minDist;

    // 1. Move and Wall Collisions
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;

      // Simple wall reflection
      if (p.x < r) { p.x = r; p.vx *= -1; }
      else if (p.x > L - r) { p.x = L - r; p.vx *= -1; }
      
      if (p.y < r) { p.y = r; p.vy *= -1; }
      else if (p.y > L - r) { p.y = L - r; p.vy *= -1; }
      
      if (p.z < r) { p.z = r; p.vz *= -1; }
      else if (p.z > L - r) { p.z = L - r; p.vz *= -1; }

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
        
        const distSq = dx*dx + dy*dy + dz*dz;

        if (distSq < minDistSq) {
          const dist = Math.sqrt(distSq);
          // Normalize normal vector
          const nx = dx / dist; const ny = dy / dist; const nz = dz / dist;
          
          // Relative velocity
          const dvx = p1.vx - p2.vx; const dvy = p1.vy - p2.vy; const dvz = p1.vz - p2.vz;
          
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

    // 3. Update energy stats
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy + p.vz*p.vz);
      p.energy = 0.5 * m * p.speed * p.speed;
    }

    this.time += dt;
  }

  public collectSamples() {
    // Throttle: Only collect samples every 0.1s to avoid excessive data and duplicate frames
    if (this.time - this.lastSampleTime < 0.1) return;
    this.lastSampleTime = this.time;

    for (const p of this.particles) {
      this.collectedSpeeds.push(p.speed);
      this.collectedEnergies.push(p.energy);
    }
    
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