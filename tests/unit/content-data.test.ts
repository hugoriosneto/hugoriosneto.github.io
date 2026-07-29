import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'yaml';

const load = (name: string): any[] =>
  parse(readFileSync(new URL(`../../src/content/${name}.yaml`, import.meta.url), 'utf8'));

const roles = load('roles'), papers = load('papers'), talks = load('talks'), fame = load('fame');
const unique = (xs: unknown[]) => new Set(xs).size === xs.length;

describe('invariants a per-entry schema cannot express', () => {
  it.each([['roles', roles], ['papers', papers], ['talks', talks], ['fame', fame]] as const)(
    '%s is non-empty with unique ids', (_name, rows) => {
      // A duplicate id is only a [WARN] at exit 0 — the later entry silently
      // overwrites the earlier one and the collection quietly shrinks.
      expect(rows.length).toBeGreaterThan(0);
      expect(unique(rows.map((r: any) => r.id))).toBe(true);
    });

  it('role order values are unique and contiguous from 1', () => {
    const orders = roles.map((r) => r.order).sort((a, b) => a - b);
    expect(orders).toEqual(orders.map((_, i) => i + 1));
  });

  it('role position increases with order — otherwise the trajectory bar runs backwards', () => {
    const byOrder = [...roles].sort((a, b) => a.order - b.order);
    for (let i = 1; i < byOrder.length; i++) {
      expect(byOrder[i].position, `${byOrder[i].id} must sit right of ${byOrder[i - 1].id}`)
        .toBeGreaterThan(byOrder[i - 1].position);
    }
  });

  it('FAME editions are contiguous from 1', () => {
    const eds = fame.map((e) => e.edition).sort((a, b) => a - b);
    expect(eds).toEqual(eds.map((_, i) => i + 1));
  });

  it('at most one upcoming edition, and it has not already happened', () => {
    // NOT toHaveLength(1): after 28 Sep 2026, flipping '26 to past is the correct
    // action and would have failed a hard equality — punishing correct maintenance
    // and leaving "leave the stale badge up" as the only green state.
    const upcoming = fame.filter((e) => e.status === 'upcoming');
    expect(upcoming.length).toBeLessThanOrEqual(1);
    for (const e of upcoming) {
      expect(new Date(e.date).getTime(), `${e.id} is still marked upcoming but its date has passed`)
        .toBeGreaterThan(Date.now());
    }
  });

  it('every role position still decodes to roughly the right date as "now" advances', () => {
    // The rail's right edge is "now", so fixed positions rot at about a month of
    // error per month elapsed. This goes red on its own schedule rather than quietly.
    const AXIS_START = new Date('2021-01-01').getTime();
    const span = Date.now() - AXIS_START;
    const monthsOff = (r: any) => {
      const implied = AXIS_START + (r.position / 100) * span;
      const [mm, yyyy] = String(r.dates).slice(0, 7).split('/');
      const actual = new Date(Number(yyyy), Number(mm) - 1, 1).getTime();
      return Math.abs(implied - actual) / (1000 * 60 * 60 * 24 * 30.44);
    };
    for (const r of roles.filter((x) => /^\d{2}\/\d{4}/.test(x.dates))) {
      expect(monthsOff(r), `${r.id}'s dot has drifted from its actual start date`).toBeLessThan(9);
    }
  });

  it('every paper pdf resolves to a real file', () => {
    for (const p of papers.filter((x) => x.pdf)) {
      expect(existsSync(new URL(`../../public${p.pdf}`, import.meta.url)),
        `${p.pdf} is missing from public/`).toBe(true);
    }
  });

  it('every paper has a matching preview image', () => {
    for (const p of papers) {
      expect(existsSync(new URL(`../../src/assets/papers/${p.id}.png`, import.meta.url)),
        `no preview for ${p.id} — Task 13 looks it up by id and fails silently`).toBe(true);
    }
  });

  it('talk order values are unique and exactly one talk carries an award', () => {
    expect(unique(talks.map((t) => t.order))).toBe(true);
    expect(talks.filter((t) => t.award)).toHaveLength(1);
  });
});
