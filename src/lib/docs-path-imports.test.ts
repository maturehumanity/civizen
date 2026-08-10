import { describe, expect, it } from 'vitest';

import { CONSTITUTION_STUDY_SECTIONS } from '@/lib/constitution-study';
import { INSTITUTIONAL_DOCS } from '@/lib/institutional-docs';
import { getStudyMaterialContentByKey } from '@/lib/study-material-content';

describe('documentation path imports', () => {
  it('loads institutional policy markdown from docs/02-policies and docs/00-foundation', () => {
    expect(INSTITUTIONAL_DOCS.length).toBeGreaterThan(10);
    for (const doc of INSTITUTIONAL_DOCS) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.markdown.length).toBeGreaterThan(40);
    }
  });

  it('loads universal constitution study sections from docs/05-research', () => {
    expect(CONSTITUTION_STUDY_SECTIONS.length).toBeGreaterThan(10);
    for (const section of CONSTITUTION_STUDY_SECTIONS) {
      expect(section.markdown.length).toBeGreaterThan(20);
    }
  });

  it('loads study material baselines from docs/02-policies and docs/01-governance', () => {
    const luma = getStudyMaterialContentByKey('economy-policy-baseline');
    const tokenomics = getStudyMaterialContentByKey('economy-constitutional-tokenomics-governance');
    expect(luma?.markdown.length).toBeGreaterThan(20);
    expect(tokenomics?.markdown.length).toBeGreaterThan(20);
  });
});
