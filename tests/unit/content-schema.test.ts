import { describe, it, expect } from 'vitest';
import { roleSchema, paperSchema, talkSchema, fameSchema } from '../../src/lib/schemas';

describe('roleSchema', () => {
  const valid = {
    org: 'RSC Anderlecht', title: 'Data Recruitment Lead',
    dates: '01/2026 – now', verb: 'Leads', order: 5, position: 93,
    blurb: 'Recruitment analytics.', capabilities: ['Recruitment decision-making'],
  };

  it('accepts a valid role', () => {
    expect(() => roleSchema.parse(valid)).not.toThrow();
  });

  it('rejects a role with no capabilities', () => {
    expect(() => roleSchema.parse({ ...valid, capabilities: [] })).toThrow();
  });

  it('rejects a position outside 0-100', () => {
    expect(() => roleSchema.parse({ ...valid, position: 140 })).toThrow();
  });

  it('rejects a role that mentions headcount or reporting', () => {
    expect(() => roleSchema.parse({ ...valid, blurb: 'A team of one.' })).toThrow();
    expect(() => roleSchema.parse({ ...valid, blurb: 'Reports to the director of scouting.' })).toThrow();
  });

  it('rejects the same phrases in a capability chip, not just the blurb', () => {
    // The chips are the other surface where role copy reaches the page, and the
    // trajectory e2e only reads the detail panel — so nothing else covers them.
    expect(() => roleSchema.parse({ ...valid, capabilities: ['Reporting to a football director'] })).toThrow();
    expect(() => roleSchema.parse({ ...valid, capabilities: ['Owned a club function', 'A team of three'] })).toThrow();
  });

  it('rejects a position that would clip at the rail edge', () => {
    expect(() => roleSchema.parse({ ...valid, position: 0 })).toThrow();
    expect(() => roleSchema.parse({ ...valid, position: 100 })).toThrow();
  });
});

describe('paperSchema', () => {
  const valid = {
    title: 'GraphEPV', year: 2024, venue: 'MLSA @ ECML/PKDD',
    authors: ['Bruno M. Sá-Freire', 'Hugo Rios-Neto'], bibtexKey: 'safreire2024graphepv',
    bibtexType: 'inproceedings',
  };

  it('accepts a valid paper', () => {
    expect(() => paperSchema.parse(valid)).not.toThrow();
  });

  it('rejects a paper whose author list omits Hugo', () => {
    expect(() => paperSchema.parse({ ...valid, authors: ['Someone Else'] })).toThrow();
  });

  it('rejects an implausible year', () => {
    expect(() => paperSchema.parse({ ...valid, year: 1850 })).toThrow();
  });
});

describe('talkSchema', () => {
  const valid = {
    title: 'Opta Pro Forum', description: 'Algorithm Track.',
    provider: 'vimeo', embedUrl: 'https://player.vimeo.com/video/819432708',
    url: 'https://vimeo.com/819432708',
    language: 'EN', format: 'Conference', order: 1,
  };

  it('accepts a valid talk', () => {
    expect(() => talkSchema.parse(valid)).not.toThrow();
  });

  it('rejects an unknown provider', () => {
    expect(() => talkSchema.parse({ ...valid, provider: 'myspace' })).toThrow();
  });

  it('rejects a non-https embed', () => {
    expect(() => talkSchema.parse({ ...valid, embedUrl: 'http://insecure.test/x' })).toThrow();
  });

  it('rejects an embed whose host does not match its provider', () => {
    // This value goes straight into iframe.src. Task 15's "no third-party requests"
    // test only observes before the click, so it cannot see a mismatched host.
    expect(() => talkSchema.parse({ ...valid, provider: 'youtube' })).toThrow();
    expect(() => talkSchema.parse({ ...valid, embedUrl: 'https://evil.test/embed' })).toThrow();
  });
});

describe('fameSchema', () => {
  const valid = {
    edition: 1, year: 2022, date: '21 October 2022',
    venue: 'CAD3, UFMG Pampulha', status: 'past',
    detail: 'The first football analytics event held in Brazil.', sponsors: [],
  };

  it('accepts a valid edition', () => {
    expect(() => fameSchema.parse(valid)).not.toThrow();
  });

  it('allows an upcoming edition with a note instead of detail', () => {
    expect(() => fameSchema.parse({ ...valid, status: 'upcoming', detail: undefined, note: 'Programme to be announced.' })).not.toThrow();
  });

  it('requires detail on a past edition', () => {
    expect(() => fameSchema.parse({ ...valid, status: 'past', detail: undefined })).toThrow();
  });

  it('requires a note on an upcoming edition, or the panel renders blank', () => {
    expect(() => fameSchema.parse({ ...valid, status: 'upcoming', detail: undefined, note: undefined })).toThrow();
  });
});
