export interface TokenPrice {
  symbol: string;
  address: string;
  ratio: number | null;
  best_pool: {
    token0: string;
    token1: string;
    fee: string;
    tick_spacing: number;
    extension: string;
  } | null;
}

export async function getAllTokensFromAPI(): Promise<TokenPrice[]> {
  const response = await fetch("https://api.ponzi.land/price");
  return response.json();
}
