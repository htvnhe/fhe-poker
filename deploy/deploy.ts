import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy PokerTable
  const deployedPokerTable = await deploy("PokerTable", {
    from: deployer,
    log: true,
  });

  console.log(`PokerTable contract: `, deployedPokerTable.address);
};
export default func;
func.id = "deploy_pokerTable";
func.tags = ["PokerTable"];
