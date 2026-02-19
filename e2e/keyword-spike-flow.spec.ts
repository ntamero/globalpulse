import { expect, test } from '@playwright/test';

test.describe('keyword spike modal/badge flow', () => {
  test('injects synthetic headlines and renders keyword_spike end-to-end', async ({ page }) => {
    await page.goto('/tests/runtime-harness.html');

    const setup = await page.evaluate(async () => {
      const { SignalModal } = await import('/src/components/SignalModal.ts');
      const { IntelligenceGapBadge } = await import('/src/components/IntelligenceGapBadge.ts');
      const trending = await import('/src/services/trending-keywords.ts');
      const correlation = await import('/src/services/correlation.ts');

      const previousConfig = trending.getTrendingConfig();
      const headerRight = document.createElement('div');
      headerRight.className = 'header-right';
      document.body.appendChild(headerRight);

      const modal = new SignalModal();
      const badge = new IntelligenceGapBadge();
      badge.setOnSignalClick((signal) => modal.showSignal(signal));

      trending.updateTrendingConfig({
        blockedTerms: [],
        minSpikeCount: 5,
        spikeMultiplier: 3,
        autoSummarize: false,
      });

      const now = new Date();
      const headlines = [
        { source: 'Reuters', title: 'Iran sanctions pressure rises amid talks', link: 'https://example.com/reuters/1' },
        { source: 'AP', title: 'Iran sanctions debate intensifies in Washington', link: 'https://example.com/ap/1' },
        { source: 'BBC', title: 'Iran sanctions trigger fresh market concerns', link: 'https://example.com/bbc/1' },
        { source: 'Reuters', title: 'Iran sanctions package draws regional response', link: 'https://example.com/reuters/2' },
        { source: 'AP', title: 'Iran sanctions proposal gains momentum', link: 'https://example.com/ap/2' },
        { source: 'BBC', title: 'Iran sanctions timeline shortens after warnings', link: 'https://example.com/bbc/2' },
      ].map(item => ({
        ...item,
        pubDate: now,
      }));

      trending.ingestHeadlines(headlines);

      let spikes = trending.drainTrendingSignals();
      for (let i = 0; i < 20 && spikes.length === 0; i += 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
        spikes = trending.drainTrendingSignals();
      }

      if (spikes.length === 0) {
        badge.destroy();
        modal.getElement().remove();
        trending.updateTrendingConfig(previousConfig);
        return { ok: false, reason: 'No keyword spikes emitted from synthetic data' };
      }

      correlation.addToSignalHistory(spikes);
      badge.update();

      // Keep refs alive for user interactions in the test.
      (window as unknown as Record<string, unknown>).__keywordSpikeTest = {
        badge,
        modal,
        previousConfig,
      };

      return {
        ok: true,
        spikeType: spikes[0]?.type,
        title: spikes[0]?.title ?? '',
        badgeCount: (document.querySelector('.findings-count') as HTMLElement | null)?.textContent ?? '0',
      };
    });

    expect(setup.ok).toBe(true);
    expect(setup.spikeType).toBe('keyword_spike');
    expect(Number(setup.badgeCount)).toBeGreaterThan(0);

    await page.click('.intel-findings-badge');
    const finding = page.locator('.finding-item').first();
    await expect(finding).toBeVisible();
    await expect(finding).toContainText('Trending');

    await finding.click();
    await expect(page.locator('.signal-modal-overlay.active')).toBeVisible();
    await expect(page.locator('.signal-item .signal-type').first()).toContainText('Keyword Spike');
    await expect(page.locator('.suppress-keyword-btn').first()).toBeVisible();

    await page.evaluate(async () => {
      const trending = await import('/src/services/trending-keywords.ts');
      const store = (window as unknown as Record<string, unknown>).__keywordSpikeTest as
        | {
            badge?: { destroy?: () => void };
            modal?: { getElement?: () => HTMLElement };
            previousConfig?: Parameters<typeof trending.updateTrendingConfig>[0];
          }
        | undefined;

      store?.badge?.destroy?.();
      store?.modal?.getElement?.()?.remove();
      if (store?.previousConfig) {
        trending.updateTrendingConfig(store.previousConfig);
      }
      delete (window as unknown as Record<string, unknown>).__keywordSpikeTest;
    });
  });

  test('does not emit spikes from source-attribution suffixes', async ({ page }) => {
    await page.goto('/tests/runtime-harness.html');

    const result = await page.evaluate(async () => {
      const trending = await import('/src/services/trending-keywords.ts');
      const previousConfig = trending.getTrendingConfig();

      try {
        trending.updateTrendingConfig({
          blockedTerms: [],
          minSpikeCount: 4,
          spikeMultiplier: 3,
          autoSummarize: false,
        });

        const now = new Date();
        const headlines = [
          { source: 'Reuters', title: 'Qzxalpha ventures stabilize - WireDesk' },
          { source: 'AP', title: 'Bravotango liquidity trims - WireDesk' },
          { source: 'BBC', title: 'Cindelta refinery expands - WireDesk' },
          { source: 'Bloomberg', title: 'Dorion transit reroutes - WireDesk' },
          { source: 'WSJ', title: 'Epsiluna lending reprices - WireDesk' },
        ].map((item) => ({ ...item, pubDate: now }));

        trending.ingestHeadlines(headlines);

        let spikes = trending.drainTrendingSignals();
        for (let i = 0; i < 20 && spikes.length === 0; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          spikes = trending.drainTrendingSignals();
        }

        return {
          emittedTitles: spikes.map((signal) => signal.title),
          hasWireDeskSpike: spikes.some((signal) => /wiredesk/i.test(signal.title)),
        };
      } finally {
        trending.updateTrendingConfig(previousConfig);
      }
    });

    expect(result.hasWireDeskSpike).toBe(false);
    expect(result.emittedTitles.length).toBe(0);
  });

  test('suppresses month-name token spikes', async ({ page }) => {
    await page.goto('/tests/runtime-harness.html');

    const result = await page.evaluate(async () => {
      const trending = await import('/src/services/trending-keywords.ts');
      const previousConfig = trending.getTrendingConfig();

      try {
        trending.updateTrendingConfig({
          blockedTerms: [],
          minSpikeCount: 4,
          spikeMultiplier: 3,
          autoSummarize: false,
        });

        const now = new Date();
        const headlines = [
          { source: 'Reuters', title: 'January qxavon ledger shift' },
          { source: 'AP', title: 'January brivon routing update' },
          { source: 'BBC', title: 'January caldren supply note' },
          { source: 'Bloomberg', title: 'January dernix cargo brief' },
          { source: 'WSJ', title: 'January eptara policy digest' },
        ].map((item) => ({ ...item, pubDate: now }));

        trending.ingestHeadlines(headlines);

        let spikes = trending.drainTrendingSignals();
        for (let i = 0; i < 20 && spikes.length === 0; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          spikes = trending.drainTrendingSignals();
        }

        return {
          emittedTitles: spikes.map((signal) => signal.title),
          hasJanuarySpike: spikes.some((signal) => /january/i.test(signal.title)),
        };
      } finally {
        trending.updateTrendingConfig(previousConfig);
      }
    });

    expect(result.hasJanuarySpike).toBe(false);
    expect(result.emittedTitles.length).toBe(0);
  });
});
