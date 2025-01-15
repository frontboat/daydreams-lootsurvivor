#[cfg(test)]
mod tests {
    use starknet::storage::MutableVecTrait;
    use starknet::storage_access::storage_address_from_base;
    use array::ArrayTrait;
    use core::{result::ResultTrait, traits::Into, array::SpanTrait, serde::Serde, clone::Clone};
    use option::OptionTrait;
    use starknet::{
        syscalls::deploy_syscall, testing, ContractAddress, ContractAddressIntoFelt252,
        contract_address_const
    };
    use traits::TryInto;
    use box::BoxTrait;
    use market::market::{ImplMarket, LootWithPrice, ItemPurchase};
    use snforge_std::{
        declare, ContractClassTrait, start_cheat_block_timestamp_global,
        start_cheat_block_number_global, start_cheat_caller_address_global,
        stop_cheat_caller_address_global, cheatcodes::contract_class::ContractClass,
        start_cheat_chain_id_global, store, load, map_entry_address
    };
    use loot::{loot::{Loot, ImplLoot, ILoot}, constants::{ItemId}};
    use game::{
        Game, LaunchTournamentCollections,
        Game::{
            IGame, _process_item_level_up, _set_item_specials_seed, _initialize_launch_tournament,
            _process_adventurer_death
        },
        game::{
            interfaces::{IGameDispatcherTrait, IGameDispatcher},
            constants::{
                COST_TO_PLAY, Rewards, REWARD_DISTRIBUTIONS_BP, messages::{STAT_UPGRADES_AVAILABLE},
                STARTER_BEAST_ATTACK_DAMAGE, GAME_EXPIRY_DAYS, SECONDS_IN_DAY, OBITUARY_EXPIRY_DAYS
            },
        }
    };

    use game::tests::mock_randomness::{
        MockRandomness, IMockRandomnessDispatcher, IMockRandomnessDispatcherTrait
    };
    use combat::{constants::CombatEnums::{Slot, Tier}, combat::ImplCombat};
    use adventurer::{
        stats::Stats, adventurer_meta::{AdventurerMetadata, ImplAdventurerMetadata},
        constants::adventurer_constants::{
            STARTING_GOLD, POTION_HEALTH_AMOUNT, BASE_POTION_PRICE, STARTING_HEALTH
        },
        constants::discovery_constants::DiscoveryEnums::ExploreResult,
        adventurer::{Adventurer, ImplAdventurer, IAdventurer}, item::{Item, ImplItem},
        bag::{Bag, IBag}
    };
    use beasts::constants::{BeastSettings, BeastId};

    use game::tests::oz_constants::{
        ZERO, OWNER, SPENDER, RECIPIENT, NAME, SYMBOL, DECIMALS, SUPPLY, VALUE, DATA, OPERATOR,
        OTHER, BASE_URI, TOKEN_ID
    };

    use game::tests::mocks::erc20_mocks::DualCaseERC20Mock;
    use game::tests::mocks::erc721_mocks::DualCaseERC721Mock;
    use openzeppelin::token::erc20::dual20::{DualCaseERC20, DualCaseERC20Trait};
    use openzeppelin::token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::utils::serde::SerializedAppend;
    use openzeppelin::token::erc721::dual721::{DualCaseERC721, DualCaseERC721Trait};
    use openzeppelin::token::erc721::interface::IERC721_ID;
    use openzeppelin::token::erc20::ERC20Component::{Approval, Transfer};
    use openzeppelin::token::erc20::ERC20Component::{ERC20CamelOnlyImpl, ERC20Impl};
    use openzeppelin::token::erc20::ERC20Component::{ERC20MetadataImpl, InternalImpl};
    use openzeppelin::token::erc20::ERC20Component;

    use openzeppelin::token::erc721::interface::{
        IERC721, IERC721Dispatcher, IERC721DispatcherTrait, IERC721LibraryDispatcher,
        IERC721CamelOnlyDispatcher, IERC721CamelOnlyDispatcherTrait
    };

    use starknet::testing::set_caller_address;

    const APPROVE: u256 = 1000000000000000000000000000000000000000000;
    const DAY: u64 = 86400;
    const TESTING_CHAIN_ID: felt252 = 0x4c4f4f545355525649564f52;
    const LAUNCH_TOURNAMENT_GAMES_PER_COLLCTION: u16 = 300;
    const start_delay_seconds: u64 = 0;
    const FREE_VRF_PROMOTION_DURATION_SECONDS: u64 = 25200;

    fn INTERFACE_ID() -> ContractAddress {
        contract_address_const::<1>()
    }

    fn DAO() -> ContractAddress {
        contract_address_const::<2>()
    }

    fn PG() -> ContractAddress {
        contract_address_const::<3>()
    }

    fn COLLECTIBLE_BEASTS() -> ContractAddress {
        contract_address_const::<4>()
    }

    fn ORACLE_ADDRESS() -> ContractAddress {
        contract_address_const::<5>()
    }

    fn RENDER_CONTRACT() -> ContractAddress {
        contract_address_const::<6>()
    }

    fn ARBITRARY_ADDRESS() -> ContractAddress {
        contract_address_const::<12345>()
    }

    fn VRF_PREMIUMS_ADDRESS() -> ContractAddress {
        contract_address_const::<7>()
    }

    fn QUALIFYING_COLLECTIONS() -> Span<ContractAddress> {
        let mut qualifying_collections = ArrayTrait::<ContractAddress>::new();
        //let (_, blobert_dispatcher) = deploy_bloberts();
        //qualifying_collections.append(blobert_dispatcher.contract_address);
        qualifying_collections.append(contract_address_const::<12>());
        qualifying_collections.append(contract_address_const::<13>());
        qualifying_collections.span()
    }

    fn ZERO_ADDRESS() -> ContractAddress {
        contract_address_const::<0>()
    }

    fn OWNER_TWO() -> ContractAddress {
        contract_address_const::<15>()
    }

    const PUBLIC_KEY: felt252 = 0x333333;
    const NEW_PUBKEY: felt252 = 0x789789;
    const SALT: felt252 = 123;
    #[derive(Drop)]
    struct SignedTransactionData {
        private_key: felt252,
        public_key: felt252,
        transaction_hash: felt252,
        r: felt252,
        s: felt252
    }

    fn SIGNED_TX_DATA() -> SignedTransactionData {
        SignedTransactionData {
            private_key: 1234,
            public_key: 883045738439352841478194533192765345509759306772397516907181243450667673002,
            transaction_hash: 2717105892474786771566982177444710571376803476229898722748888396642649184538,
            r: 3068558690657879390136740086327753007413919701043650133111397282816679110801,
            s: 3355728545224320878895493649495491771252432631648740019139167265522817576501
        }
    }

    fn deploy_lords(contract_class: ContractClass) -> IERC20Dispatcher {
        let lords_name: ByteArray = "LORDS";
        let lords_symbol: ByteArray = "LORDS";
        let lords_supply: u256 = 10000000000000000000000000000000000000000;

        let mut calldata = array![];
        calldata.append_serde(lords_name);
        calldata.append_serde(lords_symbol);
        calldata.append_serde(lords_supply);
        calldata.append_serde(OWNER());
        let (contract_address, _) = contract_class.deploy(@calldata).unwrap();

        IERC20Dispatcher { contract_address: contract_address }
    }

    fn deploy_eth(contract_class: ContractClass) -> IERC20Dispatcher {
        let lords_name: ByteArray = "ETH";
        let lords_symbol: ByteArray = "ETH";
        let lords_supply: u256 = 10000000000000000000000000000000000000000;

        let mut calldata = array![];
        calldata.append_serde(lords_name);
        calldata.append_serde(lords_symbol);
        calldata.append_serde(lords_supply);
        calldata.append_serde(OWNER());

        let (contract_address, _) = contract_class.deploy(@calldata).unwrap();

        IERC20Dispatcher { contract_address: contract_address }
    }

    fn deploy_golden_token(contract_class: ContractClass) -> IERC721Dispatcher {
        let golden_token_name: ByteArray = "GOLDEN_TOKEN";
        let golden_token_symbol: ByteArray = "GLDTKN";
        let base_uri: ByteArray = "https://gt.lootsurvivor.io/";
        let TOKEN_ID: u256 = 1;

        let mut calldata = array![];
        calldata.append_serde(golden_token_name);
        calldata.append_serde(golden_token_symbol);
        calldata.append_serde(base_uri);
        calldata.append_serde(OWNER());
        calldata.append_serde(TOKEN_ID);
        start_cheat_caller_address_global(OWNER());
        let (contract_address, _) = contract_class.deploy(@calldata).unwrap();
        IERC721Dispatcher { contract_address: contract_address }
    }

    fn deploy_bloberts(contract_class: ContractClass) -> IERC721Dispatcher {
        let token_name: ByteArray = "Bloberts";
        let token_symbol: ByteArray = "BLOB";
        let base_uri: ByteArray = "https://bloberts.com/";
        let TOKEN_ID: u256 = 1;
        let mut calldata = array![];
        calldata.append_serde(token_name);
        calldata.append_serde(token_symbol);
        calldata.append_serde(base_uri);
        calldata.append_serde(OWNER());
        calldata.append_serde(TOKEN_ID);
        start_cheat_caller_address_global(OWNER());
        let (contract_address, _) = contract_class.deploy(@calldata).unwrap();
        IERC721Dispatcher { contract_address: contract_address }
    }

    fn deploy_beasts(contract_class: ContractClass) -> IERC721Dispatcher {
        let token_name: ByteArray = "Beasts";
        let token_symbol: ByteArray = "BEASTS";
        let base_uri: ByteArray = "https://beasts.lootsurvivor.io/";
        let TOKEN_ID: u256 = 1;
        let mut calldata = array![];
        calldata.append_serde(token_name);
        calldata.append_serde(token_symbol);
        calldata.append_serde(base_uri);
        calldata.append_serde(OWNER());
        calldata.append_serde(TOKEN_ID);
        start_cheat_caller_address_global(OWNER());
        let (contract_address, _) = contract_class.deploy(@calldata).unwrap();
        IERC721Dispatcher { contract_address: contract_address }
    }

    fn deploy_vrf() -> IMockRandomnessDispatcher {
        let mut calldata = ArrayTrait::<felt252>::new();
        calldata.append(123);
        let contract = declare("MockRandomness").unwrap();
        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        IMockRandomnessDispatcher { contract_address }
    }

    /// @title Deploy Loot Survivor
    /// @notice Deploys the loot survivor game contract
    /// @param lords The address of the lords token
    /// @param eth The address of the eth token
    /// @param golden_token The address of the golden token
    /// @param terminal_timestamp The timestamp at which the game will terminate
    /// @param randomness The address of the randomness contract
    /// @param qualifying_collections The span of qualifying collections
    /// @param launch_promotion_duration_seconds The timestamp at which the launch promotion ends
    fn deploy_lootsurvivor(
        lords: ContractAddress,
        eth: ContractAddress,
        golden_token: ContractAddress,
        terminal_timestamp: u64,
        randomness: ContractAddress,
        qualifying_collections: Span<LaunchTournamentCollections>,
        launch_promotion_duration_seconds: u64
    ) -> IGameDispatcher {
        let mut calldata = ArrayTrait::<felt252>::new();
        calldata.append(lords.into());
        calldata.append(eth.into());
        calldata.append(DAO().into());
        calldata.append(PG().into());
        calldata.append(COLLECTIBLE_BEASTS().into());
        calldata.append(golden_token.into());
        calldata.append(terminal_timestamp.into());
        calldata.append(randomness.into());
        calldata.append(ORACLE_ADDRESS().into());
        calldata.append(RENDER_CONTRACT().into());
        calldata.append(qualifying_collections.len().into());
        let mut collection_count = 0;

        loop {
            if collection_count == qualifying_collections.len() {
                break;
            }
            let collection = *qualifying_collections.at(collection_count);
            calldata.append(collection.collection_address.into());
            calldata.append(collection.games_per_token.into());
            collection_count += 1;
        };

        calldata.append(launch_promotion_duration_seconds.into());
        calldata.append(VRF_PREMIUMS_ADDRESS().into());
        calldata.append(LAUNCH_TOURNAMENT_GAMES_PER_COLLCTION.into());
        calldata.append(start_delay_seconds.into());
        calldata.append(FREE_VRF_PROMOTION_DURATION_SECONDS.into());
        let contract = declare("Game").unwrap();
        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        IGameDispatcher { contract_address }
    }

    /// @title Deploy Game
    /// @notice Deploys the game contract
    /// @param starting_block The block number at which the game will start
    /// @param starting_timestamp The timestamp at which the game will start
    /// @param terminal_block The block number at which the game will terminate
    /// @param launch_promotion_duration_seconds The timestamp at which the launch promotion ends
    /// @return The game contract, the lords token, the eth token, the golden token, the bloberts
    /// contract, the beasts contract
    fn deploy_game(
        starting_block: u64,
        starting_timestamp: u64,
        terminal_block: u64,
        launch_promotion_duration_seconds: u64
    ) -> (
        IGameDispatcher,
        IERC20Dispatcher,
        IERC20Dispatcher,
        IERC721Dispatcher,
        ContractAddress,
        IERC721Dispatcher,
        IERC721Dispatcher
    ) {
        start_cheat_chain_id_global(TESTING_CHAIN_ID);
        start_cheat_block_number_global(starting_block);
        start_cheat_block_timestamp_global(starting_timestamp);
        start_cheat_caller_address_global(OWNER());

        let erc20_class_hash = declare("DualCaseERC20Mock").unwrap();

        // deploy lords, eth, and golden token
        let lords = deploy_lords(erc20_class_hash);

        // deploy eth
        let eth = deploy_eth(erc20_class_hash);

        // declare erc721 class hash
        let erc721_class_hash = declare("DualCaseERC721Mock").unwrap();

        // deploy golden token
        let golden_token = deploy_golden_token(erc721_class_hash);

        // deploy bloberts
        let bloberts = deploy_bloberts(erc721_class_hash);

        // deploy beasts
        let beasts = deploy_beasts(erc721_class_hash);

        // add bloberts to qualifying collections
        let mut qualifying_collections = ArrayTrait::<LaunchTournamentCollections>::new();
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: bloberts.contract_address, games_per_token: 1
                }
            );

        // deploy vrf/randomness
        let randomness = deploy_vrf();

        // deploy game
        let game = deploy_lootsurvivor(
            lords.contract_address,
            eth.contract_address,
            golden_token.contract_address,
            terminal_block,
            randomness.contract_address,
            qualifying_collections.span(),
            launch_promotion_duration_seconds
        );

        // transfer lords to caller address and approve
        lords.transfer(OWNER(), 100000000000000000000000000000000);
        eth.transfer(OWNER(), 100000000000000000000000000000000);
        eth.transfer(game.contract_address, 100000000000000000000000000000000);

        // give golden token contract approval to access ETH
        eth.approve(golden_token.contract_address, APPROVE.into());

        lords.transfer(OWNER(), 1000000000000000000000000);

        start_cheat_caller_address_global(game.contract_address);
        eth.approve(VRF_PREMIUMS_ADDRESS(), APPROVE.into());
        start_cheat_caller_address_global(OWNER());

        lords.approve(game.contract_address, APPROVE.into());
        lords.approve(OWNER(), APPROVE.into());

        (game, lords, eth, golden_token, OWNER(), bloberts, beasts)
    }

    fn add_adventurer_to_game(
        ref game: IGameDispatcher, golden_token_id: u8, starting_weapon: u8
    ) -> felt252 {
        let adventurer_id = game
            .new_game(
                INTERFACE_ID(),
                starting_weapon,
                'loothero',
                golden_token_id,
                false,
                ZERO_ADDRESS(),
                0,
                ZERO_ADDRESS()
            );

        let new_adventurer = game.get_adventurer(adventurer_id);
        assert(new_adventurer.xp == 0, 'wrong starting xp');
        assert(new_adventurer.equipment.weapon.id == starting_weapon, 'wrong starting weapon');
        assert(
            new_adventurer.beast_health == BeastSettings::STARTER_BEAST_HEALTH.into(),
            'wrong starter beast health '
        );
        adventurer_id
    }

    fn add_level_2_adventurer_to_game(
        ref game: IGameDispatcher, golden_token_id: u8, starting_weapon: u8
    ) -> felt252 {
        let adventurer_id = game
            .new_game(
                INTERFACE_ID(),
                starting_weapon,
                'loothero',
                golden_token_id,
                false,
                ZERO_ADDRESS(),
                0,
                ZERO_ADDRESS()
            );

        let new_adventurer = game.get_adventurer(adventurer_id);
        assert(new_adventurer.xp == 0, 'wrong starting xp');
        assert(new_adventurer.equipment.weapon.id == ItemId::Wand, 'wrong starting weapon');
        assert(
            new_adventurer.beast_health == BeastSettings::STARTER_BEAST_HEALTH.into(),
            'wrong starter beast health '
        );
        game.attack(adventurer_id, false);
        adventurer_id
    }

    fn new_adventurer(starting_block: u64, starting_time: u64) -> (IGameDispatcher, felt252) {
        let terminal_block = 0;
        let (mut game, _, _, _, _, _, _) = deploy_game(
            starting_block, starting_time, terminal_block, 0
        );
        let starting_weapon = ItemId::Wand;
        let name = 'abcdefghijklmno';

        // start new game
        let adventurer_id = game
            .new_game(
                INTERFACE_ID(), starting_weapon, name, 0, false, ZERO_ADDRESS(), 0, ZERO_ADDRESS()
            );

        // get adventurer state
        let adventurer = game.get_adventurer(adventurer_id);
        let adventurer_name = game.get_adventurer_name(adventurer_id);
        let adventurer_meta_data = game.get_adventurer_meta(adventurer_id);

        // verify starting weapon
        assert(adventurer.equipment.weapon.id == starting_weapon, 'wrong starting weapon');
        assert(adventurer_name == name, 'wrong player name');
        assert(adventurer_meta_data.birth_date == starting_time, 'wrong birth date');
        assert(adventurer.xp == 0, 'should start with 0 xp');
        assert(
            adventurer.beast_health == BeastSettings::STARTER_BEAST_HEALTH.into(),
            'wrong starter beast health '
        );

        (game, adventurer_id)
    }

    fn new_adventurer_lvl2(
        starting_block: u64, starting_time: u64, starting_entropy: felt252
    ) -> (IGameDispatcher, felt252) {
        // start game
        let (mut game, adventurer_id) = new_adventurer(starting_block, starting_time);

        // attack starter beast
        game.attack(adventurer_id, false);

        // assert starter beast is dead
        let adventurer = game.get_adventurer(adventurer_id);
        assert(adventurer.beast_health == 0, 'should not be in battle');
        assert(adventurer.get_level() == 2, 'should be level 2');
        assert(adventurer.stat_upgrades_available == 1, 'should have 1 stat available');

        // return game
        (game, adventurer_id)
    }

    fn new_adventurer_with_lords(starting_block: u64) -> (IGameDispatcher, IERC20Dispatcher) {
        let starting_timestamp = 1;
        let terminal_timestamp = 0;
        let (mut game, lords, _, _, _, _, _) = deploy_game(
            starting_block, starting_timestamp, terminal_timestamp, 0
        );
        let starting_weapon = ItemId::Wand;
        let name = 'abcdefghijklmno';

        // start new game
        let adventurer_id = game
            .new_game(
                INTERFACE_ID(), starting_weapon, name, 0, false, ZERO_ADDRESS(), 0, ZERO_ADDRESS()
            );

        // get adventurer state
        let adventurer = game.get_adventurer(adventurer_id);
        let adventurer_name = game.get_adventurer_name(adventurer_id);
        let adventurer_meta_data = game.get_adventurer_meta(adventurer_id);

        // verify starting weapon
        assert(adventurer.equipment.weapon.id == starting_weapon, 'wrong starting weapon');
        assert(adventurer_name == name, 'wrong player name');
        assert(adventurer_meta_data.birth_date == starting_timestamp, 'wrong birth date');
        assert(adventurer.xp == 0, 'should start with 0 xp');
        assert(
            adventurer.beast_health == BeastSettings::STARTER_BEAST_HEALTH.into(),
            'wrong starter beast health '
        );

        (game, lords)
    }

    // TODO: need to figure out how to make this more durable
    // #[test]
    // #[available_gas(3000000000000)]
    // fn test_full_game() {
    //     let mut game = new_adventurer_lvl11_equipped(5);
    // }

    #[test]
    #[available_gas(300000000000)]
    fn test_start() {
        let (game, adventurer_id) = new_adventurer(1000, 1696201757);
        game.get_adventurer(adventurer_id);
        game.get_adventurer_meta(adventurer_id);
    }

    #[test]
    #[should_panic(expected: ('Action not allowed in battle',))]
    #[available_gas(900000000)]
    fn test_no_explore_during_battle() {
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        // try to explore before defeating start beast
        // should result in a panic 'In battle cannot explore' which
        // is annotated in the test
        game.explore(adventurer_id, true);
    }

    #[test]
    #[should_panic(expected: ('Not in battle',))]
    fn test_defeat_starter_beast() {
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        start_cheat_block_number_global(1002);

        let adventurer_start = game.get_adventurer(adventurer_id);

        // verify starting state
        assert(adventurer_start.xp == 0, 'advtr should start with 0xp');
        assert(
            adventurer_start.beast_health == BeastSettings::STARTER_BEAST_HEALTH.into(),
            'wrong beast starting health'
        );

        // attack beast
        game.attack(adventurer_id, false);

        // verify beast and adventurer took damage
        let updated_adventurer = game.get_adventurer(adventurer_id);
        assert(
            updated_adventurer.beast_health < adventurer_start.beast_health,
            'beast should have taken dmg'
        );

        // if the beast was killed in one hit
        if (updated_adventurer.beast_health == 0) {
            // verify adventurer received xp and gold
            assert(updated_adventurer.xp > adventurer_start.xp, 'advntr should gain xp');

            // attack again after the beast is dead which should
            // result in a panic. This test is annotated to expect a panic
            // so if it doesn't, this test will fail
            game.attack(adventurer_id, false);
        } // if the beast was not killed in one hit
        else {
            assert(updated_adventurer.xp == adventurer_start.xp, 'should have same xp');
            assert(updated_adventurer.gold == adventurer_start.gold, 'should have same gold');
            assert(updated_adventurer.health != 100, 'should have taken dmg');

            // attack again (will take out starter beast with current settings regardless of
            // critical hit)
            game.attack(adventurer_id, false);

            // recheck adventurer stats
            let updated_adventurer = game.get_adventurer(adventurer_id);
            assert(updated_adventurer.beast_health == 0, 'beast should be dead');
            assert(updated_adventurer.xp > adventurer_start.xp, 'should have same xp');
            assert(updated_adventurer.gold > adventurer_start.gold, 'should have same gold');

            // attack again after the beast is dead which should
            // result in a panic. This test is annotated to expect a panic
            // so if it doesn't, this test will fail
            game.attack(adventurer_id, false);
        }
    }

    #[test]
    #[should_panic(expected: ('Cant flee starter beast',))]
    #[available_gas(23000000)]
    fn test_cant_flee_starter_beast() {
        // start new game
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        // immediately attempt to flee starter beast
        // which is not allowed and should result in a panic 'Cant flee starter beast'
        // which is annotated in the test
        game.flee(adventurer_id, false);
    }

    #[test]
    #[should_panic(expected: ('Not in battle',))]
    #[available_gas(63000000)]
    fn test_cant_flee_outside_battle() {
        // start adventuer and advance to level 2
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // attempt to flee despite not being in a battle
        // this should trigger a panic 'Not in battle' which is
        // annotated in the test
        game.flee(adventurer_id, false);
    }

    #[test]
    fn test_explore_distributions() {
        let number_of_games: u16 = 50;
        let (mut game, _) = new_adventurer_lvl2(1003, 1696201757, 0);
        let mut game_ids = ArrayTrait::<felt252>::new();
        game_ids.append(1);

        // create 255 new games
        let mut i: u16 = 1;
        loop {
            if (i == number_of_games) {
                break;
            }
            game_ids.append(add_level_2_adventurer_to_game(ref game, 0, ItemId::Wand));
            i += 1;
        };

        // upgrade players in all games
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 1, vitality: 0, intelligence: 0, wisdom: 0, charisma: 0, luck: 0
        };
        let potions = 0;
        let mut i: u16 = 4;
        loop {
            if (i == number_of_games) {
                break;
            }
            game.upgrade(i.into(), potions, stat_upgrades, shopping_cart.clone());
            i += 1;
        };

        // explore all players in all games
        let mut beasts = 0;
        let mut obstacles = 0;
        let mut discoveries = 0;
        let mut i: u16 = 4;
        loop {
            if (i == number_of_games) {
                break;
            }
            let mut result = game.explore(i.into(), false);
            loop {
                match result.pop_front() {
                    Option::Some(outcome) => {
                        match outcome {
                            ExploreResult::Beast => beasts += 1,
                            ExploreResult::Obstacle => obstacles += 1,
                            ExploreResult::Discovery => discoveries += 1,
                        }
                    },
                    Option::None(_) => { break; }
                };
            };
            i += 1;
        };

        // output results
        // println!("beasts: {}", beasts);
        // println!("obstacles: {}", obstacles);
        // println!("discoveries: {}", discoveries);

        // assert distribution is reasonably close to 33% for each outcome
        let lower_bound = number_of_games / 3 - 10;
        let upper_bound = number_of_games / 3 + 10;
        assert(beasts > lower_bound && beasts < upper_bound, 'beasts distribution is sus');
        assert(obstacles > lower_bound && obstacles < upper_bound, 'obstacles distribution is sus');
        assert(
            discoveries > lower_bound && discoveries < upper_bound,
            'discoveries distribution is sus'
        );
    }

    #[test]
    #[available_gas(13000000000)]
    fn test_flee() {
        // start game on level 2
        let (mut game, adventurer_id) = new_adventurer_lvl2(1003, 1696201757, 0);

        // perform upgrade
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 1, vitality: 0, intelligence: 0, wisdom: 0, charisma: 0, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades.clone(), shopping_cart.clone());

        // go exploring
        game.explore(adventurer_id, true);

        // upgrade
        game.upgrade(adventurer_id, 0, stat_upgrades.clone(), shopping_cart.clone());

        // go exploring
        game.explore(adventurer_id, true);

        // verify we found a beast
        let updated_adventurer = game.get_adventurer(adventurer_id);
        assert(updated_adventurer.beast_health != 0, 'should have found a beast');

        // flee from beast
        game.flee(adventurer_id, true);
        let updated_adventurer = game.get_adventurer(adventurer_id);
        assert(
            updated_adventurer.beast_health == 0 || updated_adventurer.health == 0, 'flee or die'
        );
    }

    #[test]
    #[should_panic(expected: ('Stat upgrade available',))]
    #[available_gas(7800000000)]
    fn test_explore_not_allowed_with_avail_stat_upgrade() {
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        // take out starter beast
        game.attack(adventurer_id, false);

        // get updated adventurer
        let updated_adventurer = game.get_adventurer(adventurer_id);

        // assert adventurer is now level 2 and has 1 stat upgrade available
        assert(updated_adventurer.get_level() == 2, 'advntr should be lvl 2');
        assert(updated_adventurer.stat_upgrades_available == 1, 'advntr should have 1 stat avl');

        // verify adventurer is unable to explore with stat upgrade available
        // this test is annotated to expect a panic so if it doesn't, this test will fail
        game.explore(adventurer_id, true);
    }

    #[test]
    #[should_panic(expected: ('level seed not set',))]
    fn test_buy_items_during_battle() {
        // mint new adventurer (will start in battle with starter beast)
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        // get valid item from market
        let market_items = @game.get_market(adventurer_id);
        let item_id = *market_items.at(0);

        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();
        shopping_cart.append(ItemPurchase { item_id: item_id, equip: true });

        // attempt to buy item during battle - should_panic with message 'Action not allowed in
        // battle'
        // this test is annotated to expect a panic so if it doesn't, this test will fail
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);
    }

    #[test]
    #[should_panic(expected: ('Market is closed',))]
    #[available_gas(73000000)]
    fn test_buy_items_without_stat_upgrade() {
        // mint adventurer and advance to level 2
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // get valid item from market
        let market_items = @game.get_market(adventurer_id);
        let item_id = *market_items.at(0);
        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();

        shopping_cart.append(ItemPurchase { item_id: item_id, equip: true });

        // upgrade adventurer and don't buy anything
        let mut empty_shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, empty_shopping_cart.clone());

        // after upgrade try to buy item
        // should panic with message 'Market is closed'
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);
    }

    #[test]
    #[should_panic(expected: ('Item already owned',))]
    fn test_buy_duplicate_item_equipped() {
        // start new game on level 2 so we have access to the market
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // get items from market
        let market_items = @game.get_market(adventurer_id);

        // get first item on the market
        let item_id = *market_items.at(3);
        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();
        shopping_cart.append(ItemPurchase { item_id: item_id, equip: true });
        shopping_cart.append(ItemPurchase { item_id: item_id, equip: true });

        // submit an upgrade with duplicate items in the shopping cart
        // 'Item already owned' which is annotated in the test
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);
    }

    #[test]
    #[should_panic(expected: ('Item already owned',))]
    #[available_gas(61000000)]
    fn test_buy_duplicate_item_bagged() {
        // start new game on level 2 so we have access to the market
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // get items from market
        let market_items = @game.get_market(adventurer_id);

        // try to buy same item but equip one and put one in bag
        let item_id = *market_items.at(0);
        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();
        shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
        shopping_cart.append(ItemPurchase { item_id: item_id, equip: true });

        // should throw 'Item already owned' panic
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);
    }

    #[test]
    #[should_panic(expected: ('Market item does not exist',))]
    #[available_gas(65000000)]
    fn test_buy_item_not_on_market() {
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);
        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();
        shopping_cart.append(ItemPurchase { item_id: 255, equip: false });
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);
    }

    #[test]
    #[available_gas(65000000)]
    fn test_buy_and_bag_item() {
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);
        let market_items = @game.get_market(adventurer_id);
        let item_id = *market_items.at(0);
        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();
        shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);
        let bag = game.get_bag(adventurer_id);
        assert(bag.item_1.id == *market_items.at(0), 'item should be in bag');
    }

    #[test]
    #[available_gas(71000000)]
    fn test_buy_items() {
        // start game on level 2 so we have access to the market
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // get items from market
        let market_items = @game.get_market(adventurer_id);

        let mut purchased_weapon: u8 = 0;
        let mut purchased_chest: u8 = 0;
        let mut purchased_waist: u8 = 0;
        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();

        let mut i: u32 = 0;
        loop {
            if i == market_items.len() {
                break ();
            }
            let market_item_id = *market_items.at(i);
            let market_item_tier = ImplLoot::get_tier(market_item_id);

            if (market_item_tier != Tier::T5 && market_item_tier != Tier::T4) {
                i += 1;
                continue;
            }

            let market_item_slot = ImplLoot::get_slot(market_item_id);

            // if the item is a weapon and we haven't purchased a weapon yet
            // and the item is a tier 4 or 5 item
            // repeat this for everything
            if (market_item_slot == Slot::Weapon && purchased_weapon == 0 && market_item_id != 12) {
                shopping_cart.append(ItemPurchase { item_id: market_item_id, equip: true });
                purchased_weapon = market_item_id;
            } else if (market_item_slot == Slot::Chest && purchased_chest == 0) {
                shopping_cart.append(ItemPurchase { item_id: market_item_id, equip: true });
                purchased_chest = market_item_id;
            } else if (market_item_slot == Slot::Waist && purchased_waist == 0) {
                shopping_cart.append(ItemPurchase { item_id: market_item_id, equip: false });
                purchased_waist = market_item_id;
            }
            i += 1;
        };

        // verify we have at least two items in shopping cart
        let shopping_cart_length = shopping_cart.len();
        assert(shopping_cart_length > 1, 'need more items to buy');

        // buy items in shopping cart
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart.clone());

        // get updated adventurer and bag state
        let bag = game.get_bag(adventurer_id);
        let adventurer = game.get_adventurer(adventurer_id);

        let mut buy_and_equip_tested = false;
        let mut buy_and_bagged_tested = false;

        // iterate over the items we bought
        let mut i: u32 = 0;
        loop {
            if i == shopping_cart.len() {
                break ();
            }
            let item_purchase = *shopping_cart.at(i);

            // if the item was purchased with equip flag set to true
            if item_purchase.equip {
                // assert it's equipped
                assert(
                    adventurer.equipment.is_equipped(item_purchase.item_id), 'item not equipped'
                );
                buy_and_equip_tested = true;
            } else {
                // if equip was false, verify item is in bag
                let (contains, _) = bag.contains(item_purchase.item_id);
                assert(contains, 'item not in bag');
                buy_and_bagged_tested = true;
            }
            i += 1;
        };

        assert(buy_and_equip_tested, 'did not test buy and equip');
        assert(buy_and_bagged_tested, 'did not test buy and bag');
    }

    #[test]
    #[should_panic(expected: ('Item not in bag',))]
    #[available_gas(26022290)]
    fn test_equip_not_in_bag() {
        // start new game
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        // initialize an array of items to equip that contains an item not in bag
        let mut items_to_equip = ArrayTrait::<u8>::new();
        items_to_equip.append(1);

        // try to equip the item which is not in bag
        // this should result in a panic 'Item not in bag' which is
        // annotated in the test
        game.equip(adventurer_id, items_to_equip);
    }

    #[test]
    #[should_panic(expected: ('Too many items',))]
    #[available_gas(26000000)]
    fn test_equip_too_many_items() {
        // start new game
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        // initialize an array of 9 items (too many to equip)
        let mut items_to_equip = ArrayTrait::<u8>::new();
        items_to_equip.append(1);
        items_to_equip.append(2);
        items_to_equip.append(3);
        items_to_equip.append(4);
        items_to_equip.append(5);
        items_to_equip.append(6);
        items_to_equip.append(7);
        items_to_equip.append(8);
        items_to_equip.append(9);

        // try to equip the 9 items
        // this should result in a panic 'Too many items' which is
        // annotated in the test
        game.equip(adventurer_id, items_to_equip);
    }

    #[test]
    fn test_equip() {
        // start game on level 2 so we have access to the market
        let (mut game, adventurer_id) = new_adventurer_lvl2(1002, 1696201757, 0);

        // get items from market
        let market_items = @game.get_market(adventurer_id);

        let mut purchased_weapon: u8 = 0;
        let mut purchased_chest: u8 = 0;
        let mut purchased_head: u8 = 0;
        let mut purchased_waist: u8 = 0;
        let mut purchased_foot: u8 = 0;
        let mut purchased_hand: u8 = 0;
        let mut purchased_ring: u8 = 0;
        let mut purchased_items = ArrayTrait::<u8>::new();
        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();

        let mut i: u32 = 0;
        loop {
            if i == market_items.len() {
                break ();
            }
            let item_id = *market_items.at(i);
            let item_slot = ImplLoot::get_slot(item_id);
            let item_tier = ImplLoot::get_tier(item_id);

            // if the item is a weapon and we haven't purchased a weapon yet
            // and the item is a tier 4 or 5 item
            // repeat this for everything
            if (item_slot == Slot::Weapon
                && (item_tier == Tier::T5 || item_tier == Tier::T4)
                && purchased_weapon == 0
                && item_id != 12) {
                purchased_items.append(item_id);
                shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
                purchased_weapon = item_id;
            } else if (item_slot == Slot::Chest
                && (item_tier == Tier::T5 || item_tier == Tier::T4)
                && purchased_chest == 0) {
                purchased_items.append(item_id);
                shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
                purchased_chest = item_id;
            } else if (item_slot == Slot::Head && item_tier == Tier::T5 && purchased_head == 0) {
                purchased_items.append(item_id);
                shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
                purchased_head = item_id;
            } else if (item_slot == Slot::Waist && item_tier == Tier::T5 && purchased_waist == 0) {
                purchased_items.append(item_id);
                shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
                purchased_waist = item_id;
            } else if (item_slot == Slot::Foot && item_tier == Tier::T5 && purchased_foot == 0) {
                purchased_items.append(item_id);
                shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
                purchased_foot = item_id;
            } else if (item_slot == Slot::Hand && item_tier == Tier::T5 && purchased_hand == 0) {
                purchased_items.append(item_id);
                shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
                purchased_hand = item_id;
            } else if (item_slot == Slot::Ring && purchased_ring == 0 && item_tier == Tier::T3) {
                purchased_items.append(item_id);
                shopping_cart.append(ItemPurchase { item_id: item_id, equip: false });
                purchased_ring = item_id;
            }
            i += 1;
        };

        let purchased_items_span = purchased_items.span();

        // verify we have at least 2 items in our shopping cart
        assert(shopping_cart.len() >= 2, 'insufficient item purchase');
        // buy items
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);

        // get bag from storage
        let bag = game.get_bag(adventurer_id);

        let mut items_to_equip = ArrayTrait::<u8>::new();
        // iterate over the items we bought
        let mut i: u32 = 0;
        loop {
            if i == purchased_items_span.len() {
                break ();
            }
            // verify they are all in our bag
            let (contains, _) = bag.contains(*purchased_items_span.at(i));
            assert(contains, 'item should be in bag');
            items_to_equip.append(*purchased_items_span.at(i));
            i += 1;
        };

        // equip all of the items we bought
        game.equip(adventurer_id, items_to_equip.clone());

        // get update bag from storage
        let bag = game.get_bag(adventurer_id);

        /// get updated adventurer
        let adventurer = game.get_adventurer(adventurer_id);

        // iterate over the items we equipped
        let mut i: u32 = 0;
        loop {
            if i == items_to_equip.len() {
                break ();
            }
            let (contains, _) = bag.contains(*purchased_items_span.at(i));
            // verify they are no longer in bag
            assert(!contains, 'item should not be in bag');
            // and equipped on the adventurer
            assert(
                adventurer.equipment.is_equipped(*purchased_items_span.at(i)),
                'item should be equipped1'
            );
            i += 1;
        };
    }

    #[test]
    #[available_gas(100000000)]
    fn test_buy_potions() {
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // get updated adventurer state
        let adventurer = game.get_adventurer(adventurer_id);

        // store original adventurer health and gold before buying potion
        let adventurer_health_pre_potion = adventurer.health;
        let adventurer_gold_pre_potion = adventurer.gold;

        // buy potions
        let number_of_potions = 1;
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 1, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 0, luck: 0
        };
        game.upgrade(adventurer_id, number_of_potions, stat_upgrades, shopping_cart);

        // get updated adventurer stat
        let adventurer = game.get_adventurer(adventurer_id);
        // verify potion increased health by POTION_HEALTH_AMOUNT or adventurer health is full
        assert(
            adventurer.health == adventurer_health_pre_potion
                + (POTION_HEALTH_AMOUNT.into() * number_of_potions.into()),
            'potion did not give health'
        );

        // verify potion cost reduced adventurers gold balance
        assert(adventurer.gold < adventurer_gold_pre_potion, 'potion cost is wrong');
    }

    #[test]
    #[should_panic(expected: ('Health already full',))]
    #[available_gas(450000000)]
    fn test_buy_potions_exceed_max_health() {
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // get updated adventurer state
        let adventurer = game.get_adventurer(adventurer_id);

        // get number of potions required to reach full health
        let potions_to_full_health: u8 = (POTION_HEALTH_AMOUNT.into()
            / (adventurer.stats.get_max_health() - adventurer.health))
            .try_into()
            .unwrap();

        // attempt to buy one more potion than is required to reach full health
        // this should result in a panic 'Health already full'
        // this test is annotated to expect that panic
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let potions = potions_to_full_health + 1;
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, potions, stat_upgrades, shopping_cart);
    }

    #[test]
    #[should_panic(expected: ('Market is closed',))]
    #[available_gas(100000000)]
    fn test_cant_buy_potion_without_stat_upgrade() {
        // deploy and start new game
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // upgrade adventurer
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart.clone());

        // then try to buy potions (should panic with 'Market is closed')
        let potions = 1;
        game.upgrade(adventurer_id, potions, stat_upgrades, shopping_cart);
    }

    #[test]
    #[should_panic(expected: ('Action not allowed in battle',))]
    #[available_gas(100000000)]
    fn test_cant_buy_potion_during_battle() {
        // deploy and start new game
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        // attempt to immediately buy health before clearing starter beast
        // this should result in contract throwing a panic 'Action not allowed in battle'
        // This test is annotated to expect that panic
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let potions = 1;
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, potions, stat_upgrades, shopping_cart);
    }

    #[test]
    fn test_get_potion_price_underflow() {
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);
        let potion_price = game.get_potion_price(adventurer_id);
        let adventurer_level = game.get_adventurer(adventurer_id).get_level();
        assert(
            potion_price == BASE_POTION_PRICE.into() * adventurer_level.into(),
            'wrong lvl1 potion price'
        );

        // defeat starter beast and advance to level 2
        game.attack(adventurer_id, true);

        // get level 2 potion price
        let potion_price = game.get_potion_price(adventurer_id);
        let mut adventurer = game.get_adventurer(adventurer_id);
        let adventurer_level = adventurer.get_level();

        // verify potion price
        assert(
            potion_price == (BASE_POTION_PRICE.into() * adventurer_level.into())
                - adventurer.stats.charisma.into(),
            'wrong lvl2 potion price'
        );
    }
    fn already_owned(item_id: u8, adventurer: Adventurer, bag: Bag) -> bool {
        item_id == adventurer.equipment.weapon.id
            || item_id == adventurer.equipment.chest.id
            || item_id == adventurer.equipment.head.id
            || item_id == adventurer.equipment.waist.id
            || item_id == adventurer.equipment.foot.id
            || item_id == adventurer.equipment.hand.id
            || item_id == adventurer.equipment.ring.id
            || item_id == adventurer.equipment.neck.id
            || item_id == bag.item_1.id
            || item_id == bag.item_2.id
            || item_id == bag.item_3.id
            || item_id == bag.item_4.id
            || item_id == bag.item_5.id
            || item_id == bag.item_6.id
            || item_id == bag.item_7.id
            || item_id == bag.item_8.id
            || item_id == bag.item_9.id
            || item_id == bag.item_10.id
            || item_id == bag.item_11.id
            || item_id == bag.item_12.id
            || item_id == bag.item_13.id
            || item_id == bag.item_14.id
            || item_id == bag.item_15.id
    }

    #[test]
    #[available_gas(83000000)]
    fn test_drop_item() {
        // start new game on level 2 so we have access to the market
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // get items from market
        let market_items = @game.get_market(adventurer_id);

        // get first item on the market
        let purchased_item_id = *market_items.at(0);
        let mut shopping_cart = ArrayTrait::<ItemPurchase>::new();
        shopping_cart.append(ItemPurchase { item_id: purchased_item_id, equip: false });

        // buy first item on market and bag it
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);

        // get adventurer state
        let adventurer = game.get_adventurer(adventurer_id);
        // get bag state
        let bag = game.get_bag(adventurer_id);

        // assert adventurer has starting weapon equipped
        assert(adventurer.equipment.weapon.id != 0, 'adventurer should have weapon');
        // assert bag has the purchased item
        let (contains, _) = bag.contains(purchased_item_id);
        assert(contains, 'item should be in bag');

        // create drop list consisting of adventurers equipped weapon and purchased item that is in
        // bag
        let mut drop_list = ArrayTrait::<u8>::new();
        drop_list.append(adventurer.equipment.weapon.id);
        drop_list.append(purchased_item_id);

        // call contract drop
        game.drop(adventurer_id, drop_list);

        // get adventurer state
        let adventurer = game.get_adventurer(adventurer_id);
        // get bag state
        let bag = game.get_bag(adventurer_id);

        // assert adventurer has no weapon equipped
        assert(adventurer.equipment.weapon.id == 0, 'weapon id should be 0');
        assert(adventurer.equipment.weapon.xp == 0, 'weapon should have no xp');

        // assert bag does not have the purchased item
        let (contains, _) = bag.contains(purchased_item_id);
        assert(!contains, 'item should not be in bag');
    }

    #[test]
    #[should_panic(expected: ('Item not owned by adventurer',))]
    #[available_gas(90000000)]
    fn test_drop_item_without_ownership() {
        // start new game on level 2 so we have access to the market
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // intialize an array with 20 items in it
        let mut drop_list = ArrayTrait::<u8>::new();
        drop_list.append(255);

        // try to drop an item the adventurer doesn't own
        // this should result in a panic 'Item not owned by adventurer'
        // this test is annotated to expect that panic
        game.drop(adventurer_id, drop_list);
    }

    #[test]
    #[available_gas(75000000)]
    fn test_upgrade_stats() {
        // deploy and start new game
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // get adventurer state
        let adventurer = game.get_adventurer(adventurer_id);
        let original_charisma = adventurer.stats.charisma;

        // call upgrade_stats with stat upgrades
        // TODO: test with more than one which is challenging
        // because we need a multi-level or G20 stat unlocks
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);

        // get update adventurer state
        let adventurer = game.get_adventurer(adventurer_id);

        // assert charisma was increased
        assert(adventurer.stats.charisma == original_charisma + 1, 'charisma not increased');
        // assert stat point was used
        assert(adventurer.stat_upgrades_available == 0, 'should have used stat point');
    }

    #[test]
    #[should_panic(expected: ('insufficient stat upgrades',))]
    #[available_gas(70000000)]
    fn test_upgrade_stats_not_enough_points() {
        // deploy and start new game
        let (mut game, adventurer_id) = new_adventurer_lvl2(1000, 1696201757, 0);

        // try to upgrade charisma x2 with only 1 stat available
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 2, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart);
    }

    #[test]
    #[available_gas(75000000)]
    fn test_upgrade_adventurer() {
        // deploy and start new game
        let (mut game, adventurer_id) = new_adventurer_lvl2(1006, 1696201757, 0);

        // get original adventurer state
        let adventurer = game.get_adventurer(adventurer_id);
        let original_charisma = adventurer.stats.charisma;
        let original_health = adventurer.health;

        // buy a potion
        let potions = 1;

        // buy two items
        let market_inventory = @game.get_market(adventurer_id);
        let mut items_to_purchase = ArrayTrait::<ItemPurchase>::new();
        let purchase_and_equip = ItemPurchase { item_id: *market_inventory.at(4), equip: true };
        let purchase_and_not_equip = ItemPurchase {
            item_id: *market_inventory.at(3), equip: false
        };
        items_to_purchase.append(purchase_and_equip);
        items_to_purchase.append(purchase_and_not_equip);

        // stat upgrades
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };

        // call upgrade
        game.upgrade(adventurer_id, potions, stat_upgrades, items_to_purchase);

        // get updated adventurer state
        let adventurer = game.get_adventurer(adventurer_id);

        // assert health was increased by one potion
        assert(
            adventurer.health == original_health + POTION_HEALTH_AMOUNT.into(),
            'health not increased'
        );
        // assert charisma was increased
        assert(adventurer.stats.charisma == original_charisma + 1, 'charisma not increased');
        // assert stat point was used
        assert(adventurer.stat_upgrades_available == 0, 'should have used stat point');
        // assert adventurer has the purchased items
        assert(
            adventurer.equipment.is_equipped(purchase_and_equip.item_id),
            'purchase should be equipped'
        );
        assert(
            !adventurer.equipment.is_equipped(purchase_and_not_equip.item_id),
            'purchase should not be equipped'
        );
    }

    fn _calculate_payout(bp: u256, price: u128) -> u256 {
        (bp * price.into()) / 1000
    }

    // TODO: re-enable this test once we move to Foundry
    // #[test]
    // #[available_gas(90000000)]
    // fn test_bp_distribution() {
    //     let (_, lords) = new_adventurer_with_lords(1000);

    //     // stage 0
    //     assert(lords.balance_of(DAO()) == COST_TO_PLAY.into(), 'wrong stage 1 balance');

    //     // stage 1
    //     start_cheat_block_number_global(1001 + BLOCKS_IN_A_WEEK * 2);

    //     // spawn new

    //     // DAO doesn't get anything more until stage 2
    //     assert(lords.balance_of(DAO()) == COST_TO_PLAY.into(), 'wrong stage 1 balance');

    //     let mut _rewards = Rewards {
    //         BIBLIO: _calculate_payout(REWARD_DISTRIBUTIONS_BP::CREATOR, COST_TO_PLAY),
    //         PG: _calculate_payout(REWARD_DISTRIBUTIONS_BP::CREATOR, COST_TO_PLAY),
    //         CLIENT_PROVIDER: _calculate_payout(
    //             REWARD_DISTRIBUTIONS_BP::CLIENT_PROVIDER, COST_TO_PLAY
    //         ),
    //         FIRST_PLACE: _calculate_payout(REWARD_DISTRIBUTIONS_BP::FIRST_PLACE, COST_TO_PLAY),
    //         SECOND_PLACE: _calculate_payout(REWARD_DISTRIBUTIONS_BP::SECOND_PLACE, COST_TO_PLAY),
    //         THIRD_PLACE: _calculate_payout(REWARD_DISTRIBUTIONS_BP::THIRD_PLACE, COST_TO_PLAY)
    //     };
    // // week.FIRST_PLACE.print();

    // // assert(lords.balance_of(DAO()) == COST_TO_PLAY, 'wrong DAO payout');
    // // assert(week.INTERFACE == 0, 'no payout in stage 1');
    // // assert(week.FIRST_PLACE == _calculate_payout(
    // //         REWARD_DISTRIBUTIONS_PHASE1_BP::FIRST_PLACE, cost_to_play
    // //     ), 'wrong FIRST_PLACE payout 1');
    // // assert(week.SECOND_PLACE == 0x6f05b59d3b200000, 'wrong SECOND_PLACE payout 1');
    // // assert(week.THIRD_PLACE == 0x6f05b59d3b20000, 'wrong THIRD_PLACE payout 1');

    // // (COST_TO_PLAY * 11 / 10).print();
    // // (COST_TO_PLAY * 9 / 10).print();
    // }

    // TODO
    // #[test]
    // #[available_gas(9000000000)]
    // fn test_update_cost_to_play() {}

    #[test]
    #[available_gas(9000000000)]
    #[should_panic(expected: ('terminal time reached',))]
    fn test_terminal_timestamp_reached() {
        let starting_block = 1;
        let starting_timestamp = 1;
        let terminal_timestamp = 100;
        let (mut game, _, _, _, _, _, _) = deploy_game(
            starting_block, starting_timestamp, terminal_timestamp, 0
        );

        // add a player to the game
        add_adventurer_to_game(ref game, 0, ItemId::Wand);
        // advance blockchain timestamp beyond terminal timestamp
        start_cheat_block_timestamp_global(terminal_timestamp + 1);

        // try to start a new game
        // should panic with 'terminal time reached'
        // which test is annotated to expect
        add_adventurer_to_game(ref game, 0, ItemId::Wand);
    }

    #[test]
    #[available_gas(9000000000)]
    fn test_terminal_timestamp_not_set() {
        let starting_block = 1;
        let starting_timestamp = 1;
        let terminal_timestamp = 0;
        let (mut game, _, _, _, _, _, _) = deploy_game(
            starting_block, starting_timestamp, terminal_timestamp, 0
        );

        // add a player to the game
        add_adventurer_to_game(ref game, 0, ItemId::Wand);

        // advance blockchain timestamp to max u64
        let max_u64_timestamp = 18446744073709551615;
        start_cheat_block_timestamp_global(max_u64_timestamp);

        // verify we can still start a new game
        add_adventurer_to_game(ref game, 0, ItemId::Wand);
    }

    #[test]
    #[available_gas(9000000000)]
    fn test_golden_token_new_game() {
        let starting_block = 364063;
        let starting_timestamp = 1698678554;
        let terminal_timestamp = 0;
        let (mut game, _, _, _, _, _, _) = deploy_game(
            starting_block, starting_timestamp, terminal_timestamp, 0
        );
        add_adventurer_to_game(ref game, 1, ItemId::Wand);
        start_cheat_block_timestamp_global(starting_timestamp + DAY);
        add_adventurer_to_game(ref game, 1, ItemId::Wand);
    }

    // TODO: re-enable this test once we move to Foundry
    // #[test]
    // #[available_gas(9000000000)]
    // fn test_golden_token_can_play() {
    //     let golden_token_id = 1;
    //     let starting_block = 364063;
    //     let starting_timestamp = 1698678554;
    //     let terminal_timestamp = 0;
    //     let (mut game, _, _, _, _, _, _) = deploy_game(starting_block, starting_timestamp,
    //     terminal_timestamp, 0);
    //     assert(game.can_play(1), 'should be able to play');
    //     add_adventurer_to_game(ref game, golden_token_id, ItemId::Wand);
    //     assert(!game.can_play(1), 'should not be able to play');
    //     start_cheat_block_timestamp_global(starting_timestamp + DAY);
    //     assert(game.can_play(1), 'should be able to play again');
    // }

    // TODO: re-enable this test once we move to Foundry
    // #[test]
    // #[available_gas(9000000000)]
    // #[should_panic(
    //     expected: ('ERC721: invalid token ID', 'ENTRYPOINT_FAILED', 'ENTRYPOINT_FAILED')
    // )]
    // fn test_golden_token_unminted_token() {
    //     let golden_token_id = 500;
    //     let starting_block = 364063;
    //     let starting_timestamp = 1698678554;
    //     let terminal_timestamp = 0;
    //     let (mut game, _, _, _, _, _, _) = deploy_game(starting_block, starting_timestamp,
    //     terminal_timestamp, 0);
    //     add_adventurer_to_game(ref game, golden_token_id, ItemId::Wand);
    // }

    // TODO: re-enable this test once we move to Foundry
    // #[test]
    // #[available_gas(9000000000)]
    // #[should_panic(expected: ('Token already used today',  ))]
    // fn test_golden_token_double_play() {
    //     let golden_token_id = 1;
    //     let starting_block = 364063;
    //     let starting_timestamp = 1698678554;
    //     let terminal_timestamp = 0;
    //     let (mut game, _, _, _, _, _, _) = deploy_game(starting_block, starting_timestamp,
    //     terminal_timestamp, 0);
    //     add_adventurer_to_game(ref game, golden_token_id, ItemId::Wand);

    //     // roll blockchain forward 1 second less than a day
    //     start_cheat_block_timestamp_global(starting_timestamp + (DAY - 1));

    //     // try to play again with golden token which should cause panic
    //     add_adventurer_to_game(ref game, golden_token_id, ItemId::Wand);
    // }

    #[test]
    #[should_panic(expected: ('Cant drop during starter beast',))]
    fn test_no_dropping_starter_weapon_during_starter_beast() {
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);

        // try to drop starter weapon during starter beast battle
        let mut drop_items = array![ItemId::Wand];
        game.drop(adventurer_id, drop_items);
    }

    #[test]
    fn test_drop_starter_item_after_starter_beast() {
        let (mut game, adventurer_id) = new_adventurer(1000, 1696201757);
        game.attack(adventurer_id, true);

        // try to drop starter weapon during starter beast battle
        let mut drop_items = array![ItemId::Wand];
        game.drop(adventurer_id, drop_items);
    }

    #[test]
    fn test_different_starter_beasts() {
        let starting_block = 364063;
        let starting_timestamp = 1698678554;
        let (mut game, _, _, _, _, _, _) = deploy_game(starting_block, starting_timestamp, 0, 0);
        let mut game_count = game.get_game_count();
        assert(game_count == 3, 'game count should be 3');

        let player1 = add_adventurer_to_game(ref game, 0, ItemId::Wand);
        let starter_beast_game_one = game.get_attacking_beast(player1).id;

        let player2 = add_adventurer_to_game(ref game, 0, ItemId::Wand);
        let starter_beast_game_two = game.get_attacking_beast(player2).id;

        let player3 = add_adventurer_to_game(ref game, 0, ItemId::Wand);
        let starter_beast_game_three = game.get_attacking_beast(player3).id;

        let player4 = add_adventurer_to_game(ref game, 0, ItemId::Wand);
        let starter_beast_game_four = game.get_attacking_beast(player4).id;

        let player5 = add_adventurer_to_game(ref game, 0, ItemId::Wand);
        let starter_beast_game_five = game.get_attacking_beast(player5).id;

        let player6 = add_adventurer_to_game(ref game, 0, ItemId::Wand);
        let starter_beast_game_six = game.get_attacking_beast(player6).id;

        // assert all games starting with a Wand get a T5 Brute for starter beast
        assert(
            starter_beast_game_one >= BeastId::Troll && starter_beast_game_one <= BeastId::Skeleton,
            'wrong starter beast game 1'
        );
        assert(
            starter_beast_game_two >= BeastId::Troll && starter_beast_game_two <= BeastId::Skeleton,
            'wrong starter beast game 2'
        );
        assert(
            starter_beast_game_three >= BeastId::Troll
                && starter_beast_game_three <= BeastId::Skeleton,
            'wrong starter beast game 3'
        );
        assert(
            starter_beast_game_four >= BeastId::Troll
                && starter_beast_game_four <= BeastId::Skeleton,
            'wrong starter beast game 4'
        );
        assert(
            starter_beast_game_five >= BeastId::Troll
                && starter_beast_game_five <= BeastId::Skeleton,
            'wrong starter beast game 5'
        );

        // assert first five games are all unique
        assert(starter_beast_game_one != starter_beast_game_two, 'same starter beast game 1 & 2');
        assert(starter_beast_game_one != starter_beast_game_three, 'same starter beast game 1 & 3');
        assert(starter_beast_game_one != starter_beast_game_four, 'same starter beast game 1 & 4');
        assert(starter_beast_game_one != starter_beast_game_five, 'same starter beast game 1 & 5');
        assert(starter_beast_game_two != starter_beast_game_three, 'same starter beast game 2 & 3');
        assert(starter_beast_game_two != starter_beast_game_four, 'same starter beast game 2 & 4');
        assert(starter_beast_game_two != starter_beast_game_five, 'same starter beast game 2 & 5');
        assert(
            starter_beast_game_three != starter_beast_game_four, 'same starter beast game 3 & 4'
        );
        assert(
            starter_beast_game_three != starter_beast_game_five, 'same starter beast game 3 & 5'
        );
        assert(starter_beast_game_four != starter_beast_game_five, 'same starter beast game 4 & 5');

        // sixth game wraps around and gets same beast as the first game
        assert(starter_beast_game_one == starter_beast_game_six, 'game 1 and 6 should be same');

        // Assert Book start gets T5 Brutes
        add_adventurer_to_game(ref game, 0, ItemId::Book);
        game_count = game.get_game_count();
        let starter_beast_book_start = game.get_attacking_beast(game_count).id;
        assert(game_count == 10, 'game count should be 10');
        assert(
            starter_beast_book_start >= BeastId::Troll
                && starter_beast_book_start <= BeastId::Skeleton,
            'wrong starter beast for book'
        );

        // Assert Club start gets T5 Hunter
        add_adventurer_to_game(ref game, 0, ItemId::Club);
        game_count = game.get_game_count();
        let starter_beast_club_start = game.get_attacking_beast(game_count).id;
        assert(game_count == 11, 'game count should be 11');
        assert(
            starter_beast_club_start >= BeastId::Bear && starter_beast_club_start <= BeastId::Rat,
            'wrong starter beast for club'
        );

        // Assert Club start gets T5 Hunter
        add_adventurer_to_game(ref game, 0, ItemId::ShortSword);
        game_count = game.get_game_count();
        let starter_beast_sword_start = game.get_attacking_beast(game_count).id;
        assert(game_count == 12, 'game count should be 12');
        assert(
            starter_beast_sword_start >= BeastId::Fairy
                && starter_beast_sword_start <= BeastId::Gnome,
            'wrong starter beast for sword'
        );
    }

    fn transfer_ownership(
        mut game: IGameDispatcher,
        from: ContractAddress,
        to: ContractAddress,
        adventurer_id: felt252
    ) {
        // Some weird conflict when using the game interface ?? using direct ERC721Dispatcher for
        // now. This is not a problem in blockexplorers, I suspect issue in Scarb compiler.
        IERC721Dispatcher { contract_address: game.contract_address }
            .transfer_from(from, to, adventurer_id.into());
    }

    #[test]
    fn test_transfered_attack() {
        let (mut game, adventurer_id) = new_adventurer(364063, 1698678554);
        transfer_ownership(game, OWNER(), OWNER_TWO(), adventurer_id);
        start_cheat_caller_address_global(OWNER_TWO());
        game.attack(adventurer_id, false);
    }


    #[test]
    #[should_panic(expected: ('Not authorized to act',))]
    fn test_original_owner_attack() {
        let (mut game, adventurer_id) = new_adventurer(364063, 1698678554);
        transfer_ownership(game, OWNER(), OWNER_TWO(), adventurer_id);
        game.attack(adventurer_id, false);
    }


    #[test]
    #[should_panic(expected: ('Not authorized to act',))]
    fn test_original_owner_upgrade() {
        let (mut game, adventurer_id) = new_adventurer_lvl2(364063, 1698678554, 0);
        transfer_ownership(game, OWNER(), OWNER_TWO(), adventurer_id);

        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart.clone());
    }

    #[test]
    #[should_panic(expected: ('Not authorized to act',))]
    fn test_original_owner_explore() {
        let (mut game, adventurer_id) = new_adventurer_lvl2(364063, 1698678554, 0);
        transfer_ownership(game, OWNER(), OWNER_TWO(), adventurer_id);
        start_cheat_caller_address_global(OWNER_TWO());

        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart.clone());

        start_cheat_caller_address_global(OWNER());

        game.explore(adventurer_id, true);
    }

    #[test]
    #[should_panic(expected: ('Not authorized to act',))]
    fn test_original_owner_flee() {
        let (mut game, adventurer_id) = new_adventurer_lvl2(364063, 1698678554, 0);
        transfer_ownership(game, OWNER(), OWNER_TWO(), adventurer_id);
        start_cheat_caller_address_global(OWNER_TWO());

        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades, shopping_cart.clone());

        // go explore
        game.explore(adventurer_id, true);

        start_cheat_caller_address_global(OWNER());

        game.flee(adventurer_id, true);
    }


    #[test]
    fn test_transfered_upgrade_explore_flee() {
        let (mut game, adventurer_id) = new_adventurer_lvl2(123, 1696201757, 0);
        transfer_ownership(game, OWNER(), OWNER_TWO(), adventurer_id);
        start_cheat_caller_address_global(OWNER_TWO());

        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 1, vitality: 0, intelligence: 0, wisdom: 0, charisma: 0, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades.clone(), shopping_cart.clone());

        // go explore
        game.explore(adventurer_id, true);
        game.upgrade(adventurer_id, 0, stat_upgrades.clone(), shopping_cart.clone());
        game.explore(adventurer_id, true);
        game.flee(adventurer_id, true);
    }

    // verify tokens transferred to transfered owner not original owner
    #[test]
    fn test_transfered_transfer() {
        let (mut game, adventurer_id) = new_adventurer(364063, 1698678554);
        transfer_ownership(game, OWNER(), OWNER_TWO(), adventurer_id);
    }

    #[test]
    fn test_set_adventurer_obituary() {
        let mut state = Game::contract_state_for_testing();
        let adventurer_id = 1;

        // init adventurer with g19 wand
        let mut adventurer = ImplAdventurer::new(ItemId::Wand);

        // kill adventurer
        adventurer.health = 0;
        state._adventurer.write(adventurer_id, adventurer);

        // Set obituary
        let obituary: ByteArray = "Brave adventurer fell to a mighty beast";
        state.set_adventurer_obituary(adventurer_id, obituary.clone());

        // Verify obituary was set
        let stored_obituary = state.get_adventurer_obituary(adventurer_id);
        assert(obituary == stored_obituary, 'Obituary not set correctly');
    }

    #[test]
    #[should_panic(expected: ('obituary already set',))]
    fn test_set_adventurer_obituary_twice() {
        let mut state = Game::contract_state_for_testing();
        let adventurer_id = 1;

        // init adventurer with g19 wand
        let mut adventurer = ImplAdventurer::new(ItemId::Wand);

        // kill adventurer
        adventurer.health = 0;
        state._adventurer.write(adventurer_id, adventurer);

        // attempt to set obituary twice, should panic
        let obituary: ByteArray = "Brave adventurer fell to a mighty beast";
        state.set_adventurer_obituary(adventurer_id, obituary.clone());
        state.set_adventurer_obituary(adventurer_id, obituary.clone());
    }

    #[test]
    #[should_panic(expected: ('obituary window closed',))]
    fn test_set_adventurer_obituary_after_window_closed() {
        let start_time = 100;
        start_cheat_block_timestamp_global(start_time);
        let mut state = Game::contract_state_for_testing();
        let adventurer_id = 1;

        // init adventurer with g19 wand
        let mut adventurer_metadata = ImplAdventurerMetadata::new(0, false, 0, 0);
        adventurer_metadata.death_date = start_time;
        state._adventurer_meta.write(adventurer_id, adventurer_metadata);

        // roll forward blockchain
        let new_time = start_time + OBITUARY_EXPIRY_DAYS.into() * Game::SECONDS_IN_DAY.into() + 100;
        start_cheat_block_timestamp_global(new_time);

        // attempt to set obituary, should panic
        let obituary: ByteArray = "Brave adventurer fell to a mighty beast";
        state.set_adventurer_obituary(adventurer_id, obituary.clone());
    }

    #[test]
    #[should_panic(expected: ('Adventurer is still alive',))]
    fn test_set_adventurer_obituary_still_alive() {
        // deploy_game
        let starting_block = 1000;
        let starting_time = 1696201757;
        let (mut game, _, _, _, _, _, _) = deploy_game(starting_block, starting_time, 0, 0);

        // Create a new adventurer
        let adventurer_id = add_adventurer_to_game(ref game, 0, ItemId::Wand);

        // defeat starter beast
        game.attack(adventurer_id, false);

        // attempt to set obituary
        // should panic
        let obituary: ByteArray = "Brave adventurer fell to a mighty beast";
        game.set_adventurer_obituary(adventurer_id, obituary.clone());
    }

    #[test]
    fn test_dead_adventurer_metadata() {
        // deploy_game
        let starting_block = 1000;
        let starting_time = 1696201757;
        let (mut game, _, _, _, _, _, _) = deploy_game(starting_block, starting_time, 0, 0);

        // Create a new adventurer
        let adventurer_id = add_adventurer_to_game(ref game, 0, ItemId::Wand);

        // defeat starter beast
        game.attack(adventurer_id, false);

        // don't buy anything from market
        let shopping_cart = ArrayTrait::<ItemPurchase>::new();
        let stat_upgrades = Stats {
            strength: 0, dexterity: 0, vitality: 0, intelligence: 0, wisdom: 0, charisma: 1, luck: 0
        };
        game.upgrade(adventurer_id, 0, stat_upgrades.clone(), shopping_cart.clone());
        game.explore(adventurer_id, true);
        game.upgrade(adventurer_id, 0, stat_upgrades.clone(), shopping_cart.clone());
        game.explore(adventurer_id, true);
        let death_date = starting_time + 1000;
        start_cheat_block_timestamp_global(death_date);
        game.attack(adventurer_id, true);
        //game.upgrade(adventurer_id, 0, stat_upgrades.clone(), shopping_cart.clone());
        game.explore(adventurer_id, true);
        game.upgrade(adventurer_id, 0, stat_upgrades.clone(), shopping_cart.clone());
        game.explore(adventurer_id, true);
        game.attack(adventurer_id, true);

        // get updated adventurer state
        let adventurer = game.get_adventurer(adventurer_id);
        // assert adventurer is dead
        assert(adventurer.health == 0, 'Adventurer is still alive');

        // check adventurer metadata to ensure birth date and death date are correct
        let mut metadata = game.get_adventurer_meta(adventurer_id);
        assert(metadata.death_date == death_date, 'Death date not set correctly');
        assert(metadata.birth_date == starting_time, 'Birth date not set correctly');
    }

    #[test]
    fn test_adventurer_death_ranking() {
        let mut state = Game::contract_state_for_testing();

        // Create four adventurers
        let mut adventurer1 = ImplAdventurer::new(ItemId::Wand);
        let mut adventurer2 = ImplAdventurer::new(ItemId::Wand);
        let mut adventurer3 = ImplAdventurer::new(ItemId::Wand);
        let mut adventurer4 = ImplAdventurer::new(ItemId::Wand);
        let mut adventurer5 = ImplAdventurer::new(ItemId::Wand);

        // Set different XP values to create a ranking
        adventurer1.xp = 50;
        adventurer2.xp = 200;
        adventurer3.xp = 300;
        adventurer4.xp = 250;
        adventurer5.xp = 225;

        // Save adventurers to state
        state._adventurer.write(1, adventurer1);
        state._adventurer.write(2, adventurer2);
        state._adventurer.write(3, adventurer3);
        state._adventurer.write(4, adventurer4);
        state._adventurer.write(5, adventurer5);

        // Set metadata for each adventurer
        let current_timestamp = 1000000;
        let mut metadata = AdventurerMetadata {
            birth_date: current_timestamp,
            death_date: 0,
            rank_at_death: 0,
            item_specials_seed: 0,
            level_seed: 0,
            delay_stat_reveal: false,
            golden_token_id: 0,
            launch_tournament_winner_token_id: 0
        };

        state._adventurer_meta.write(1, metadata);
        state._adventurer_meta.write(2, metadata);
        state._adventurer_meta.write(3, metadata);
        state._adventurer_meta.write(4, metadata);
        state._adventurer_meta.write(5, metadata);

        let mut adventurer1 = state._adventurer.read(1);
        _process_adventurer_death(ref state, ref adventurer1, 1, 0, 0, false);

        let mut adventurer2 = state._adventurer.read(2);
        _process_adventurer_death(ref state, ref adventurer2, 2, 0, 0, false);

        let mut adventurer3 = state._adventurer.read(3);
        _process_adventurer_death(ref state, ref adventurer3, 3, 0, 0, false);

        let mut adventurer4 = state._adventurer.read(4);
        _process_adventurer_death(ref state, ref adventurer4, 4, 0, 0, false);

        // Check leaderboard
        let leaderboard = state.get_leaderboard();
        assert(leaderboard.first.adventurer_id.into() == 3, 'P3 should be 1st on LB');
        assert(leaderboard.second.adventurer_id.into() == 4, 'P4 should be 2nd on LB');
        assert(leaderboard.third.adventurer_id.into() == 2, 'P2 should be 3rd on LB');

        // Check rank at death
        let metadata1 = state._adventurer_meta.read(1);
        let metadata2 = state._adventurer_meta.read(2);
        let metadata3 = state._adventurer_meta.read(3);
        let metadata4 = state._adventurer_meta.read(4);

        // adventurer 1 technically finished first but their score wasn't above 100xp
        // so they don't get a qualified rank
        assert(metadata1.rank_at_death == 0, 'P1 should be death rank 0');

        // adventurer 2 finished first and above 100xp so they get a death rank
        assert(metadata2.rank_at_death == 1, 'P2 should be death rank 1');

        // adventurer 3 finished higher than adventurer 2 so they now also get death rank 1
        assert(metadata3.rank_at_death == 1, 'P3 should be death rank 1');

        // verify adventurer 2 is still death rank 1 too
        let metadata2 = state._adventurer_meta.read(2);
        assert(metadata2.rank_at_death == 1, 'P2 should be death rank 1');

        // adventurer 4 finishes above 100xp in 2nd place so they get death rank 2
        assert(metadata4.rank_at_death == 2, 'P4 should be death rank 2');

        // verify adventurer 2 and 3 still have rank 1
        let metadata2 = state._adventurer_meta.read(2);
        let metadata3 = state._adventurer_meta.read(3);
        assert(metadata2.rank_at_death == 1, 'P2 should be death rank 1');
        assert(metadata3.rank_at_death == 1, 'P3 should be death rank 1');

        // adventurer 5 dies and finishes 3rd
        let mut adventurer5 = state._adventurer.read(5);
        _process_adventurer_death(ref state, ref adventurer5, 5, 0, 0, false);

        // check leaderboard
        let leaderboard = state.get_leaderboard();
        assert(leaderboard.first.adventurer_id.into() == 3, 'P3 should be 1st on LB');
        assert(leaderboard.second.adventurer_id.into() == 4, 'P4 should be 2nd on LB');
        assert(leaderboard.third.adventurer_id.into() == 5, 'P5 should be 3rd on LB');

        // assert death rank from meta data
        let metadata5 = state._adventurer_meta.read(5);
        assert(metadata5.rank_at_death == 3, 'P5 should be death rank 3');

        // verify other adventurers still have same death rank
        let metadata1 = state._adventurer_meta.read(1);
        let metadata2 = state._adventurer_meta.read(2);
        let metadata3 = state._adventurer_meta.read(3);
        let metadata4 = state._adventurer_meta.read(4);
        assert(metadata1.rank_at_death == 0, 'P1 should be death rank 0');
        assert(metadata2.rank_at_death == 1, 'P2 should be death rank 1');
        assert(metadata3.rank_at_death == 1, 'P3 should be death rank 1');
        assert(metadata4.rank_at_death == 2, 'P4 should be death rank 2');
    }

    #[test]
    #[should_panic(expected: ('launch tournament has ended',))]
    fn test_genesis_tournament_ended() {
        let starting_block = 1000;
        let mut current_block_time = 1696201757;

        // use one week for launch tournament
        let genesis_tournament_duration = 24 * 60 * 60;
        let (mut game, _, _, _, _, _, _) = deploy_game(
            starting_block, current_block_time, 0, genesis_tournament_duration
        );

        // set block timestamp to one second after the launch tournament end
        start_cheat_block_timestamp_global(
            current_block_time + genesis_tournament_duration + start_delay_seconds + 1
        );
        // try to enter launch tournament should panic
        game
            .enter_launch_tournament(
                12, 123, ZERO_ADDRESS(), false, ZERO_ADDRESS(), 0, ZERO_ADDRESS()
            );
    }

    #[test]
    #[should_panic(expected: ('nft collection not eligible',))]
    fn test_genesis_tournament_nonqualifying_collection() {
        let starting_block = 1000;
        let mut current_block_time = 1696201757;

        // use one week for launch tournament
        let genesis_tournament_duration = 7 * 24 * 60 * 60;
        let (mut game, _, _, _, _, _, _) = deploy_game(
            starting_block, current_block_time, 0, genesis_tournament_duration
        );

        // try to enter launch tournament should panic
        game
            .enter_launch_tournament(
                12, 123, ZERO_ADDRESS(), false, ZERO_ADDRESS(), 0, ZERO_ADDRESS()
            );
    }

    #[test]
    #[should_panic(expected: ('not token owner',))]
    fn test_genesis_tournament_not_token_owner() {
        let starting_block = 1000;
        let mut current_block_time = 1696201757;

        // use one week for launch tournament
        let genesis_tournament_duration = 7 * 24 * 60 * 60;
        let (mut game, _, _, _, _, blobert_dispatcher, _) = deploy_game(
            starting_block, current_block_time, 0, genesis_tournament_duration
        );

        // set caller to a different address than the token owner
        start_cheat_caller_address_global(ARBITRARY_ADDRESS());

        // try to enter tournament with a wallet that doesn't own the qualifying token
        game
            .enter_launch_tournament(
                12,
                123,
                ZERO_ADDRESS(),
                false,
                blobert_dispatcher.contract_address,
                1,
                ZERO_ADDRESS()
            );
    }

    #[test]
    #[should_panic(expected: ('token already registered',))]
    fn test_genesis_tournament_token_already_registered() {
        let starting_block = 1000;
        let mut current_block_time = 1696201757;

        // use one week for launch tournament
        let genesis_tournament_duration = 7 * 24 * 60 * 60;
        let (mut game, _, _, _, _, blobert_dispatcher, _) = deploy_game(
            starting_block, current_block_time, 0, genesis_tournament_duration
        );

        // Enter genesis tournament using token id 1
        game
            .enter_launch_tournament(
                12,
                123,
                ZERO_ADDRESS(),
                false,
                blobert_dispatcher.contract_address,
                1,
                ZERO_ADDRESS()
            );

        // try to enter tournament with the same token id again
        // should panic
        game
            .enter_launch_tournament(
                12,
                123,
                ZERO_ADDRESS(),
                false,
                blobert_dispatcher.contract_address,
                1,
                ZERO_ADDRESS()
            );
    }

    #[test]
    fn test_enter_genesis_tournament_success() {
        let starting_block = 1000;
        let mut current_block_time = 1696201757;

        // use one week for launch tournament
        let genesis_tournament_duration = 7 * 24 * 60 * 60;
        let (mut game, _, _, _, _, blobert_dispatcher, _) = deploy_game(
            starting_block, current_block_time, 0, genesis_tournament_duration
        );

        // Enter genesis tournament using token id 1
        let adventurer_ids = game
            .enter_launch_tournament(
                12,
                123,
                ZERO_ADDRESS(),
                false,
                blobert_dispatcher.contract_address,
                1,
                ZERO_ADDRESS()
            );

        // assert the claim resulted in 1 game being minted
        assert(adventurer_ids.len() == 1, 'Wrong number of adventurer ids');

        // get adventurer id details and assert they are correct
        let adventurer_meta = game.get_adventurer_meta(*adventurer_ids.at(0));
        let adventurer_name = game.get_adventurer_name(*adventurer_ids.at(0));
        let adventurer = game.get_adventurer(*adventurer_ids.at(0));
        assert(adventurer_name == 123, 'Name not set correctly');
        assert(adventurer_meta.birth_date == current_block_time, 'birthdate not set correctly');
        assert(adventurer.equipment.weapon.id == 12, 'Weapon not set correctly');
        assert(adventurer.health == 90, 'Health not set correctly');
    }

    #[test]
    fn test_get_and_set_adventurer_name() {
        let mut state = Game::contract_state_for_testing();
        let mut adventurer = ImplAdventurer::new(ItemId::Wand);
        state._adventurer.write(1, adventurer);
        state._adventurer_name.write(1, 'test1');
        let adventurer_name = state.get_adventurer_name(1);
        assert(adventurer_name == 'test1', 'name not set correctly');

        state.update_adventurer_name(1, 'test2');
        let adventurer_name = state.get_adventurer_name(1);
        assert(adventurer_name == 'test2', 'name not updated correctly');
    }

    #[test]
    fn test_process_item_level_up_item_prefix_unlock() {
        start_cheat_chain_id_global(TESTING_CHAIN_ID);
        let mut state = Game::contract_state_for_testing();
        _set_item_specials_seed(ref state, 1, 123);

        // init adventurer with g19 wand
        let mut adventurer = ImplAdventurer::new(ItemId::Wand);
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        adventurer.equipment.weapon.xp = 361;

        // set adventurer ID 1 to our adventurer
        state._adventurer.write(1, adventurer);

        // verify adventurer has been set
        let mut adventurer = state.get_adventurer(1);
        let prev_stat_upgrades_available = adventurer.stat_upgrades_available;
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        assert(adventurer.equipment.weapon.xp == 361, 'xp not set correctly');

        // call internal _process_item_level_up function and verify results
        let item_leveled_up_event = _process_item_level_up(
            ref state, ref adventurer, 1, adventurer.equipment.weapon, 18, 19
        );

        // verify event details
        assert(item_leveled_up_event.item_id == ItemId::Wand, 'item id is wrong');
        assert(item_leveled_up_event.previous_level == 18, 'previous level is wrong');
        assert(item_leveled_up_event.new_level == 19, 'new level is wrong');
        assert(!item_leveled_up_event.suffix_unlocked, 'suffix should not be unlocked');
        assert(item_leveled_up_event.prefixes_unlocked, 'prefixes should be unlocked');
        assert(item_leveled_up_event.specials.special1 != 0, 'special1 should be set');
        assert(item_leveled_up_event.specials.special2 != 0, 'special2 should be set');
        assert(item_leveled_up_event.specials.special3 != 0, 'special3 should be set');
        assert(
            adventurer.stat_upgrades_available == prev_stat_upgrades_available,
            'wrong stats available'
        );
    }

    #[test]
    fn test_process_item_level_up_item_suffix_unlock() {
        start_cheat_chain_id_global(TESTING_CHAIN_ID);
        let mut state = Game::contract_state_for_testing();
        _set_item_specials_seed(ref state, 1, 123);

        // init adventurer with g15 wand
        let mut adventurer = ImplAdventurer::new(ItemId::Wand);
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        adventurer.equipment.weapon.xp = 225;

        // set adventurer ID 1 to our adventurer
        state._adventurer.write(1, adventurer);

        // verify adventurer has been set
        let mut adventurer = state.get_adventurer(1);
        let prev_stat_upgrades_available = adventurer.stat_upgrades_available;
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        assert(adventurer.equipment.weapon.xp == 225, 'xp not set correctly');

        // call internal _process_item_level_up function and verify results
        let item_leveled_up_event = _process_item_level_up(
            ref state, ref adventurer, 1, adventurer.equipment.weapon, 14, 15
        );

        // verify event details
        assert(item_leveled_up_event.item_id == ItemId::Wand, 'item id is wrong');
        assert(item_leveled_up_event.previous_level == 14, 'previous level is wrong');
        assert(item_leveled_up_event.new_level == 15, 'new level is wrong');
        assert(item_leveled_up_event.suffix_unlocked, 'suffix should be unlocked');
        assert(!item_leveled_up_event.prefixes_unlocked, 'prefix should not be unlocked');
        assert(item_leveled_up_event.specials.special1 != 0, 'special1 should be set');
        assert(item_leveled_up_event.specials.special2 == 0, 'special2 should be set');
        assert(item_leveled_up_event.specials.special3 == 0, 'special3 should be set');
        assert(
            adventurer.stat_upgrades_available == prev_stat_upgrades_available,
            'wrong stats available'
        );
    }

    #[test]
    fn test_process_item_level_up_no_specials_unlock() {
        start_cheat_chain_id_global(TESTING_CHAIN_ID);
        let mut state = Game::contract_state_for_testing();
        _set_item_specials_seed(ref state, 1, 123);

        // init adventurer with g14 wand
        let mut adventurer = ImplAdventurer::new(ItemId::Wand);
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        adventurer.equipment.weapon.xp = 200;

        // set adventurer ID 1 to our adventurer
        state._adventurer.write(1, adventurer);

        // verify adventurer has been set
        let mut adventurer = state.get_adventurer(1);
        let prev_stat_upgrades_available = adventurer.stat_upgrades_available;
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        assert(adventurer.equipment.weapon.xp == 200, 'xp not set correctly');

        // call internal _process_item_level_up function and verify results
        let item_leveled_up_event = _process_item_level_up(
            ref state, ref adventurer, 1, adventurer.equipment.weapon, 13, 14
        );

        // verify event details
        assert(item_leveled_up_event.item_id == ItemId::Wand, 'item id is wrong');
        assert(item_leveled_up_event.previous_level == 13, 'previous level is wrong');
        assert(item_leveled_up_event.new_level == 14, 'new level is wrong');
        assert(!item_leveled_up_event.suffix_unlocked, 'suffix should not be unlocked');
        assert(!item_leveled_up_event.prefixes_unlocked, 'prefix should not be unlocked');
        assert(item_leveled_up_event.specials.special1 == 0, 'special1 should not be set');
        assert(item_leveled_up_event.specials.special2 == 0, 'special2 should not be set');
        assert(item_leveled_up_event.specials.special3 == 0, 'special3 should not be set');
        assert(
            adventurer.stat_upgrades_available == prev_stat_upgrades_available,
            'wrong stats available'
        );
    }

    #[test]
    fn test_process_item_level_up_greatness_20() {
        start_cheat_chain_id_global(TESTING_CHAIN_ID);
        let mut state = Game::contract_state_for_testing();
        _set_item_specials_seed(ref state, 1, 123);

        // initialize adventurer with a G18 wand
        let mut adventurer = ImplAdventurer::new(ItemId::Wand);
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        adventurer.equipment.weapon.xp = 400;

        // set adventurer ID 1 to our adventurer
        state._adventurer.write(1, adventurer);

        // verify adventurer has been set
        let mut adventurer = state.get_adventurer(1);
        let prev_stat_upgrades_available = adventurer.stat_upgrades_available;
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        assert(adventurer.equipment.weapon.xp == 400, 'xp not set correctly');

        // call internal _process_item_level_up function and verify results
        let item_leveled_up_event = _process_item_level_up(
            ref state, ref adventurer, 1, adventurer.equipment.weapon, 19, 20
        );

        // verify event details
        assert(item_leveled_up_event.item_id == ItemId::Wand, 'item id is wrong');
        assert(item_leveled_up_event.previous_level == 19, 'previous level is wrong');
        assert(item_leveled_up_event.new_level == 20, 'new level is wrong');
        assert(!item_leveled_up_event.suffix_unlocked, 'suffix should not be unlocked');
        assert(!item_leveled_up_event.prefixes_unlocked, 'prefix should not be unlocked');
        assert(item_leveled_up_event.specials.special1 != 0, 'special1 should be set');
        assert(item_leveled_up_event.specials.special2 != 0, 'special2 should be set');
        assert(item_leveled_up_event.specials.special3 != 0, 'special3 should be set');
        assert(
            adventurer.stat_upgrades_available == prev_stat_upgrades_available + 1,
            'wrong stats available'
        );
    }

    #[test]
    fn test_process_item_level_up_item_suffix_and_prefix_unlock() {
        start_cheat_chain_id_global(TESTING_CHAIN_ID);
        let mut state = Game::contract_state_for_testing();
        _set_item_specials_seed(ref state, 1, 123);

        // init adventurer with g19 wand
        let mut adventurer = ImplAdventurer::new(ItemId::Wand);
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        adventurer.equipment.weapon.xp = 361;

        // set adventurer ID 1 to our adventurer
        state._adventurer.write(1, adventurer);

        // verify adventurer has been set
        let mut adventurer = state.get_adventurer(1);
        let prev_stat_upgrades_available = adventurer.stat_upgrades_available;
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon not set correctly');
        assert(adventurer.equipment.weapon.xp == 361, 'xp not set correctly');

        // call internal _process_item_level_up function and verify results
        let item_leveled_up_event = _process_item_level_up(
            ref state, ref adventurer, 1, adventurer.equipment.weapon, 14, 19
        );

        // verify event details
        assert(item_leveled_up_event.item_id == ItemId::Wand, 'item id is wrong');
        assert(item_leveled_up_event.previous_level == 14, 'previous level is wrong');
        assert(item_leveled_up_event.new_level == 19, 'new level is wrong');
        assert(item_leveled_up_event.suffix_unlocked, 'suffix should be unlocked');
        assert(item_leveled_up_event.prefixes_unlocked, 'prefix should be unlocked');
        assert(item_leveled_up_event.specials.special1 != 0, 'special1 should be set');
        assert(item_leveled_up_event.specials.special2 != 0, 'special2 should be set');
        assert(item_leveled_up_event.specials.special3 != 0, 'special3 should be set');
        assert(
            adventurer.stat_upgrades_available == prev_stat_upgrades_available,
            'wrong stats available'
        );
    }

    #[test]
    fn test_vrf_premiums_address_can_withdraw_eth() {
        let (mut game, _, eth_dispatcher, _, _, _, _) = deploy_game(0, 0, 0, 0);

        // change caller to the VRF premiums address
        start_cheat_caller_address_global(VRF_PREMIUMS_ADDRESS());

        // verify it has ability to withdraw all ETH from the game contract
        eth_dispatcher
            .transfer_from(
                game.contract_address, VRF_PREMIUMS_ADDRESS(), 10000000000000000000000000000000
            );
    }

    #[test]
    #[should_panic(expected: ('ERC20: insufficient allowance',))]
    fn test_non_vrf_premiums_address_cannot_withdraw_eth() {
        let (mut game, _, eth_dispatcher, _, _, _, _) = deploy_game(0, 0, 0, 0);

        // change caller to the VRF premiums address
        start_cheat_caller_address_global(ARBITRARY_ADDRESS());

        // verify it has ability to withdraw all ETH from the game contract
        eth_dispatcher
            .transfer_from(
                game.contract_address, ARBITRARY_ADDRESS(), 10000000000000000000000000000000
            );
    }

    #[test]
    #[should_panic(expected: ('ERC20: insufficient allowance',))]
    fn test_non_vrf_premiums_address_cannot_withdraw_to_vrf_premiums_address() {
        let (mut game, _, eth_dispatcher, _, _, _, _) = deploy_game(0, 0, 0, 0);

        // change caller to the VRF premiums address
        start_cheat_caller_address_global(ARBITRARY_ADDRESS());

        // verify it has ability to withdraw all ETH from the game contract
        eth_dispatcher
            .transfer_from(
                game.contract_address, VRF_PREMIUMS_ADDRESS(), 10000000000000000000000000000000
            );
    }

    #[test]
    fn test_record_client_provider_address() {
        let (mut game, _, _, _, _, _, _) = deploy_game(0, 0, 0, 0);
        let player1 = add_adventurer_to_game(ref game, 0, ItemId::Wand);
        // get adventurer metadata
        let client_provider_address = game.get_client_provider(player1);
        assert(client_provider_address == INTERFACE_ID(), 'wrong client provider address');
    }

    #[test]
    fn test_golden_token_id_is_set() {
        let (mut game, _, _, _, _, _, _) = deploy_game(0, 0, 0, 0);
        let player1 = add_adventurer_to_game(ref game, 0, ItemId::Wand);
        let player2 = add_adventurer_to_game(ref game, 1, ItemId::Wand);
        let player3 = add_adventurer_to_game(ref game, 160, ItemId::Wand);
        let player1_meta = game.get_adventurer_meta(player1);
        let player2_meta = game.get_adventurer_meta(player2);
        let player3_meta = game.get_adventurer_meta(player3);

        assert(player1_meta.golden_token_id == 0, 'golden token id should be 0');
        assert(player2_meta.golden_token_id == 1, 'golden token id should be 1');
        assert(player3_meta.golden_token_id == 160, 'golden token id should be 160');
    }
    #[test]
    fn test_update_adventurer_name() {
        // Deploy the game
        let starting_block = 1000;
        let starting_time = 1696201757;
        let (mut game, _, _, _, _, _, _) = deploy_game(starting_block, starting_time, 0, 0);

        // Create a new adventurer
        let adventurer_id = add_adventurer_to_game(ref game, 0, ItemId::Wand);

        // Get the initial name
        let initial_name = game.get_adventurer_name(adventurer_id);

        // Update the adventurer's name
        let new_name: felt252 = 'New Adventurer Name';
        game.update_adventurer_name(adventurer_id, new_name);

        // Get the updated name
        let updated_name = game.get_adventurer_name(adventurer_id);

        // Assert that the name has been updated correctly
        assert(initial_name != new_name, 'Name did not change');
        assert(updated_name == new_name, 'Name not updated correctly');
    }

    #[test]
    #[should_panic(expected: ('Adventurer is dead',))]
    fn test_update_adventurer_name_dead() {
        start_cheat_chain_id_global(TESTING_CHAIN_ID);
        let mut state = Game::contract_state_for_testing();
        let new_adventurer = ImplAdventurer::new(ItemId::Wand);
        // save adventurer to state
        state._adventurer.write(1, new_adventurer);
        // verify adventurer state
        let mut adventurer = state.get_adventurer(1);
        assert(adventurer.health == 100, 'health should be 100');
        assert(adventurer.equipment.weapon.id == ItemId::Wand, 'weapon id should be wand');

        // kill adventurer
        adventurer.health = 0;
        state._adventurer.write(1, adventurer);

        // try to update adventurer name, should panic
        state.update_adventurer_name(1, 'New Name');
    }

    #[test]
    #[should_panic(expected: ('Not authorized to act',))]
    fn test_update_adventurer_name_not_owner() {
        let (mut game, _, _, _, _, _, _) = deploy_game(0, 0, 0, 0);
        let adventurer_id = add_adventurer_to_game(ref game, 0, ItemId::Wand);

        // change caller to a different address
        start_cheat_caller_address_global(ARBITRARY_ADDRESS());

        // try to change adventurer's name, should panic
        game.update_adventurer_name(adventurer_id, 'New Name');
    }

    #[test]
    #[should_panic(expected: ('Game has expired',))]
    fn test_update_adventurer_name_game_expired() {
        // deploy_game
        let starting_block = 1000;
        let starting_time = 1696201757;
        let (mut game, _, _, _, _, _, _) = deploy_game(starting_block, starting_time, 0, 0);

        // Create a new adventurer
        let adventurer_id = add_adventurer_to_game(ref game, 0, ItemId::Wand);

        let beyond_expiry_date = starting_time
            + (GAME_EXPIRY_DAYS.into() * SECONDS_IN_DAY.into())
            + 1;
        start_cheat_block_timestamp_global(beyond_expiry_date);
        game.update_adventurer_name(adventurer_id, 'New Name');
    }

    #[test]
    fn test_initialize_launch_tournament() {
        // Initialize the contract state for testing
        let mut state = Game::contract_state_for_testing();

        // Create a span of qualifying collections
        let mut qualifying_collections = ArrayTrait::<LaunchTournamentCollections>::new();
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<1>(), games_per_token: 1
                }
            );
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<2>(), games_per_token: 2
                }
            );
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<3>(), games_per_token: 3
                }
            );
        // Call the internal function
        _initialize_launch_tournament(ref state, qualifying_collections.span());

        // Verify the results
        let collections_len = state._launch_tournament_collections.len();
        assert(collections_len == 3, 'Wrong number of collections');

        // Check each collection is properly stored
        assert(
            state._launch_tournament_collections.at(0).read() == contract_address_const::<1>(),
            'Wrong collection at index 0'
        );
        assert(
            state._launch_tournament_collections.at(1).read() == contract_address_const::<2>(),
            'Wrong collection at index 1'
        );
        assert(
            state._launch_tournament_collections.at(2).read() == contract_address_const::<3>(),
            'Wrong collection at index 2'
        );

        // Verify scores are initialized to 1
        assert(
            state._launch_tournament_scores.read(contract_address_const::<1>()) == 1,
            'Wrong score for collection 1'
        );
        assert(
            state._launch_tournament_scores.read(contract_address_const::<2>()) == 1,
            'Wrong score for collection 2'
        );
        assert(
            state._launch_tournament_scores.read(contract_address_const::<3>()) == 1,
            'Wrong score for collection 3'
        );

        // Verify a non-qualifying collection has a score of 0
        assert(
            state._launch_tournament_scores.read(contract_address_const::<4>()) == 0,
            'collection should have 0 score'
        );

        // assert the number of games per token is 1
        assert(
            state._launch_tournament_games_per_claim.read(contract_address_const::<1>()) == 1,
            'games per token collection 1'
        );

        // assert the number of games per token is 2
        assert(
            state._launch_tournament_games_per_claim.read(contract_address_const::<2>()) == 2,
            'games per token collection 2'
        );

        // assert the number of games per token is 3
        assert(
            state._launch_tournament_games_per_claim.read(contract_address_const::<3>()) == 3,
            'games per token collection 3'
        );
    }

    #[test]
    fn test_settle_launch_tournament() {
        let launch_tournament_duration_seconds = 604800;
        let contract_deploy_time = 1725391638;
        start_cheat_block_timestamp_global(contract_deploy_time);

        // Initialize the contract state for testing
        let mut state = Game::contract_state_for_testing();
        state._launch_tournament_duration_seconds.write(launch_tournament_duration_seconds);
        state._genesis_timestamp.write(contract_deploy_time);

        // Create a span of qualifying collections
        let mut qualifying_collections = ArrayTrait::<LaunchTournamentCollections>::new();
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<1>(), games_per_token: 1
                }
            );
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<2>(), games_per_token: 2
                }
            );
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<3>(), games_per_token: 3
                }
            );

        // Initialize the launch tournament
        _initialize_launch_tournament(ref state, qualifying_collections.span());

        // Set different scores for each collection
        state._launch_tournament_scores.write(contract_address_const::<1>(), 100);
        state._launch_tournament_scores.write(contract_address_const::<2>(), 200);
        state._launch_tournament_scores.write(contract_address_const::<3>(), 150);

        // Mock the block timestamp
        start_cheat_block_timestamp_global(
            contract_deploy_time + launch_tournament_duration_seconds + 1
        );

        // Call the settle_launch_tournament function
        state.settle_launch_tournament();

        // Verify the results
        let champions_dispatcher = state._launch_tournament_champions_dispatcher.read();
        assert(
            champions_dispatcher.contract_address == contract_address_const::<2>(),
            'Wrong champion collection'
        );
    }
    #[test]
    #[should_panic(expected: ('tournament still active',))]
    fn test_settle_launch_tournament_before_end() {
        let launch_tournament_duration_seconds = 604800;
        let contract_deploy_time = 1725391638;
        start_cheat_block_timestamp_global(contract_deploy_time);

        // Initialize the contract state for testing
        let mut state = Game::contract_state_for_testing();
        state._genesis_timestamp.write(contract_deploy_time);
        state._launch_tournament_duration_seconds.write(launch_tournament_duration_seconds);

        // Create a span of qualifying collections
        let mut qualifying_collections = ArrayTrait::<LaunchTournamentCollections>::new();
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<1>(), games_per_token: 1
                }
            );
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<2>(), games_per_token: 2
                }
            );

        // Initialize the launch tournament
        _initialize_launch_tournament(ref state, qualifying_collections.span());
        // Mock the block timestamp to be before the end of the launch tournament
        start_cheat_block_timestamp_global(
            contract_deploy_time + launch_tournament_duration_seconds - 1
        );

        // Attempt to settle the tournament before it has ended (should panic)
        state.settle_launch_tournament();
    }

    #[test]
    #[should_panic(expected: ('tournament already settled',))]
    fn test_settle_launch_tournament_twice() {
        let launch_tournament_duration_seconds = 604800;
        let contract_deploy_time = 1725391638;
        start_cheat_block_timestamp_global(contract_deploy_time);

        // Initialize the contract state for testing
        let mut state = Game::contract_state_for_testing();
        state._genesis_timestamp.write(contract_deploy_time);
        state._launch_tournament_duration_seconds.write(launch_tournament_duration_seconds);

        // Create a span of qualifying collections
        let mut qualifying_collections = ArrayTrait::<LaunchTournamentCollections>::new();
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<1>(), games_per_token: 1
                }
            );
        qualifying_collections
            .append(
                LaunchTournamentCollections {
                    collection_address: contract_address_const::<2>(), games_per_token: 2
                }
            );

        // Initialize the launch tournament
        _initialize_launch_tournament(ref state, qualifying_collections.span());

        // Set different scores for each collection
        state._launch_tournament_scores.write(contract_address_const::<1>(), 100);
        state._launch_tournament_scores.write(contract_address_const::<2>(), 200);

        start_cheat_block_timestamp_global(
            contract_deploy_time + launch_tournament_duration_seconds + 1
        );

        // Settle the tournament for the first time
        state.settle_launch_tournament();

        // Attempt to settle the tournament again (should panic)
        state.settle_launch_tournament();
    }
}
