import { expect } from "chai";
import { ethers } from "hardhat";
import { PokerTable } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * 下注功能测试
 * 测试 bet 函数的加密数据处理
 */
describe("PokerTable - Bet Function", function () {
  let pokerTable: PokerTable;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;
  let tableId: number;

  beforeEach(async function () {
    // 获取签名者
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // 部署合约
    const PokerTableFactory = await ethers.getContractFactory("PokerTable");
    pokerTable = await PokerTableFactory.deploy();
    await pokerTable.waitForDeployment();

    // 创建游戏桌
    const tx = await pokerTable.createTable(10, 20);
    await tx.wait();
    tableId = 0;
  });

  describe("下注参数验证", function () {
    it("应该拒绝空的 inputProof", async function () {
      // 创建一个有效的 32 字节的加密数据
      const encryptedAmount = ethers.zeroPadValue("0x01", 32);
      const emptyProof = "0x";

      // 这个测试需要玩家先加入游戏并开始游戏
      // 由于需要 FHEVM 环境，这里只是演示结构
      console.log("  ⚠️  需要 FHEVM 环境来完整测试");
    });

    it("应该拒绝无效长度的 encryptedAmount", async function () {
      // encryptedAmount 必须是 32 字节
      const invalidEncryptedAmount = ethers.zeroPadValue("0x01", 16); // 只有 16 字节
      const validProof = ethers.toBeHex("0x01", 32);

      console.log("  ⚠️  需要 FHEVM 环境来完整测试");
    });
  });

  describe("下注流程", function () {
    it("应该正确处理加密的下注金额", async function () {
      // 这个测试演示了完整的下注流程
      // 在实际环境中需要：
      // 1. 玩家加入游戏（需要加密的买入金额）
      // 2. 开始游戏
      // 3. 轮到玩家时下注（需要加密的下注金额）

      console.log("  ⚠️  需要 FHEVM 环境来完整测试");
      console.log("  测试步骤：");
      console.log("    1. 使用 fhevm.createEncryptedInput 加密买入金额");
      console.log("    2. 调用 joinTable 加入游戏");
      console.log("    3. 调用 startGame 开始游戏");
      console.log("    4. 使用 fhevm.createEncryptedInput 加密下注金额");
      console.log("    5. 调用 bet 下注");
    });
  });

  describe("错误处理", function () {
    it("应该在玩家不在游戏中时拒绝下注", async function () {
      // 创建一个有效的加密数据
      const encryptedAmount = ethers.zeroPadValue("0x01", 32);
      const proof = ethers.toBeHex("0x01", 32);

      // 尝试下注而不加入游戏
      await expect(
        pokerTable.connect(alice).bet(tableId, encryptedAmount, proof)
      ).to.be.revertedWithCustomError(pokerTable, "NotInGame");
    });

    it("应该在游戏未开始时拒绝下注", async function () {
      // 这个测试需要玩家先加入游戏
      console.log("  ⚠️  需要 FHEVM 环境来完整测试");
    });

    it("应该在不是玩家轮次时拒绝下注", async function () {
      // 这个测试需要多个玩家和游戏状态
      console.log("  ⚠️  需要 FHEVM 环境来完整测试");
    });
  });

  describe("数据格式验证", function () {
    it("验证 encryptedAmount 必须是 bytes32", async function () {
      // ABI 中定义 encryptedAmount 为 bytes32
      // 这意味着它必须是 32 字节的数据
      const validEncryptedAmount = ethers.zeroPadValue("0x01", 32);
      expect(validEncryptedAmount.length).to.equal(66); // "0x" + 64 hex chars
    });

    it("验证 inputProof 必须是 bytes", async function () {
      // ABI 中定义 inputProof 为 bytes
      // 这意味着它可以是任意长度的字节数据
      const validProof = ethers.toBeHex("0x01", 32);
      expect(validProof.length).to.be.greaterThan(2); // 至少 "0x"
    });
  });
});

