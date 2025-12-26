import { expect } from "chai";
import { ethers } from "hardhat";
import { PokerTable } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PokerTable", function () {
  let pokerTable: PokerTable;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  beforeEach(async function () {
    // 获取签名者
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // 部署合约
    const PokerTableFactory = await ethers.getContractFactory("PokerTable");
    pokerTable = await PokerTableFactory.deploy();
    await pokerTable.waitForDeployment();
  });

  describe("创建游戏桌", function () {
    it("应该成功创建游戏桌", async function () {
      const smallBlind = 10;
      const bigBlind = 20;

      const tx = await pokerTable.createTable(smallBlind, bigBlind);
      await tx.wait();

      // 验证游戏桌数量
      const tableCount = await pokerTable.tableCount();
      expect(tableCount).to.equal(1);

      // 验证游戏桌信息
      const tableInfo = await pokerTable.getTableInfo(0);
      expect(tableInfo.state).to.equal(0); // Waiting状态
      expect(tableInfo.playerCount).to.equal(0);
    });

    it("应该拒绝无效的盲注设置", async function () {
      await expect(
        pokerTable.createTable(0, 20)
      ).to.be.revertedWith("Small blind must be positive");

      await expect(
        pokerTable.createTable(20, 20)
      ).to.be.revertedWith("Big blind must be at least 2x small blind");
    });
  });

  describe("玩家管理", function () {
    let tableId: number;

    beforeEach(async function () {
      // 创建游戏桌
      const tx = await pokerTable.createTable(10, 20);
      await tx.wait();
      tableId = 0;
    });

    it("应该允许玩家加入游戏桌", async function () {
      // 注意: 这里需要FHEVM加密,暂时跳过
      // 在实际测试中需要使用fhevm.createEncryptedInput
      console.log("  ⚠️  需要FHEVM环境才能完整测试加入功能");
    });

    it("应该允许玩家离开游戏桌", async function () {
      // 需要先加入才能离开
      console.log("  ⚠️  需要FHEVM环境才能完整测试离开功能");
    });
  });

  describe("游戏流程", function () {
    it("应该正确初始化游戏状态", async function () {
      const tx = await pokerTable.createTable(10, 20);
      await tx.wait();

      const tableInfo = await pokerTable.getTableInfo(0);
      expect(tableInfo.state).to.equal(0); // Waiting
      expect(tableInfo.playerCount).to.equal(0);
      expect(tableInfo.activePlayers).to.equal(0);
    });
  });

  describe("查询函数", function () {
    let tableId: number;

    beforeEach(async function () {
      const tx = await pokerTable.createTable(10, 20);
      await tx.wait();
      tableId = 0;
    });

    it("应该能获取游戏桌信息", async function () {
      const tableInfo = await pokerTable.getTableInfo(tableId);
      
      expect(tableInfo.state).to.equal(0); // Waiting
      expect(tableInfo.playerCount).to.equal(0);
      expect(tableInfo.activePlayers).to.equal(0);
      expect(tableInfo.currentPlayerIndex).to.equal(0);
    });

    it("应该能获取公共牌", async function () {
      const communityCards = await pokerTable.getCommunityCards(tableId);
      
      // 初始状态应该都是0
      expect(communityCards.length).to.equal(5);
      expect(communityCards[0]).to.equal(0);
    });

    it("查询不存在的游戏桌应该失败", async function () {
      await expect(
        pokerTable.getTableInfo(999)
      ).to.be.reverted;
    });
  });

  describe("合约部署", function () {
    it("应该正确部署合约", async function () {
      const address = await pokerTable.getAddress();
      expect(address).to.be.properAddress;
    });

    it("初始游戏桌数量应该为0", async function () {
      const tableCount = await pokerTable.tableCount();
      expect(tableCount).to.equal(0);
    });
  });
});
