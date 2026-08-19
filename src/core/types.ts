export type Color = number; // index into theme.pieces

export interface LevelParams {
  capacity: number;
  colorCount: number;
  extraTubes: number;
  scrambleSteps: number;
}

export interface WaterState {
  tubes: Color[][]; // index 0 = bottom
  capacity: number;
  colorCount: number;
  extraTubes: number;
}

export interface PourMove {
  from: number;
  to: number;
  count: number; // segments actually moved
}
