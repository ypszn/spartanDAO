// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Spartan is ERC20, Ownable {
    bool public mintingFrozen = false;

    uint256 public buyTax = 5;
    uint256 public sellTax = 5;

    mapping(address => bool) public isLiquidityPool;

    event TaxesUpdated(uint256 buyTax, uint256 sellTax);
    event LiquidityPoolUpdated(address liquidityPool, bool isPool);

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {}

    function mint(address _to, uint256 _amount) external onlyOwner {
        require(!mintingFrozen, "Minting is frozen");
        _mint(_to, _amount);
    }

    function freezeMinting() external onlyOwner {
        mintingFrozen = true;
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function setLiquidityPool(address pool, bool isPool) external onlyOwner {
        require(pool != address(0), "Invalid pool address");
        isLiquidityPool[pool] = isPool;

        emit LiquidityPoolUpdated(pool, isPool);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        uint256 tax = 0;
        if (isLiquidityPool[sender]) {
            tax = (amount * buyTax) / 100;
        } else if (isLiquidityPool[recipient]) {
            tax = (amount * sellTax) / 100;
        }

        if (tax > 0) {
            super._transfer(sender, owner(), tax);
            amount -= tax;
        }

        super._transfer(sender, recipient, amount);
    }
}
