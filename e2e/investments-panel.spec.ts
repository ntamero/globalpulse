import { expect, test } from '@playwright/test';

test.describe('GCC investments coverage', () => {
  test('focusInvestmentOnMap enables layer and recenters map', async ({ page }) => {
    await page.goto('/tests/runtime-harness.html');

    const result = await page.evaluate(async () => {
      const { focusInvestmentOnMap } = await import('/src/services/investments-focus.ts');

      const calls: { layers: string[]; center: { lat: number; lon: number; zoom: number } | null } = {
        layers: [],
        center: null,
      };

      const map = {
        enableLayer: (layer: string) => {
          calls.layers.push(layer);
        },
        setCenter: (lat: number, lon: number, zoom: number) => {
          calls.center = { lat, lon, zoom };
        },
      };

      const mapLayers = { gulfInvestments: false };

      focusInvestmentOnMap(
        map as unknown as {
          enableLayer: (layer: 'gulfInvestments') => void;
          setCenter: (lat: number, lon: number, zoom: number) => void;
        },
        mapLayers as unknown as { gulfInvestments: boolean } & Record<string, boolean>,
        24.4667,
        54.3667
      );

      return {
        layers: calls.layers,
        center: calls.center,
        gulfInvestmentsEnabled: mapLayers.gulfInvestments,
      };
    });

    expect(result.layers).toEqual(['gulfInvestments']);
    expect(result.center).toEqual({ lat: 24.4667, lon: 54.3667, zoom: 6 });
    expect(result.gulfInvestmentsEnabled).toBe(true);
  });

  test('InvestmentsPanel supports search/filter/sort and row click callbacks', async ({ page }) => {
    await page.goto('/tests/runtime-harness.html');

    const result = await page.evaluate(async () => {
      const { InvestmentsPanel } = await import('/src/components/InvestmentsPanel.ts');
      const { GULF_INVESTMENTS } = await import('/src/config/gulf-fdi.ts');

      const clickedIds: string[] = [];
      const panel = new InvestmentsPanel((inv) => {
        clickedIds.push(inv.id);
      });
      document.body.appendChild(panel.getElement());

      const root = panel.getElement();
      const totalRows = root.querySelectorAll('.fdi-row').length;

      const firstInvestment = GULF_INVESTMENTS[0];
      const searchToken = firstInvestment?.assetName.split(/\s+/)[0]?.toLowerCase() ?? '';

      const searchInput = root.querySelector<HTMLInputElement>('.fdi-search');
      searchInput!.value = searchToken;
      searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
      const searchRows = root.querySelectorAll('.fdi-row').length;

      searchInput!.value = '';
      searchInput!.dispatchEvent(new Event('input', { bubbles: true }));

      const countrySelect = root.querySelector<HTMLSelectElement>(
        '.fdi-filter[data-filter="investingCountry"]'
      );
      countrySelect!.value = 'SA';
      countrySelect!.dispatchEvent(new Event('change', { bubbles: true }));

      const saRows = root.querySelectorAll('.fdi-row').length;
      const expectedSaRows = GULF_INVESTMENTS.filter((inv) => inv.investingCountry === 'SA').length;

      const investmentSort = root.querySelector<HTMLElement>('.fdi-sort[data-sort="investmentUSD"]');
      investmentSort!.click(); // asc
      investmentSort!.click(); // desc

      const firstRow = root.querySelector<HTMLElement>('.fdi-row');
      const firstRowId = firstRow?.dataset.id ?? null;
      const expectedTopSaId = GULF_INVESTMENTS
        .filter((inv) => inv.investingCountry === 'SA')
        .slice()
        .sort((a, b) => (b.investmentUSD ?? -1) - (a.investmentUSD ?? -1))[0]?.id ?? null;

      firstRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      panel.destroy();
      root.remove();

      return {
        totalRows,
        datasetSize: GULF_INVESTMENTS.length,
        searchRows,
        saRows,
        expectedSaRows,
        firstRowId,
        expectedTopSaId,
        clickedId: clickedIds[0] ?? null,
      };
    });

    expect(result.totalRows).toBe(result.datasetSize);
    expect(result.searchRows).toBeGreaterThan(0);
    expect(result.searchRows).toBeLessThanOrEqual(result.totalRows);
    expect(result.saRows).toBe(result.expectedSaRows);
    expect(result.firstRowId).toBe(result.expectedTopSaId);
    expect(result.clickedId).toBe(result.firstRowId);
  });
});
