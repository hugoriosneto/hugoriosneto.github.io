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

  it('FAME editions are contiguous from 1 with exactly one upcoming', () => {
    // Task 14 indexes a hardcoded 5-element ordinals array; edition 6 would
    // render "undefined edition".
    const eds = fame.map((e) => e.edition).sort((a, b) => a - b);
    expect(eds).toEqual(eds.map((_, i) => i + 1));
    expect(fame.filter((e) => e.status === 'upcoming')).toHaveLength(1);
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
