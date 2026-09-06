

export interface WorkbenchHeatCapacityPreheatLockProps {
  activeHeatCapacityPreheatLocked: boolean;
}

export const WorkbenchHeatCapacityPreheatLock = ({
  activeHeatCapacityPreheatLocked,
}: WorkbenchHeatCapacityPreheatLockProps) => {
  return <div
                  className="studio-heat-preheat-lock-layer"
                  data-heat-capacity-modal-lock="true"
                  data-heat-capacity-preheat-lock={activeHeatCapacityPreheatLocked ? 'true' : undefined}
                />;
};
