// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./RsaAccount.sol";

contract RsaAccountFactory {
    RsaAccount public immutable accountImplementation;
    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new RsaAccount(_entryPoint);
    }

    /**
     * create an account, and return its address.
     * returns the address even if the account is already deployed.
     * Note that during UserOperation execution, this method is called only if the account is not deployed.
     * This method returns an existing account address so that entryPoint.getSenderAddress() would work even after account creation
     */
    function createAccount(bytes memory _exponent, bytes memory _modulus, uint256 salt) public returns (RsaAccount ret) {
        address addr = getAddress(_exponent, _modulus, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return RsaAccount(payable(addr));
        }
        ret = RsaAccount(payable(new ERC1967Proxy{salt : bytes32(salt)}(
            address(accountImplementation),
            abi.encodeCall(RsaAccount.initialize, (_exponent, _modulus))
        )));
    }

    /**
     * calculate the counterfactual address of this account as it would be returned by createAccount()
     */
    function getAddress(bytes memory _exponent, bytes memory _modulus, uint256 salt) public view returns (address) {
        return Create2.computeAddress(bytes32(salt), keccak256(abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(
                address(accountImplementation),
                abi.encodeCall(RsaAccount.initialize, (_exponent, _modulus))
            )
        )));
    }
}
