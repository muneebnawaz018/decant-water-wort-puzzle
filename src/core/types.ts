export type Colour = number; // index into theme.pieces

export interface LevelParams {
  capacity: number;
  colourCount: number;
  extraTubes: number;
  scrambleSteps: number;
}

export interface WaterState {
  tubes: Colour[][]; // index 0 = bottom
  capacity: number;
  colourCount: number;
  extraTubes: number;
}

export interface PourMove {
  from: number;
  to: number;
  count: number; // segments actually moved
}
