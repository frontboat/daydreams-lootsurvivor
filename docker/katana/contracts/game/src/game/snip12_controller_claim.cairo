use openzeppelin::utils::snip12::{SNIP12Metadata, StructHash};
use core::starknet::get_tx_info;
use core::starknet::get_caller_address;
use core::hash::HashStateExTrait;
use hash::{HashStateTrait, Hash};
use poseidon::PoseidonTrait;
use starknet::ContractAddress;

const MESSAGE_TYPE_HASH: felt252 = selector!("\"Message\"(\"recipient\":\"ContractAddress\")");
const STARKNET_DOMAIN_TYPE_HASH: felt252 =
    0x1ff2f602e42168014d405a94f75e8a93d640751d71d16311266e140d8b0a210;

#[derive(Hash, Drop, Copy)]
struct StarknetDomain {
    name: felt252,
    version: felt252,
    chain_id: felt252,
    revision: felt252,
}

impl StructHashStarknetDomainImpl of StructHash<StarknetDomain> {
    fn hash_struct(self: @StarknetDomain) -> felt252 {
        let hash_state = PoseidonTrait::new();
        hash_state.update_with(STARKNET_DOMAIN_TYPE_HASH).update_with(*self).finalize()
    }
}

#[derive(Copy, Drop, Hash)]
struct Message {
    recipient: ContractAddress,
}

impl StructHashImpl of StructHash<Message> {
    fn hash_struct(self: @Message) -> felt252 {
        let hash_state = PoseidonTrait::new();
        hash_state.update_with(MESSAGE_TYPE_HASH).update_with(*self).finalize()
    }
}

pub trait OffchainMessageHash<T> {
    fn get_message_hash(self: @T, signer: ContractAddress) -> felt252;
}

impl OffchainMessageHashImpl of OffchainMessageHash<Message> {
    fn get_message_hash(self: @Message, signer: ContractAddress) -> felt252 {
        let domain = StarknetDomain {
            name: 'Loot Survivor',
            version: '1',
            chain_id: get_tx_info().unbox().chain_id,
            revision: 1
        };
        let mut state = PoseidonTrait::new();
        state = state.update_with('StarkNet Message');
        state = state.update_with(domain.hash_struct());
        state = state.update_with(signer);
        state = state.update_with(self.hash_struct());
        state.finalize()
    }
}

impl SNIP12MetadataImpl of SNIP12Metadata {
    fn name() -> felt252 {
        'Loot_Survivor'
    }
    fn version() -> felt252 {
        'v1'
    }
}

fn get_hash(account: ContractAddress, recipient: ContractAddress,) -> felt252 {
    let message = Message { recipient };
    message.get_message_hash(account)
}
