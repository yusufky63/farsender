// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";      // v5: utils/
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SafeMultisender is ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_ETH_RECIPIENTS  = 300;
    uint256 public constant MAX_ERC20_RECIPIENTS = 200;

    uint256 public flatFee;                // wei
    address payable public feeRecipient;

    error InputMismatch();
    error ZeroAddress();
    error ZeroAmount(uint256 index);
    error ValueMismatch();
    error TooManyRecipients();
    error AllowanceTooLow();
    error DirectEthRejected();
    error NoFallback();
    error EthSendFailed(uint256 index);
    error FeeRecipientZero();
    error FeeTransferFailed();

    event MultiSendETH(address indexed sender, uint256 total, uint256 count);
    event MultiSendERC20(address indexed sender, address indexed token, uint256 total, uint256 count);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    // v5: Ownable base constructor ARGÜMAN ister -> Ownable(msg.sender)
    constructor(uint256 initialFlatFee, address payable initialFeeRecipient) Ownable(msg.sender) {
        if (initialFeeRecipient == address(0)) revert FeeRecipientZero();
        flatFee = initialFlatFee;
        feeRecipient = initialFeeRecipient;
    }

    // ---------- ETH ----------
    function multiSendETH(address[] calldata recipients, uint256[] calldata amounts)
        external
        payable
        nonReentrant
    {
        multiSendETH(recipients, amounts, true);
    }

    function multiSendETH(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bool revertOnFail
    ) public payable nonReentrant {
        uint256 len = recipients.length;
        if (len == 0 || len != amounts.length) revert InputMismatch();
        if (len > MAX_ETH_RECIPIENTS) revert TooManyRecipients();

        uint256 total;
        for (uint256 i; i < len; ) {
            address r = recipients[i];
            uint256 a = amounts[i];
            if (r == address(0)) revert ZeroAddress();
            if (a == 0) revert ZeroAmount(i);
            total += a;
            unchecked { ++i; }
        }
        if (msg.value != total + flatFee) revert ValueMismatch();

        for (uint256 i; i < len; ) {
            (bool ok, ) = payable(recipients[i]).call{value: amounts[i]}("");
            if (!ok) {
                if (revertOnFail) revert EthSendFailed(i);
                // partial mode: skip failed recipient
            }
            unchecked { ++i; }
        }

        if (flatFee > 0) {
            (bool okFee, ) = feeRecipient.call{value: flatFee}("");
            if (!okFee) revert FeeTransferFailed();
        }

        emit MultiSendETH(msg.sender, total, len);
    }

    // ---------- ERC20 ----------
    function multiSendERC20(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        uint256 len = recipients.length;
        if (len == 0 || len != amounts.length) revert InputMismatch();
        if (len > MAX_ERC20_RECIPIENTS) revert TooManyRecipients();

        if (msg.value != flatFee) revert ValueMismatch();

        uint256 total;
        for (uint256 i; i < len; ) {
            address r = recipients[i];
            uint256 a = amounts[i];
            if (r == address(0)) revert ZeroAddress();
            if (a == 0) revert ZeroAmount(i);
            total += a;
            unchecked { ++i; }
        }

        if (token.allowance(msg.sender, address(this)) < total) revert AllowanceTooLow();

        for (uint256 i; i < len; ) {
            token.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
            unchecked { ++i; }
        }

        if (flatFee > 0) {
            (bool okFee, ) = feeRecipient.call{value: flatFee}("");
            if (!okFee) revert FeeTransferFailed();
        }

        emit MultiSendERC20(msg.sender, address(token), total, len);
    }

    // ---------- Admin ----------
    function setFlatFee(uint256 newFlatFee) external onlyOwner {
        uint256 old = flatFee;
        flatFee = newFlatFee;
        emit FeeUpdated(old, newFlatFee);
    }

    function setFeeRecipient(address payable newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert FeeRecipientZero();
        address old = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(old, newRecipient);
    }

    // ---------- Fallbacks ----------
    receive() external payable { revert DirectEthRejected(); }
    fallback() external payable { revert NoFallback(); }
}
