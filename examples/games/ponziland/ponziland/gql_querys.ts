import { env } from "../env";

export const balance_query = `query GetTokenBalances {
    tokenBalances(accountAddress:"${env.STARKNET_ADDRESS}"){
      edges{
        node{
          tokenMetadata{
             ... on ERC20__Token {
              symbol
              amount
              contractAddress
            }
          }
        }
      }
    }
  }`;

export const auction_query = `query GetActiveAuctions {
    ponziLandAuctionModels(where:{is_finished: false}){
        edges{
        node{
            start_time
            is_finished
            start_price
            floor_price
            land_location
            decay_rate
        }
        }
    }
  }`;

export const land_query = (address: string) => `query GetOwnedLands {
ponziLandLandModels(where:{owner:"${address}"}){
  edges{
    node{
      location
      sell_price
      token_used
    }
  }
  }

  }`;

export const nuke_query = `query GetNukeableLands {
    ponziLandLandModels(where:{stake_amount: "0"}){
      edges{
        node{
          location
        }
      }
    }
  }`;
