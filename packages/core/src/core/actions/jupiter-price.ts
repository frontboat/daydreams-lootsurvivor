import type { 
    ActionHandler, 
    JupiterPriceParams, 
    JupiterTokenSearchParams, 
    JupiterRouteParams 
  } from "../../types";
import { fetchJupiterPrices, searchJupiterTokens, fetchJupiterRoutes } from "../providers";

export const jupiterPriceAction: ActionHandler = async (action) => {
  try {
    const payload = action.payload as JupiterPriceParams;
    const result = await fetchJupiterPrices(payload);
    
    if (result instanceof Error) {
      throw result;
    }

    return JSON.stringify(result, null, 2);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch Jupiter prices";
    throw new Error(`Jupiter price action failed: ${errorMessage}`);
  }
};

export const jupiterTokenSearchAction: ActionHandler = async (action) => {
  try {
    const payload = action.payload as JupiterTokenSearchParams;
    const result = await searchJupiterTokens(payload);
    
    if (result instanceof Error) {
      throw result;
    }

    const tokenSummary = result
      .map(token => `${token.symbol} (${token.name})`)
      .slice(0, 3)
      .join(", ");

    return JSON.stringify({
      success: true,
      tokens: result,
      message: `Found ${result.length} tokens. Top matches: ${tokenSummary}${result.length > 3 ? "..." : ""}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({
      success: false,
      error: errorMessage,
      message: `Failed to search Jupiter tokens: ${errorMessage}`
    });
  }
};

export const jupiterRouteAction: ActionHandler = async (action) => {
  try {
    const payload = action.payload as JupiterRouteParams;
    const result = await fetchJupiterRoutes(payload);
    
    if (result instanceof Error) {
      throw result;
    }

    const routeInfo = result.data.marketInfos
      .map(market => market.label)
      .join(" → ");

    return JSON.stringify({
      success: true,
      route: result.data,
      message: `Found route with ${result.data.marketInfos.length} steps: ${routeInfo}. Price impact: ${result.data.priceImpactPct}%`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({
      success: false,
      error: errorMessage,
      message: `Failed to fetch Jupiter routes: ${errorMessage}`
    });
  }
};