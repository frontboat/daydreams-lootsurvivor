import { action, type ActionSchema } from "@daydreamsai/core";
import { StarknetChain } from "@daydreamsai/defai";
import type { Agent } from "@daydreamsai/core";
import * as z from "zod";
import { Abi, Contract } from "starknet";
import { CONTEXT } from "../../contexts/ponziland-context";
import {
  get_auctions_str,
  get_claims_str,
  get_lands_str,
  get_neighbors_str,
  get_all_lands_str,
  get_auction_yield_str,
  get_prices_str,
} from "../../utils/querys";
import { env } from "../../../env";
import view_manifest from "../../../contracts/view_manifest_mainnet.json";

export const get_auctions = (chain: StarknetChain) =>
  action({
    name: "get-auctions",
    description: "Get all of the active auctions",
    schema: z.object({}),
    async handler(data: {}, ctx: any, agent: Agent) {
      //todo
      let auctions = await get_auctions_str();

      return auctions;
    },
  });

export const get_prices = (chain: StarknetChain) =>
  action({
    name: "get-prices",
    description: "Get the current prices of all tokens in ponziland",
    schema: z.object({}),
    async handler(data: {}, ctx: any, agent: Agent) {
      let prices = await get_prices_str();

      return prices;
    },
  });

export const get_owned_lands = (chain: StarknetChain) =>
  action({
    name: "get-owned-lands",
    description:
      "Get all of your lands in ponziland. Remember this expects no arguments. The content for this action should always be {}",
    schema: z.object({}),
    async handler(data: {}, ctx: any, agent: Agent) {
      let address = env.STARKNET_ADDRESS!;
      //todo
      let lands = await get_lands_str(address);

      if (lands == "") {
        return "You do not own any lands";
      }

      return lands;
    },
  });

export const get_claims = (chain: StarknetChain) =>
  action({
    name: "get-claims",
    description:
      "Get all of the claims in ponziland. Remember this expects no arguments",
    schema: z.object({}),
    async handler(data: {}, ctx: any, agent: Agent) {
      //todo
      let claims = await get_claims_str();

      return claims;
    },
  });

export const get_neighbors = (chain: StarknetChain) =>
  action({
    name: "get-neighbors",
    description:
      "Get all of your lands neighbors in ponziland. Remember this expects a location argument",
    schema: z.object({ location: z.number() }),
    async handler(data: { location: number }, ctx: any, agent: Agent) {
      //todo
      let neighbors = await get_neighbors_str(data.location);

      if (neighbors == "") {
        return (
          "Failed to get neighbors for location " +
          location +
          ". land may not exist."
        );
      }

      return neighbors;
    },
  });

export const get_all_lands = (chain: StarknetChain) =>
  action({
    name: "get-all-lands",
    description: "Get all of the lands in ponziland",
    schema: z.object({}),
    async handler(data: {}, ctx: any, agent: Agent) {
      let lands = await get_all_lands_str();

      return lands;
    },
  });

export const get_context = (chain: StarknetChain) =>
  action({
    name: "get-context",
    description:
      "Get general information about Ponziland. This should be called first before attempting any other ponziland actions. The content for this action should always be {}",
    schema: z.object({}),
    async handler(data: {}, ctx: any, agent: Agent) {
      let res = await CONTEXT();

      return res;
    },
  });

export const get_auction_yield = (chain: StarknetChain) =>
  action({
    name: "get-auction-yield",
    description:
      "Get the potential yield of a land that is up for auction. This expects a location argument. This should be called to evaluate auctions before deciding to bid or not,.",
    schema: z.object({ location: z.number() }),
    async handler(data: { location: number }, ctx: any, agent: Agent) {
      let info = await get_auction_yield_str(data.location);

      return info;
    },
  });

export const get_player_lands = (chain: StarknetChain) =>
  action({
    name: "get-player-lands",
    description:
      "Get all of the lands that a player owns in ponziland. This expects a starknet address argument",
    schema: z.object({ address: z.string() }),
    async handler(data: { address: string }, ctx: any, agent: Agent) {
      let res = await get_lands_str(data.address);

      return res;
    },
  });

export const get_prices_str = async () => {
  let tokens = await getAllTokensFromAPI();

  let prices = tokens
    .map((token) => {
      return `
      ${token.symbol}: ${token.ratio} estark
      `;
    })
    .join("\n");

  return prices;
};
