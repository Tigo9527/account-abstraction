// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./SimpleAccount.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract VoteRecoverAccount is SimpleAccount {
    // Add the library methods
    using EnumerableSet for EnumerableSet.AddressSet;

    // Declare a set state variable
    EnumerableSet.AddressSet private participants;

    // participant=>decision(newOwner)
    mapping(address => address) public votes;

    event OwnerChanged(address indexed from, address indexed to);
    //add: true for add, false for remove;
    event ParticipantChanged(address indexed who, bool indexed add);

    modifier onlyParticipant() {
        require(participants.contains(msg.sender), "onlyParticipant");
        _;
    }

    constructor(IEntryPoint anEntryPoint) SimpleAccount(anEntryPoint) {
    }

    //operation: true for add, false for remove
    function changeParticipants(address[] memory candidates, bool[] memory operations) public onlyOwner {
        require(candidates.length == operations.length, "invalid length");
        for (uint i=0; i< candidates.length; i++) {
            if (operations[i]) {
                require(participants.add(candidates[i]), "already added");
            } else {
                require(participants.remove(candidates[i]), "not exist");
            }
            emit ParticipantChanged(candidates[i], operations[i]);
        }
    }

    function getParticipants() view public returns (address[] memory){
        return participants.values();
    }

    function vote(address newOwner) public onlyParticipant {
        votes[msg.sender] = newOwner;
    }

    function recover(address newOwner) public {
        require(newOwner != address(0), "invalid address");

        uint count = 0;
        uint total = participants.length();
        for (uint i=0; i<total; i++) {
            if (votes[participants.at(i)] == newOwner) {
                count ++;
            }
            // clear votes if succeed
            delete votes[participants.at(i)];
        }
        require(count > total/2, "insufficient votes");

        address pre = owner;
        owner = newOwner;
        emit OwnerChanged(pre, newOwner);
    }
}
