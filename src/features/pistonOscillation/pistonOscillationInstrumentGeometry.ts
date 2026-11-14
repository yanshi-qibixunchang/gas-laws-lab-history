import { Box3, Object3D, Vector3 } from 'three';
import {
  PISTON_EQUILIBRIUM_HEIGHT_MAX_MM,
  PISTON_SCALE_CALIBRATION_HEIGHT_MM,
} from './pistonOscillationModelMotion.ts';

const lockingScrewName = 'PistonLockingScrew_STATIC';

export const getRequiredPistonOscillationObject = (root: Object3D, nodeName: string) => {
  const object = root.getObjectByName(nodeName);
  if (!object) throw new Error(`Piston-oscillation model is missing node: ${nodeName}`);
  return object;
};

export const movePistonOscillationObjectWorldY = (object: Object3D, targetWorldY: number) => {
  const parent = object.parent;
  if (!parent) return;
  const worldPosition = object.getWorldPosition(new Vector3());
  object.position.copy(parent.worldToLocal(worldPosition.setY(targetWorldY)));
  object.updateWorldMatrix(true, true);
};

const translateWorldY = (object: Object3D, offset: number) => {
  movePistonOscillationObjectWorldY(object, object.getWorldPosition(new Vector3()).y + offset);
};

const scaleWorldYFromBase = (object: Object3D, baseY: number, heightRatio: number) => {
  const worldY = object.getWorldPosition(new Vector3()).y;
  object.scale.y *= heightRatio;
  movePistonOscillationObjectWorldY(object, baseY + (worldY - baseY) * heightRatio);
};

export const alignPistonOscillationCylinderAndFrame = (root: Object3D) => {
  const required = (name: string) => getRequiredPistonOscillationObject(root, name);
  root.updateWorldMatrix(true, true);
  const piston = required('Piston_Graphite');
  const cylinder = required('Cylinder_Pyrex');
  const upperRing = required('Cylinder_UpperGuideRing');
  const topSlab = required('ProtectiveFrame_TopSlab');
  const bottomSlab = required('ProtectiveFrame_BottomSlab');
  const screw = required(lockingScrewName);
  const pistonTopAtLimit = new Box3().setFromObject(piston).max.y
    + (PISTON_EQUILIBRIUM_HEIGHT_MAX_MM - PISTON_SCALE_CALIBRATION_HEIGHT_MM) / 1_000;

  const cylinderBounds = new Box3().setFromObject(cylinder);
  scaleWorldYFromBase(
    cylinder,
    cylinderBounds.min.y,
    (pistonTopAtLimit - cylinderBounds.min.y) / (cylinderBounds.max.y - cylinderBounds.min.y),
  );
  const ringBounds = new Box3().setFromObject(upperRing);
  const ringOffset = pistonTopAtLimit - ringBounds.min.y;
  translateWorldY(upperRing, ringOffset);

  // Seat the top plate on the guide ring and keep the lower mounting plane fixed.
  const frameBaseY = new Box3().setFromObject(bottomSlab).min.y;
  const originalTopY = new Box3().setFromObject(topSlab).min.y;
  const topOffsetY = ringBounds.max.y + ringOffset - originalTopY;
  const frameHeightRatio = (originalTopY + topOffsetY - frameBaseY) / (originalTopY - frameBaseY);
  for (const name of [
    'ProtectiveFrame_BackPanel',
    'ProtectiveFrame_FrontPanel',
    'ProtectiveFrame_LeftPanel',
    'ProtectiveFrame_RightPanel',
    'ProtectiveFrame_BackSolidInsert',
  ]) {
    scaleWorldYFromBase(required(name), frameBaseY, frameHeightRatio);
  }
  translateWorldY(topSlab, topOffsetY);
  translateWorldY(required('ProtectiveFrame_TopBack'), topOffsetY);
  translateWorldY(screw, topOffsetY);
  screw.userData.frameTopOffsetY = topOffsetY;
};

export const getPistonOscillationFrameTopOffsetY = (scene: Object3D): number | undefined => {
  const offset = scene.getObjectByName(lockingScrewName)?.userData.frameTopOffsetY;
  return typeof offset === 'number' ? offset : undefined;
};
