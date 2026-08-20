import {
  buildModelSelectionVirtualRows,
  estimateModelPickerSectionHeaderHeight,
  isModelSectionCollapsed,
} from '../modelSelectionGrid.utils';

describe('modelSelectionGrid.utils', () => {
  const models = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  describe('isModelSectionCollapsed', () => {
    it('defaults Need more credits to collapsed', () => {
      expect(isModelSectionCollapsed('Need more credits', {})).toBe(true);
    });

    it('defaults other titled sections to expanded', () => {
      expect(isModelSectionCollapsed('Models you can use', {})).toBe(false);
      expect(isModelSectionCollapsed('Quick picks', {})).toBe(false);
    });

    it('respects explicit collapse overrides', () => {
      expect(
        isModelSectionCollapsed('Models you can use', { 'Models you can use': true }),
      ).toBe(true);
      expect(
        isModelSectionCollapsed('Need more credits', { 'Need more credits': false }),
      ).toBe(false);
    });
  });

  describe('buildModelSelectionVirtualRows', () => {
    it('omits models from collapsed sections', () => {
      const rows = buildModelSelectionVirtualRows(
        [
          { title: 'Models you can use', models: [models[0]] },
          { title: 'Need more credits', models: [models[1], models[2]] },
        ],
        [],
        {},
      );

      expect(rows).toEqual([
        {
          type: 'header',
          title: 'Models you can use',
          modelCount: 1,
          isCollapsed: false,
          isFirstSection: true,
          hasLeadingControl: false,
        },
        { type: 'model', model: models[0], isLastInSection: true },
        {
          type: 'header',
          title: 'Need more credits',
          modelCount: 2,
          isCollapsed: true,
          isFirstSection: false,
          hasLeadingControl: false,
        },
      ]);
    });

    it('tightens the first section top spacing when a leading toggle is present', () => {
      const rows = buildModelSelectionVirtualRows(
        [{ title: 'Models you can use', models: [models[0]] }],
        [],
        {},
        true,
      );

      expect(rows[0]).toMatchObject({
        type: 'header',
        isFirstSection: true,
        hasLeadingControl: true,
      });
      expect(
        estimateModelPickerSectionHeaderHeight(true, false, true),
      ).toBe(15);
    });

    it('includes models again after a section is expanded', () => {
      const rows = buildModelSelectionVirtualRows(
        [{ title: 'Quick picks', models: models }],
        [],
        { 'Quick picks': false },
      );

      expect(rows.filter((row) => row.type === 'model')).toHaveLength(3);
      expect(rows[0]).toMatchObject({
        type: 'header',
        title: 'Quick picks',
        isCollapsed: false,
      });
    });

    it('hides models when a section is collapsed manually', () => {
      const rows = buildModelSelectionVirtualRows(
        [{ title: 'Quick picks', models: models }],
        [],
        { 'Quick picks': true },
      );

      expect(rows).toEqual([
        {
          type: 'header',
          title: 'Quick picks',
          modelCount: 3,
          isCollapsed: true,
          isFirstSection: true,
          hasLeadingControl: false,
        },
      ]);
    });

    it('falls back to a flat model list when sections are absent', () => {
      const rows = buildModelSelectionVirtualRows(undefined, models, {});

      expect(rows).toEqual([
        { type: 'model', model: models[0], isLastInSection: false },
        { type: 'model', model: models[1], isLastInSection: false },
        { type: 'model', model: models[2], isLastInSection: true },
      ]);
    });
  });
});
