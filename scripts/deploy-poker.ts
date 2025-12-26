import { ethers } from "hardhat";

async function main() {
  console.log("Deploying PokerTable...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const PokerTable = await ethers.getContractFactory("PokerTable");
  const pokerTable = await PokerTable.deploy();

  await pokerTable.waitForDeployment();

  const address = await pokerTable.getAddress();
  console.log("PokerTable deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
