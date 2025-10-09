// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MultiSender is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_ETH_RECIPIENTS   = 300;
    uint256 public constant MAX_ERC20_RECIPIENTS = 200;

    uint256 public flatFee;
    address payable public feeRecipient;

    uint256 public uniqueUsers;
    uint256 public totalTransfers;
    uint256 public totalRecipients;
    uint256 public totalEthSent;
    mapping(address => uint256) public totalTokenSent;

    mapping(address => bool) private hasUsed;

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
    error RescueFailed();

    event MultiSendETH(address indexed sender, uint256 total, uint256 count);
    event MultiSendERC20(address indexed sender, address indexed token, uint256 total, uint256 count);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event RescueETH(address indexed to, uint256 amount, address indexed by);
    event RescueERC20(address indexed token, address indexed to, uint256 amount, address indexed by);

    constructor(address payable initialFeeRecipient, uint256 initialFlatFee) Ownable(msg.sender) {
        if (initialFeeRecipient == address(0)) revert FeeRecipientZero();
        feeRecipient = initialFeeRecipient;
        flatFee = initialFlatFee;
    }

    function multiSendETH(address[] calldata recipients, uint256[] calldata amounts)
        external
        payable
        nonReentrant
    {
        _multiSendETHAtomic(recipients, amounts);
    }

    function _multiSendETHAtomic(address[] calldata recipients, uint256[] calldata amounts) internal {
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
            if (!ok) revert EthSendFailed(i);
            unchecked { ++i; }
        }

        if (flatFee > 0) {
            (bool okFee, ) = feeRecipient.call{value: flatFee}("");
            if (!okFee) revert FeeTransferFailed();
        }

        if (!hasUsed[msg.sender]) {
            hasUsed[msg.sender] = true;
            unchecked { ++uniqueUsers; }
        }
        unchecked {
            ++totalTransfers;
            totalRecipients += len;
            totalEthSent += total;
        }

        emit MultiSendETH(msg.sender, total, len);
    }

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

        if (!hasUsed[msg.sender]) {
            hasUsed[msg.sender] = true;
            unchecked { ++uniqueUsers; }
        }
        unchecked {
            ++totalTransfers;
            totalRecipients += len;
            totalTokenSent[address(token)] += total;
        }

        emit MultiSendERC20(msg.sender, address(token), total, len);
    }

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

    function rescueETH(address payable to, uint256 amount) external onlyOwner {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert RescueFailed();
        emit RescueETH(to, amount, msg.sender);
    }

    function rescueERC20(IERC20 token, address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
        emit RescueERC20(address(token), to, amount, msg.sender);
    }

    receive() external payable { revert DirectEthRejected(); }
    fallback() external payable { revert NoFallback(); }
}
