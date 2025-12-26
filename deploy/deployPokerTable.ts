import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🎮 开始部署 PokerTable 合约...");
  console.log("📍 部署者地址:", deployer);

  const deployedPokerTable = await deploy("PokerTable", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log("✅ PokerTable 合约已部署!");
  console.log("📍 合约地址:", deployedPokerTable.address);
  console.log("");
  console.log("🔧 请更新前端配置:");
  console.log(`frontend/src/lib/contract.ts 中的 POKER_TABLE_ADDRESS = '${deployedPokerTable.address}'`);
  console.log("");
};

export default func;
func.id = "deploy_pokerTable";
func.tags = ["PokerTable"];
