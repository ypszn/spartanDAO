// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Spartan} from "./Spartan.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SpartanDAO is Ownable, ReentrancyGuard {
    using SafeERC20 for ERC20;

    uint256 public constant EXTRA_SUPPLY = 200_000_000 ether;
    uint256 public constant SUPPLY_TO_FUNDRAISERS = 900_000_000 * 1e18;

    uint256 public totalRaised;
    uint256 public fundraisingGoal;
    bool public fundraisingFinalized;
    bool public goalReached;
    uint256 public fundraisingStartTimestamp;
    uint256 public fundraisingDeadline;

    address public protocolAdmin;
    string public name;
    string public symbol;
    address public daoToken;

    mapping(address => uint256) public contributions;
    mapping(address => bool) public whitelist;
    mapping(address => bool) public hasContributed;

    address[] public whitelistArray;
    address[] public contributors;

    event Contribution(address indexed contributor, uint256 amount);
    event FundraisingStarted(uint256 startTimestamp);
    event FundraisingFinalized(bool success);
    event AddWhitelist(address);
    event RemoveWhitelist(address);

    constructor(
        uint256 _fundraisingGoal,
        string memory _name,
        string memory _symbol,
        address _daoManager,
        address _protocolAdmin
    ) {
        require(
            _fundraisingGoal > 0,
            "Fundraising goal must be greater than 0"
        );

        name = _name;
        symbol = _symbol;
        fundraisingGoal = _fundraisingGoal;
        protocolAdmin = _protocolAdmin;

        transferOwnership(_daoManager);
    }

    function startFundraising() external onlyOwner {
        require(fundraisingStartTimestamp == 0, "Fundraising already started");

        fundraisingStartTimestamp = block.timestamp;
        fundraisingDeadline = block.timestamp + 86400;
        emit FundraisingStarted(fundraisingStartTimestamp);
    }

    function contribute() public payable nonReentrant {
        require(fundraisingStartTimestamp > 0, "Fundraising not started");
        require(block.timestamp < fundraisingDeadline, "Fundraising ended");
        require(msg.value >= 0.1 ether, "Minimum contribution is 0.1 ETH");
        require(msg.value <= 0.5 ether, "Maximum contribution is 0.5 ETH");
        require(!hasContributed[msg.sender], "Already contributed!");

        uint256 whitelistEndTime = fundraisingStartTimestamp + 43200;
        if (block.timestamp <= whitelistEndTime) {
            // Whitelist period
            require(whitelist[msg.sender], "Not whitelisted!");
        }

        uint256 effectiveContribution = msg.value;
        if (totalRaised + msg.value > fundraisingGoal) {
            effectiveContribution = fundraisingGoal - totalRaised;
            payable(msg.sender).transfer(msg.value - effectiveContribution);
        }

        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }

        contributions[msg.sender] += effectiveContribution;
        hasContributed[msg.sender] = true;
        totalRaised += effectiveContribution;

        emit Contribution(msg.sender, effectiveContribution);

        if (totalRaised == fundraisingGoal) {
            goalReached = true;
        }
    }

    function addToWhitelist(address[] calldata addresses) external {
        require(
            msg.sender == owner() || msg.sender == protocolAdmin,
            "Must be owner or protocolAdmin"
        );
        for (uint256 i = 0; i < addresses.length; i++) {
            if (!whitelist[addresses[i]]) {
                whitelist[addresses[i]] = true;
                whitelistArray.push(addresses[i]);
                emit AddWhitelist(addresses[i]);
            }
        }
    }

    function getWhitelistLength() public view returns (uint256) {
        return whitelistArray.length;
    }

    function removeFromWhitelist(address removedAddress) external {
        require(
            msg.sender == owner() || msg.sender == protocolAdmin,
            "Must be owner or protocolAdmin"
        );
        whitelist[removedAddress] = false;

        for (uint256 i = 0; i < whitelistArray.length; i++) {
            if (whitelistArray[i] == removedAddress) {
                whitelistArray[i] = whitelistArray[whitelistArray.length - 1];
                whitelistArray.pop();
                break;
            }
        }

        emit RemoveWhitelist(removedAddress);
    }

    // Finalize the fundraising and distribute tokens
    function finalizeFundraising() external onlyOwner {
        require(!fundraisingFinalized, "DAO tokens already minted");

        Spartan token = new Spartan(name, symbol);
        daoToken = address(token);

        uint256 totalSupply = SUPPLY_TO_FUNDRAISERS + EXTRA_SUPPLY;
        token.mint(address(this), totalSupply);

        for (uint256 i = 0; i < contributors.length; i++) {
            address contributor = contributors[i];
            uint256 contribution = contributions[contributor];
            uint256 tokensToDistribute = (contribution *
                SUPPLY_TO_FUNDRAISERS) / totalRaised;

            token.transfer(contributor, tokensToDistribute);
        }

        emit FundraisingFinalized(true);
        fundraisingFinalized = true;

        token.freezeMinting();
    }

    function transferTokenOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        Spartan token = Spartan(daoToken);
        token.transferOwnership(newOwner);
    }

    function transferTokens(
        address recipient,
        uint256 amount
    ) external onlyOwner {
        require(recipient != address(0), "Cannot transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than 0");

        Spartan token = Spartan(daoToken);
        uint256 daoBalance = token.balanceOf(address(this));
        require(amount <= daoBalance, "Insufficient token balance");

        token.transfer(recipient, amount);
    }

    function approveTokens(address spender, uint256 amount) external onlyOwner {
        require(spender != address(0), "Cannot approve the zero address");
        require(amount > 0, "Approval amount must be greater than 0");

        Spartan token = Spartan(daoToken);
        token.approve(spender, amount);
    }

    function emergencyEscape(uint256 amount) external {
        require(msg.sender == protocolAdmin, "must be protocol admin");
        require(amount <= address(this).balance, "Insufficient balance");

        (bool success, ) = protocolAdmin.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // Fallback function to make contributions simply by sending ETH to the contract
    receive() external payable {
        require(!goalReached && block.timestamp < fundraisingDeadline);
        contribute();
    }
}
