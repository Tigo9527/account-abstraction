// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "../../core/BaseAccount.sol";
import "./RsaVerify.sol";
import "../callback/TokenCallbackHandler.sol";

contract RsaAccount is BaseAccount, TokenCallbackHandler {
    using RsaVerify for bytes;
    IEntryPoint private immutable _entryPoint;
    bytes public exponent;
    bytes public modulus;

    constructor(IEntryPoint anEntryPoint){
        _entryPoint = anEntryPoint;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    function initialize(bytes memory _exponent, bytes memory _modulus) public {
        require(exponent.length == 0, "already initialized");
        exponent = _exponent;
        modulus = _modulus;
    }

    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPoint();
        _call(dest, value, func);
    }

    /**
     * execute a sequence of transactions
     * @dev to reduce gas consumption for trivial case (no value), use a zero-length array to mean zero value
     */
    function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata func) external {
        _requireFromEntryPoint();
        require(dest.length == func.length && (value.length == 0 || value.length == func.length), "wrong array lengths");
        if (value.length == 0) {
            for (uint256 i = 0; i < dest.length; i++) {
                _call(dest[i], 0, func[i]);
            }
        } else {
            for (uint256 i = 0; i < dest.length; i++) {
                _call(dest[i], value[i], func[i]);
            }
        }
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value : value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function getExponent() public view returns(bytes memory) {
        return exponent;
    }
    function getModulus() public view returns(bytes memory) {
        return modulus;
    }

    function testRsa(bytes memory input, bytes memory signature) public view returns (bool){
        return input.pkcs1Sha256Raw(signature, exponent, modulus);
    }

    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal override virtual returns (uint256 validationData) {
        bytes memory bs = abi.encodePacked(userOpHash);
//        If your contract imports any library and uses any of it’s external methods in it’s code, then that library is needed to deployed separately and it’s address to be included in the bytecode.
        if (!bs.pkcs1Sha256Raw(userOp.signature, exponent, modulus))
            return SIG_VALIDATION_FAILED;
        return 0;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
