import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log('📦 Deploying PokerTable ...');

  const result = await deploy('PokerTable', {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 2,
    deterministicDeployment: false, // Force new deployment
  });

  const addr = result.address;
  log(`✅ PokerTable deployed at: ${addr}`);

  // Basic sanity: read a public var to ensure contract is reachable
  const poker = await ethers.getContractAt('PokerTable', addr);
  const tableCount = await poker.tableCount();
  log(`ℹ️  tableCount (initial): ${tableCount}`);
};

export default func;
func.tags = ['PokerTable'];
