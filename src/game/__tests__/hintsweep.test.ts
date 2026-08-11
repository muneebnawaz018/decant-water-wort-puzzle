import { applyPour, isSolved } from '@/core/waterCore';
import { optimalMoves } from '@/core/solver';
import { createRng } from '@/core/rng';
import type { WaterState } from '@/core/types';
import { dayIndex, generateBonus } from '../dailyPuzzle';
import { suggestPour } from '../hint';
import { starsFor } from '../stars';
import { generateLevel } from '../waterGenerator';

// The hint promise, end to end: a hint is the provably shortest continuation,
// so a run played by pressing Hint on every move must land exactly on par and
// rate three stars. This walks a sampled stage from every 20-level bracket of
// the early game in all three modes — plus the deep end of the ramp and the
// brew — because a hint that is merely good would fail the par equality here,
// which is precisely the bug the old DFS-line hints shipped (~20% over par,
// silently capping fully-hinted runs below three stars).
const walkWithHints = (start: WaterState) => {
  let board = start;
  let moves = 0;
  let fallbacks = 0;

  while (!isSolved(board) && moves < 300) {
    const hint = suggestPour(board);
    if (hint.kind !== 'move') return { moves, fallbacks, stuck: hint.kind };
    if (!hint.optimal) fallbacks++;
    // A hint must always be a legal pour — an illegal one is its own failure.
    const applied = applyPour(board, hint.move.from, hint.move.to);
    if (applied === null) return { moves, fallbacks, stuck: 'illegal' };
    board = applied.state;
    moves++;
  }
  return { moves, fallbacks, stuck: null };
};

it('solves a random stage from every 20-level bracket by hints alone', () => {
  const rng = createRng(0xdecaf);
  const failures: string[] = [];
  let played = 0;

  for (const mode of ['gentle', 'classic', 'fiendish'] as const) {
    for (let bracket = 0; bracket < 20; bracket++) {
      const level = bracket * 20 + 1 + rng.int(20);
      const { state, report } = generateLevel(level, mode);
      const par = optimalMoves(state);
      const run = walkWithHints(state);
      const stars = starsFor(run.moves, par ?? report.lowerBound);
      played++;

      const ok =
        report.accepted &&
        run.stuck === null &&
        par !== null &&
        run.moves === par &&
        stars === 3;
      if (!ok) {
        failures.push(
          `${mode} ${level}: accepted=${report.accepted} par=${par} hinted=${run.moves} ` +
            `stars=${stars} stuck=${run.stuck} fallbacks=${run.fallbacks}`
        );
      }
    }
  }

  // Deep spot checks past the old plateau, and today's brew for a new player.
  for (const level of [5_001, 123_457, 1_000_001]) {
    const { state } = generateLevel(level, 'fiendish');
    const par = optimalMoves(state);
    const run = walkWithHints(state);
    played++;
    if (run.stuck !== null || par === null || run.moves !== par) {
      failures.push(`fiendish ${level}: par=${par} hinted=${run.moves} stuck=${run.stuck}`);
    }
  }
  const brew = generateBonus(dayIndex(Date.now()), 1);
  const brewPar = optimalMoves(brew.state);
  const brewRun = walkWithHints(brew.state);
  played++;
  if (brewRun.stuck !== null || brewPar === null || brewRun.moves !== brewPar) {
    failures.push(`brew: par=${brewPar} hinted=${brewRun.moves} stuck=${brewRun.stuck}`);
  }

  // eslint-disable-next-line no-console
  console.log(`played ${played} boards, failures: ${failures.length}`);
  expect(failures).toEqual([]);
}, 600_000);
