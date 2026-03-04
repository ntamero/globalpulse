/**
 * DefiTVLPanel — DeFi Total Value Locked by chain
 * Data: DefiLlama API (free, no key)
 * Refresh: every 10 minutes
 */
import { Panel } from './Panel';

interface ChainTVL {
  name: string;
  tvl: number;
  change1d: number;
  change7d: number;
}

export class DefiTVLPanel extends Panel {
  private chains: ChainTVL[] = [];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({ id: 'defi-tvl', title: 'DeFi TVL', className: 'defi-tvl-panel' });
    // className set in super
    this.fetchData();
    this.refreshTimer = setInterval(() => this.fetchData(), 600_000);
  }

  private async fetchData(): Promise<void> {
    try {
      this.showLoading();
      const resp = await fetch('https://api.llama.fi/v2/chains');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();

      this.chains = json
        .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
        .slice(0, 15)
        .map((c: { name: string; tvl: number; change_1d?: number; change_7d?: number }) => ({
          name: c.name,
          tvl: c.tvl,
          change1d: c.change_1d || 0,
          change7d: c.change_7d || 0,
        }));

      this.render();
      this.setDataBadge('live', `${this.chains.length} chains`);
    } catch (err) {
      console.warn('[DefiTVL] fetch error:', err);
      this.setContent(`<div class="panel-error">DeFi TVL verisi yuklenemedi</div>`);
    }
  }

  private formatTVL(value: number): string {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    return `$${value.toFixed(0)}`;
  }

  private getChainIcon(name: string): string {
    const icons: Record<string, string> = {
      Ethereum: '⟠', Solana: '◎', BSC: '🔶', Tron: '⬡', Arbitrum: '🔵',
      Polygon: '🟣', Avalanche: '🔺', Optimism: '🔴', Base: '🔵', Sui: '💧',
      Aptos: '🟢', Fantom: '👻', Cronos: '🔷', Near: '🌐', Cosmos: '⚛️',
    };
    return icons[name] || '●';
  }

  private render(): void {
    const totalTVL = this.chains.reduce((sum, c) => sum + c.tvl, 0);

    const rows = this.chains.map((c, i) => {
      const share = ((c.tvl / totalTVL) * 100).toFixed(1);
      const d1Color = c.change1d >= 0 ? '#00c853' : '#ff1744';
      const d1Arrow = c.change1d >= 0 ? '▲' : '▼';
      return `<div class="defi-row">
        <span class="defi-rank">${i + 1}</span>
        <span class="defi-icon">${this.getChainIcon(c.name)}</span>
        <span class="defi-name">${c.name}</span>
        <span class="defi-tvl">${this.formatTVL(c.tvl)}</span>
        <span class="defi-share">${share}%</span>
        <span class="defi-change" style="color:${d1Color}">${d1Arrow}${Math.abs(c.change1d).toFixed(1)}%</span>
      </div>`;
    }).join('');

    this.setContent(`
      <div class="defi-header">
        <span class="defi-badge">DEFI</span>
        <span class="defi-total">Total: ${this.formatTVL(totalTVL)}</span>
      </div>
      <div class="defi-list">${rows}</div>
    `);
  }

  destroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    super.destroy();
  }
}
