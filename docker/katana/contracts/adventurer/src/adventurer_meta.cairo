use starknet::{StorePacking};

#[derive(Drop, Copy, Serde)]
struct AdventurerMetadata {
    birth_date: u64, // 64 bits in storage
    death_date: u64, // 64 bits in storage
    level_seed: u64, // 64 bits in storage
    item_specials_seed: u16, // 16 bits in storage
    rank_at_death: u8, // 2 bits in storage
    delay_stat_reveal: bool, // 1 bit in storage
    golden_token_id: u8, // 8 bits in storage
    launch_tournament_winner_token_id: u128, // 32 bits in storage
}

impl PackingAdventurerMetadata of StorePacking<AdventurerMetadata, felt252> {
    /// @notice: Packs an AdventurerMetadata struct into a felt252
    /// @param value: The AdventurerMetadata struct to pack
    /// @return: The packed felt252
    fn pack(value: AdventurerMetadata) -> felt252 {
        let delay_stat_reveal = if value.delay_stat_reveal {
            1
        } else {
            0
        };

        // downsize launch tournament winner token id to 32 bits so we can fit it in our storage
        let launch_tournament_token_id_u32 = value
            .launch_tournament_winner_token_id % U32_MAX
            .into();

        (value.birth_date.into()
            + value.death_date.into() * TWO_POW_64
            + value.level_seed.into() * TWO_POW_128
            + value.item_specials_seed.into() * TWO_POW_192
            + value.rank_at_death.into() * TWO_POW_208
            + delay_stat_reveal * TWO_POW_210
            + value.golden_token_id.into() * TWO_POW_211
            + launch_tournament_token_id_u32.into() * TWO_POW_219)
            .try_into()
            .unwrap()
    }

    /// @notice: Unpacks a felt252 into an AdventurerMetadata struct
    /// @param value: The felt252 to unpack
    /// @return: The unpacked AdventurerMetadata struct
    fn unpack(value: felt252) -> AdventurerMetadata {
        let packed = value.into();

        let (packed, birth_date) = integer::U256DivRem::div_rem(packed, TWO_POW_64_NZ);
        let (packed, death_date) = integer::U256DivRem::div_rem(packed, TWO_POW_64_NZ);
        let (packed, level_seed) = integer::U256DivRem::div_rem(packed, TWO_POW_64_NZ);
        let (packed, item_specials_seed) = integer::U256DivRem::div_rem(packed, TWO_POW_16_NZ);
        let (packed, rank_at_death) = integer::U256DivRem::div_rem(packed, TWO_POW_2_NZ);
        let (packed, delay_stat_reveal_u256) = integer::U256DivRem::div_rem(packed, TWO_POW_1_NZ);
        let (packed, golden_token_id) = integer::U256DivRem::div_rem(packed, TWO_POW_8_NZ);
        let (_, launch_tournament_winner_token_id) = integer::U256DivRem::div_rem(
            packed, TWO_POW_32_NZ
        );

        let birth_date = birth_date.try_into().unwrap();
        let death_date = death_date.try_into().unwrap();
        let level_seed = level_seed.try_into().unwrap();
        let delay_stat_reveal = delay_stat_reveal_u256 != 0;
        let rank_at_death = rank_at_death.try_into().unwrap();
        let item_specials_seed = item_specials_seed.try_into().unwrap();
        let golden_token_id = golden_token_id.try_into().unwrap();
        let launch_tournament_winner_token_id = launch_tournament_winner_token_id
            .try_into()
            .unwrap();

        AdventurerMetadata {
            birth_date,
            death_date,
            level_seed,
            item_specials_seed,
            rank_at_death,
            delay_stat_reveal,
            golden_token_id,
            launch_tournament_winner_token_id,
        }
    }
}

#[generate_trait]
impl ImplAdventurerMetadata of IAdventurerMetadata {
    /// @notice: Creates a new AdventurerMetadata struct
    /// @dev: AdventurerMetadata is initialized without any starting stats
    /// @param birth_date: The start time of the adventurer
    /// @param delay_reveal: Whether the adventurer should delay reveal
    /// @param golden_token_id: The golden token id of the adventurer
    /// @param launch_tournament_winner_token_id: The launch tournament winner token id of the
    /// adventurer @return: The newly created AdventurerMetadata struct
    fn new(
        birth_date: u64,
        delay_stat_reveal: bool,
        golden_token_id: u8,
        launch_tournament_winner_token_id: u128
    ) -> AdventurerMetadata {
        AdventurerMetadata {
            birth_date,
            death_date: 0,
            level_seed: 0,
            item_specials_seed: 0,
            rank_at_death: 0,
            delay_stat_reveal,
            golden_token_id,
            launch_tournament_winner_token_id,
        }
    }
}

const TWO_POW_1: u256 = 0x2;
const TWO_POW_2_NZ: NonZero<u256> = 0x4;
const TWO_POW_1_NZ: NonZero<u256> = 0x2;
const TWO_POW_8_NZ: NonZero<u256> = 0x100;
const TWO_POW_16: u256 = 0x10000;
const TWO_POW_16_NZ: NonZero<u256> = 0x10000;
const TWO_POW_32_NZ: NonZero<u256> = 0x100000000;
const U32_MAX: u32 = 0xffffffff;
const TWO_POW_64: u256 = 0x10000000000000000;
const TWO_POW_64_NZ: NonZero<u256> = 0x10000000000000000;
const TWO_POW_128: u256 = 0x100000000000000000000000000000000;
const TWO_POW_192: u256 = 0x1000000000000000000000000000000000000000000000000;
const TWO_POW_208: u256 = 0x10000000000000000000000000000000000000000000000000000;
const TWO_POW_210: u256 = 0x40000000000000000000000000000000000000000000000000000;
const TWO_POW_211: u256 = 0x80000000000000000000000000000000000000000000000000000;
const TWO_POW_219: u256 = 0x8000000000000000000000000000000000000000000000000000000;

// ---------------------------
// ---------- Tests ----------
// ---------------------------
#[cfg(test)]
mod tests {
    use super::{AdventurerMetadata, PackingAdventurerMetadata, ImplAdventurerMetadata};
    const U128_MAX: u128 = 0xffffffffffffffffffffffffffffffff;
    const U64_MAX: u64 = 0xffffffffffffffff;
    const U32_MAX: u32 = 0xffffffff;
    const U16_MAX: u16 = 0xffff;
    const U2_MAX: u8 = 0x3;
    const U8_MAX: u8 = 0xff;

    #[test]
    fn test_adventurer_metadata_packing() {
        // max value case
        let meta = AdventurerMetadata {
            birth_date: U64_MAX,
            death_date: U64_MAX,
            level_seed: U64_MAX,
            item_specials_seed: U16_MAX,
            rank_at_death: U2_MAX,
            delay_stat_reveal: true,
            golden_token_id: U8_MAX,
            launch_tournament_winner_token_id: U128_MAX,
        };
        let packed = PackingAdventurerMetadata::pack(meta);
        let unpacked: AdventurerMetadata = PackingAdventurerMetadata::unpack(packed);
        assert(meta.birth_date == unpacked.birth_date, 'start time should be max u64');
        assert(meta.death_date == unpacked.death_date, 'end time should be max u64');
        assert(meta.level_seed == unpacked.level_seed, 'level seed should be max u64');
        assert(
            meta.item_specials_seed == unpacked.item_specials_seed,
            'item specials should be max u16'
        );
        assert(meta.rank_at_death == unpacked.rank_at_death, 'rank at death should be max u2');
        assert(meta.delay_stat_reveal == unpacked.delay_stat_reveal, 'delay reveal should be true');
        assert(meta.golden_token_id == unpacked.golden_token_id, 'golden token should be max');
        assert(unpacked.launch_tournament_winner_token_id == 0, 'champ token should be 0');

        // max value -1 case
        let meta = AdventurerMetadata {
            birth_date: U64_MAX - 1,
            death_date: U64_MAX - 1,
            level_seed: U64_MAX - 1,
            item_specials_seed: U16_MAX - 1,
            rank_at_death: U2_MAX - 1,
            delay_stat_reveal: true,
            golden_token_id: U8_MAX - 1,
            launch_tournament_winner_token_id: U128_MAX - 1,
        };
        let packed = PackingAdventurerMetadata::pack(meta);
        let unpacked: AdventurerMetadata = PackingAdventurerMetadata::unpack(packed);
        assert(meta.birth_date == unpacked.birth_date, 'start time should be max u64');
        assert(meta.death_date == unpacked.death_date, 'end time should be max u64');
        assert(meta.level_seed == unpacked.level_seed, 'level seed should be max u64');
        assert(
            meta.item_specials_seed == unpacked.item_specials_seed,
            'item specials should be max u16'
        );
        assert(meta.rank_at_death == unpacked.rank_at_death, 'rank at death should be max u2');
        assert(meta.delay_stat_reveal == unpacked.delay_stat_reveal, 'delay reveal should be true');
        assert(meta.golden_token_id == unpacked.golden_token_id, 'golden token should be max');
        println!("launch tourny token id: {}", unpacked.launch_tournament_winner_token_id);
        assert(
            unpacked.launch_tournament_winner_token_id == (U32_MAX.into() - 1),
            'champ token should be max'
        );

        // middle value case
        let meta = AdventurerMetadata {
            birth_date: U32_MAX.into(),
            death_date: U32_MAX.into(),
            level_seed: U32_MAX.into(),
            item_specials_seed: 500,
            rank_at_death: 2,
            delay_stat_reveal: true,
            golden_token_id: 160,
            launch_tournament_winner_token_id: 4000,
        };
        let packed = PackingAdventurerMetadata::pack(meta);
        let unpacked: AdventurerMetadata = PackingAdventurerMetadata::unpack(packed);
        assert(meta.birth_date == unpacked.birth_date, 'start time should be same');
        assert(meta.death_date == unpacked.death_date, 'end time should be same');
        assert(meta.level_seed == unpacked.level_seed, 'level seed should be same');
        assert(
            meta.item_specials_seed == unpacked.item_specials_seed, 'item specials should be same'
        );
        assert(meta.rank_at_death == unpacked.rank_at_death, 'rank at death should be same');
        assert(meta.delay_stat_reveal == unpacked.delay_stat_reveal, 'delay reveal should be same');
        assert(meta.golden_token_id == unpacked.golden_token_id, 'golden token should be same');
        println!("launch tourny token id: {}", unpacked.launch_tournament_winner_token_id);
        assert(
            unpacked.launch_tournament_winner_token_id == meta.launch_tournament_winner_token_id,
            'champ token should be same'
        );

        // zero case
        let meta = AdventurerMetadata {
            birth_date: 0,
            death_date: 0,
            level_seed: 0,
            item_specials_seed: 0,
            rank_at_death: 0,
            delay_stat_reveal: false,
            golden_token_id: 0,
            launch_tournament_winner_token_id: 0,
        };
        let packed = PackingAdventurerMetadata::pack(meta);
        let unpacked: AdventurerMetadata = PackingAdventurerMetadata::unpack(packed);
        assert(unpacked.birth_date == 0, 'start time should be 0');
        assert(unpacked.death_date == 0, 'end time should be 0');
        assert(unpacked.level_seed == 0, 'level seed should be 0');
        assert(unpacked.item_specials_seed == 0, 'item specials seed should be 0');
        assert(unpacked.rank_at_death == 0, 'rank at death should be 0');
        assert(unpacked.delay_stat_reveal == false, 'delay reveal should be false');
        assert(unpacked.golden_token_id == 0, 'golden token id should be 0');
        assert(unpacked.launch_tournament_winner_token_id == 0, 'champ token should be 0');
    }

    #[test]
    fn test_new_adventurer_metadata() {
        let birthdate = 12345;
        let meta = ImplAdventurerMetadata::new(birthdate, false, 0, 0);
        assert(meta.birth_date == birthdate, 'start time should be 12345');
        assert(meta.death_date == 0, 'end time should be 0');
        assert(meta.level_seed == 0, 'level seed should be 0');
        assert(meta.item_specials_seed == 0, 'item specials seed should be 0');
        assert(meta.rank_at_death == 0, 'rank at death should be 0');
        assert(meta.delay_stat_reveal == false, 'delay reveal should be false');
        assert(meta.golden_token_id == 0, 'golden token id should be 0');
        assert(meta.launch_tournament_winner_token_id == 0, 'champ token should be 0');
    }
}
