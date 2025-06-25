import { action } from "@daydreamsai/core";
import { StarknetChain } from "@daydreamsai/defai";
import * as z from "zod/v4";
import { type Abi, CallData, cairo } from "starknet";
import type { Call } from "starknet";
import { indexToPosition } from "../../utils/utils";
import { get_owned_lands } from "../../utils/querys";
import ponziland_manifest from "../../../contracts/ponziland_manifest_mainnet.json";

let manifest = ponziland_manifest;
let estark_address =
  "0x056893df1e063190aabda3c71304e9842a1b3d638134253dd0f69806a4f106eb";

export const level_up = (chain: StarknetChain) =>
  action({
    name: "level-up",
    description: "Level up a land",
    schema: z.object({
      land_location: z.string().describe("Location of the land to level up"),
    }),
    async handler(data, ctx, agent) {
      let calls = [];

      let ponziland_address = manifest.contracts[0].address;

      let level_up_call: Call = {
        contractAddress: ponziland_address,
        entrypoint: "level_up",
        calldata: CallData.compile({ land_location: data.land_location }),
      };

      calls.push(level_up_call);

      let res = await chain.write(calls);

      return {
        res,
        str:
          "Leveled up land " +
          Number(data.land_location) +
          " at (" +
          indexToPosition(Number(data.land_location))[0] +
          "," +
          indexToPosition(Number(data.land_location))[1] +
          ")",
      };
    },
  });

export const increase_stake = (chain: StarknetChain) =>
  action({
    name: "increase-stake",
    description:
      "Increase the stake for your lands. These amounts should always be 10 < amount < 20 tokens, x10^18 of course so to increase stake with 10 toke pass in 10000000000000000000",
    schema: z.object({
      calls: z
        .array(
          z.object({
            land_location: z
              .string()
              .describe("Location of the land to increase stake on"),
            amount: z
              .string()
              .describe("The new stake amount (in wei, so x10^18)"),
          })
        )
        .describe(
          "The locations and amounts of the lands you are increasing the stake for"
        ),
    }),
    async handler(data, ctx, agent) {
      let calls = [];
      let tokenAmounts: { [tokenAddress: string]: bigint } = {};

      let ponziland_address = manifest.contracts[0].address;

      let lands = await get_owned_lands();

      // First pass: collect all increase_stake calls and track token amounts
      for (const call of data.calls) {
        let land;
        for (const l of lands) {
          if (Number(l.location) == Number(call.land_location)) {
            land = l;
            break;
          }
        }
        let token_address = land.token_used;

        // Track total amount needed for each token
        if (!tokenAmounts[token_address]) {
          tokenAmounts[token_address] = BigInt(0);
        }
        tokenAmounts[token_address] += BigInt(call.amount);

        // Add the increase_stake call
        let increase_stake_call: Call = {
          contractAddress: ponziland_address,
          entrypoint: "increase_stake",
          calldata: CallData.compile({
            land_location: call.land_location,
            amount: cairo.uint256(call.amount),
          }),
        };
        calls.push(increase_stake_call);
      }

      // Second pass: add bundled approve calls at the beginning
      let approveCalls: Call[] = [];
      for (const [token_address, totalAmount] of Object.entries(tokenAmounts)) {
        let approve_call: Call = {
          contractAddress: token_address,
          entrypoint: "approve",
          calldata: CallData.compile({
            spender: ponziland_address,
            amount: cairo.uint256(totalAmount.toString()),
          }),
        };
        approveCalls.push(approve_call);
      }

      // Prepend approve calls to the beginning of the calls array
      calls = [...approveCalls, ...calls];

      let res = await chain.write(calls);

      let str =
        "Increased stake on lands " +
        data.calls
          .map(
            (c) =>
              indexToPosition(Number(c.land_location))[0] +
              "," +
              indexToPosition(Number(c.land_location))[1]
          )
          .join(", ");

      return { res, str };
    },
  });

export const increase_price = (chain: StarknetChain) =>
  action({
    name: "increase-price",
    description: "Increase the price of a land",
    schema: z.object({
      land_location: z
        .string()
        .describe(
          "Location of the land to increase price on. Make sure this is a land you own."
        ),
      amount: z.string().describe("The new price amount (in wei, so x10^18)"),
    }),
    async handler(data, ctx, agent) {
      let calls = [];

      let ponziland_address = manifest.contracts[0].address;

      let increase_price_call: Call = {
        contractAddress: ponziland_address,
        entrypoint: "increase_price",
        calldata: CallData.compile({
          land_location: data.land_location,
          amount: cairo.uint256(data.amount),
        }),
      };

      calls.push(increase_price_call);

      let res = await chain.write(calls);

      return {
        res,
        str:
          "Increased price on land " +
          Number(data.land_location) +
          " at (" +
          indexToPosition(Number(data.land_location))[0] +
          "," +
          indexToPosition(Number(data.land_location))[1] +
          ")",
      };
    },
  });
