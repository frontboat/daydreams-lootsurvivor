use starknet::ContractAddress;

use game::FreeGameTokenType;
use beasts::beast::Beast;
use market::market::{ItemPurchase};
use adventurer::{
    bag::Bag, adventurer::{Adventurer, Stats, ItemSpecial}, adventurer_meta::AdventurerMetadata,
    leaderboard::Leaderboard, item::{Item},
    constants::discovery_constants::DiscoveryEnums::ExploreResult
};

#[starknet::interface]
trait IGame<TContractState> {
    // ------ Game Actions ------
    fn new_game(
        ref self: TContractState,
        client_reward_address: ContractAddress,
        weapon: u8,
        name: felt252,
        golden_token_id: u8,
        delay_reveal: bool,
        custom_renderer: ContractAddress,
        launch_tournament_winner_token_id: u128,
        mint_to: ContractAddress
    ) -> felt252;
    fn explore(
        ref self: TContractState, adventurer_id: felt252, till_beast: bool
    ) -> Array<ExploreResult>;
    fn attack(ref self: TContractState, adventurer_id: felt252, to_the_death: bool);
    fn flee(ref self: TContractState, adventurer_id: felt252, to_the_death: bool);
    fn equip(ref self: TContractState, adventurer_id: felt252, items: Array<u8>);
    fn drop(ref self: TContractState, adventurer_id: felt252, items: Array<u8>);
    fn upgrade(
        ref self: TContractState,
        adventurer_id: felt252,
        potions: u8,
        stat_upgrades: Stats,
        items: Array<ItemPurchase>,
    );
    fn receive_random_words(
        ref self: TContractState,
        requestor_address: ContractAddress,
        request_id: u64,
        random_words: Span<felt252>,
        calldata: Array<felt252>
    );
    fn update_cost_to_play(ref self: TContractState) -> u128;
    fn set_adventurer_renderer(
        ref self: TContractState, adventurer_id: felt252, render_contract: ContractAddress
    );
    fn increase_vrf_allowance(ref self: TContractState, adventurer_id: felt252, amount: u128);
    fn update_adventurer_name(ref self: TContractState, adventurer_id: felt252, name: felt252);
    fn set_adventurer_obituary(
        ref self: TContractState, adventurer_id: felt252, obituary: ByteArray
    );
    fn slay_expired_adventurers(ref self: TContractState, adventurer_ids: Array<felt252>);
    fn enter_launch_tournament(
        ref self: TContractState,
        weapon: u8,
        name: felt252,
        custom_renderer: ContractAddress,
        delay_stat_reveal: bool,
        collection_address: ContractAddress,
        token_id: u128,
        mint_to: ContractAddress
    ) -> Array<felt252>;
    fn enter_launch_tournament_with_signature(
        ref self: TContractState,
        weapon: u8,
        name: felt252,
        custom_renderer: ContractAddress,
        delay_stat_reveal: bool,
        collection_address: ContractAddress,
        token_id: u128,
        mint_from: ContractAddress,
        mint_to: ContractAddress,
        signature: Array<felt252>
    ) -> Array<felt252>;
    fn settle_launch_tournament(ref self: TContractState);
    // ------ View Functions ------

    // adventurer details
    fn get_adventurer(self: @TContractState, adventurer_id: felt252) -> Adventurer;
    fn get_adventurer_name(self: @TContractState, adventurer_id: felt252) -> felt252;
    fn get_adventurer_obituary(self: @TContractState, adventurer_id: felt252) -> ByteArray;
    fn get_adventurer_no_boosts(self: @TContractState, adventurer_id: felt252) -> Adventurer;
    fn get_adventurer_meta(self: @TContractState, adventurer_id: felt252) -> AdventurerMetadata;
    fn get_client_provider(self: @TContractState, adventurer_id: felt252) -> ContractAddress;

    // fn equipment_stat_boosts(self: @TContractState, adventurer_id: felt252) -> Stats;

    // bag and specials
    fn get_bag(self: @TContractState, adventurer_id: felt252) -> Bag;

    // // market details
    fn get_market(self: @TContractState, adventurer_id: felt252) -> Array<u8>;
    fn get_potion_price(self: @TContractState, adventurer_id: felt252) -> u16;
    fn get_item_price(self: @TContractState, adventurer_id: felt252, item_id: u8) -> u16;

    // beast details
    fn get_attacking_beast(self: @TContractState, adventurer_id: felt252) -> Beast;
    fn get_item_specials(self: @TContractState, adventurer_id: felt252) -> Array<ItemSpecial>;
    // fn get_beast_type(self: @TContractState, beast_id: u8) -> u8;
    // fn get_beast_tier(self: @TContractState, beast_id: u8) -> u8;

    // game settings
    // fn starting_gold(self: @TContractState) -> u16;
    // fn starting_health(self: @TContractState) -> u16;
    // fn base_potion_price(self: @TContractState) -> u16;
    // fn potion_health_amount(self: @TContractState) -> u16;
    // fn minimum_potion_price(self: @TContractState) -> u16;
    // fn charisma_potion_discount(self: @TContractState) -> u16;
    // fn items_per_stat_upgrade(self: @TContractState) -> u8;
    // fn item_tier_price_multiplier(self: @TContractState) -> u16;
    // fn charisma_item_discount(self: @TContractState) -> u16;
    // fn minimum_item_price(self: @TContractState) -> u16;
    // fn minimum_damage_to_beasts(self: @TContractState) -> u8;
    // fn minimum_damage_from_beasts(self: @TContractState) -> u8;
    // fn minimum_damage_from_obstacles(self: @TContractState) -> u8;
    fn obstacle_critical_hit_chance(self: @TContractState, adventurer_id: felt252) -> u8;
    fn beast_critical_hit_chance(
        self: @TContractState, adventurer_id: felt252, is_ambush: bool
    ) -> u8;
    // fn stat_upgrades_per_level(self: @TContractState) -> u8;
    // fn beast_special_name_unlock_level(self: @TContractState) -> u16;
    // fn item_xp_multiplier_beasts(self: @TContractState) -> u16;
    // fn item_xp_multiplier_obstacles(self: @TContractState) -> u16;
    // fn strength_bonus_damage(self: @TContractState) -> u8;

    // contract details
    // fn owner_of(self: @TContractState, adventurer_id: felt252) -> ContractAddress;
    fn get_game_count(self: @TContractState) -> felt252;
    fn get_leaderboard(self: @TContractState) -> Leaderboard;
    fn get_cost_to_play(self: @TContractState) -> u128;
    fn free_game_available(
        self: @TContractState, token_type: FreeGameTokenType, token_id: u128
    ) -> bool;
    fn uses_custom_renderer(self: @TContractState, adventurer_id: felt252) -> bool;
    fn get_adventurer_renderer(self: @TContractState, adventurer_id: felt252) -> ContractAddress;
    fn get_adventurer_vrf_allowance(self: @TContractState, adventurer_id: felt252) -> u128;
    fn get_vrf_premiums_address(self: @TContractState) -> ContractAddress;
    fn free_vrf_promotion_active(self: @TContractState) -> bool;
    fn is_launch_tournament_active(self: @TContractState) -> bool;
    fn get_launch_tournament_winner(self: @TContractState) -> ContractAddress;
    fn get_launch_tournament_end_time(self: @TContractState) -> u64;
    fn get_start_time(self: @TContractState) -> u64;
}

#[starknet::interface]
trait IERC721Mixin<TState> {
    // IERC721
    fn balance_of(self: @TState, account: ContractAddress) -> u256;

    fn owner_of(self: @TState, token_id: u256) -> ContractAddress;

    fn safe_transfer_from(
        ref self: TState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
        data: Span<felt252>
    );

    fn transfer_from(ref self: TState, from: ContractAddress, to: ContractAddress, token_id: u256);

    fn approve(ref self: TState, to: ContractAddress, token_id: u256);

    fn set_approval_for_all(ref self: TState, operator: ContractAddress, approved: bool);

    fn get_approved(self: @TState, token_id: u256) -> ContractAddress;

    fn is_approved_for_all(
        self: @TState, owner: ContractAddress, operator: ContractAddress
    ) -> bool;

    // IERC721Metadata
    fn name(self: @TState) -> ByteArray;

    fn symbol(self: @TState) -> ByteArray;

    fn token_uri(self: @TState, token_id: u256) -> ByteArray;

    // IERC721CamelOnly
    fn balanceOf(self: @TState, account: ContractAddress) -> u256;

    fn ownerOf(self: @TState, tokenId: u256) -> ContractAddress;

    fn safeTransferFrom(
        ref self: TState,
        from: ContractAddress,
        to: ContractAddress,
        tokenId: u256,
        data: Span<felt252>
    );

    fn transferFrom(ref self: TState, from: ContractAddress, to: ContractAddress, tokenId: u256);

    fn setApprovalForAll(ref self: TState, operator: ContractAddress, approved: bool);

    fn getApproved(self: @TState, tokenId: u256) -> ContractAddress;

    fn isApprovedForAll(self: @TState, owner: ContractAddress, operator: ContractAddress) -> bool;

    // IERC721MetadataCamelOnly
    fn tokenURI(self: @TState, tokenId: u256) -> ByteArray;

    // ISRC5
    fn supports_interface(self: @TState, interface_id: felt252) -> bool;
    fn supportsInterface(self: @TState, interfaceId: felt252) -> bool;
}

#[starknet::interface]
trait IBeasts<T> {
    fn mint(
        ref self: T, to: ContractAddress, beast: u8, prefix: u8, suffix: u8, level: u16, health: u16
    );
    fn isMinted(self: @T, beast: u8, prefix: u8, suffix: u8) -> bool;
    fn getMinter(self: @T) -> ContractAddress;
}

#[starknet::interface]
trait IDelegateAccount<TContractState> {
    fn set_delegate_account(ref self: TContractState, delegate_address: ContractAddress);
    fn delegate_account(self: @TContractState) -> ContractAddress;
}
