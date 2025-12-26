// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title CipherTable
 * @notice 基于FHEVM的隐私德州扑克游戏合约
 * @dev 使用全同态加密保护玩家手牌隐私
 */
contract CipherTable is ZamaEthereumConfig {
    
    // ============ 常量定义 ============
    
    uint8 public constant MAX_PLAYERS = 6;          // 最大玩家数
    uint8 public constant MIN_PLAYERS = 2;          // 最小玩家数
    uint8 public constant CARDS_PER_PLAYER = 2;     // 每位玩家的手牌数
    uint8 public constant COMMUNITY_CARDS = 5;      // 公共牌数量
    uint256 public constant BET_TIMEOUT = 60;       // 下注超时时间(秒)
    
    // ============ 枚举定义 ============
    
    /**
     * @notice 游戏状态枚举
     */
    enum GameState {
        Waiting,        // 等待玩家加入
        PreFlop,        // 翻牌前(已发手牌,未发公共牌)
        Flop,           // 翻牌圈(已发3张公共牌)
        Turn,           // 转牌圈(已发4张公共牌)
        River,          // 河牌圈(已发5张公共牌)
        Showdown,       // 摊牌阶段(等待解密)
        Finished        // 游戏结束
    }
    
    /**
     * @notice 玩家动作枚举
     */
    enum PlayerAction {
        None,           // 无动作
        Fold,           // 弃牌
        Check,          // 过牌
        Call,           // 跟注
        Raise,          // 加注
        AllIn           // 全下
    }
    
    /**
     * @notice 牌型枚举 (从小到大)
     */
    enum HandRank {
        HighCard,       // 高牌
        OnePair,        // 一对
        TwoPair,        // 两对
        ThreeOfKind,    // 三条
        Straight,       // 顺子
        Flush,          // 同花
        FullHouse,      // 葫芦
        FourOfKind,     // 四条
        StraightFlush,  // 同花顺
        RoyalFlush      // 皇家同花顺
    }
    
    // ============ 数据结构定义 ============
    
    /**
     * @notice 玩家信息结构
     */
    struct Player {
        address addr;               // 玩家地址
        euint64 balance;            // 加密余额
        euint8 card1;               // 加密手牌1 (0-51)
        euint8 card2;               // 加密手牌2 (0-51)
        uint8 decryptedCard1;       // 解密后的手牌1 (Showdown阶段使用)
        uint8 decryptedCard2;       // 解密后的手牌2 (Showdown阶段使用)
        bool hasRevealedCards;      // 是否已公开手牌
        bool hasFolded;             // 是否已弃牌
        bool isActive;              // 是否在游戏中
        euint64 currentBet;         // 当前轮下注金额
        euint64 totalBet;           // 总下注金额
        PlayerAction lastAction;    // 最后一次动作
        uint256 lastActionTime;     // 最后动作时间
    }
    
    /**
     * @notice 游戏桌信息结构
     */
    struct Table {
        GameState state;            // 游戏状态
        uint8 playerCount;          // 当前玩家数
        uint8 activePlayers;        // 活跃玩家数(未弃牌)
        uint8 communityCardCount;   // 已发公共牌数量
        uint8 currentPlayerIndex;   // 当前行动玩家索引
        uint8 dealerIndex;          // 庄家位置
        uint8 smallBlindIndex;      // 小盲位置
        uint8 bigBlindIndex;        // 大盲位置
        uint256 smallBlind;         // 小盲注金额
        uint256 bigBlind;           // 大盲注金额
        uint256 roundStartTime;     // 当前轮开始时间
        bool isDecryptionPending;   // 是否等待解密
        uint8 lastRaiserIndex;      // 最后一个加注的玩家索引
        bool bettingRoundComplete;  // 当前下注轮次是否完成
        uint8 winnerIndex;          // 获胜者索引 (255 表示未决出)
    }
    
    /**
     * @notice 牌型评估结果结构
     */
    struct HandEvaluation {
        euint8 rank;                // 牌型等级
        euint8 highCard;            // 最大牌
        euint8 kicker1;             // 踢脚牌1
        euint8 kicker2;             // 踢脚牌2
    }
    
    // ============ 状态变量 ============
    
    uint256 public tableCount;                              // 游戏桌映射
    mapping(uint256 => Table) public tables;
    mapping(uint256 => Player[MAX_PLAYERS]) public tablePlayers;
    mapping(uint256 => uint8[COMMUNITY_CARDS]) public tableCommunityCards; // 桌号 => 公共牌
    mapping(uint256 => euint64) public tablePots;           // 桌号 => 主奖池（加密）
    mapping(uint256 => uint256) public tablePotAmounts;     // 桌号 => 主奖池（明文，用于显示）
    mapping(uint256 => euint64[]) public tableSidePots;     // 桌号 => 边池数组
    mapping(uint256 => euint64) public tableCurrentBets;    // 桌号 => 当前最高注（加密）
    mapping(uint256 => uint256) public tableCurrentBetAmounts; // 桌号 => 当前最高注（明文，用于显示）
    mapping(address => uint256) public playerTable;         // 玩家所在桌号
    mapping(address => euint64) public playerBalances;      // 玩家总余额
    
    // ============ 事件定义 ============
    
    event TableCreated(uint256 indexed tableId, uint256 smallBlind, uint256 bigBlind);
    event PlayerJoined(uint256 indexed tableId, address indexed player, uint8 seatIndex);
    event PlayerLeft(uint256 indexed tableId, address indexed player);
    event GameStarted(uint256 indexed tableId, uint8 playerCount);
    event StateChanged(uint256 indexed tableId, GameState from, GameState to);
    event PlayerActioned(uint256 indexed tableId, address indexed player, PlayerAction action, uint256 amount);
    event CardsDealt(uint256 indexed tableId, GameState gameState);
    event GameFinished(uint256 indexed tableId, address indexed winner, uint256 winnings);
    event GameEnded(uint256 indexed tableId, address indexed winner, uint8 winnerIndex);
    event DecryptionRequested(uint256 indexed tableId, uint256 requestId);
    event TurnChanged(uint256 indexed tableId, uint8 newPlayerIndex, address newPlayer);
    event CardsRevealed(uint256 indexed tableId, address indexed player, uint8 card1, uint8 card2);
    event ShowdownComplete(uint256 indexed tableId, address indexed winner, uint8 winnerIndex, HandRank handRank);
    
    // ============ 错误定义 ============
    
    error TableFull();
    error TableNotFound();
    error NotInGame();
    error AlreadyInGame();
    error InvalidState();
    error NotYourTurn();
    error InsufficientBalance();
    error InvalidBetAmount();
    error ActionTimeout();
    error MinPlayersNotMet();
    error InvalidPlayerIndex();
    error InvalidEncryptedData();
    error InvalidProofData();
    error InvalidEncryptedAmount();
    error ProofVerificationFailed();
    error CardsAlreadyRevealed();
    error CardsNotRevealed();
    error InvalidCardValue();
    
    // ============ 修饰器 ============
    
    /**
     * @notice 检查游戏桌是否存在
     */
    modifier tableExists(uint256 tableId) {
        if (tableId >= tableCount) revert TableNotFound();
        _;
    }
    
    /**
     * @notice 检查玩家是否在游戏中
     */
    modifier inGame(uint256 tableId) {
        if (playerTable[msg.sender] != tableId + 1) revert NotInGame();
        _;
    }
    
    /**
     * @notice 检查游戏状态
     */
    modifier inState(uint256 tableId, GameState requiredState) {
        if (tables[tableId].state != requiredState) revert InvalidState();
        _;
    }
    
    /**
     * @notice 检查是否轮到当前玩家
     */
    modifier isPlayerTurn(uint256 tableId) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        if (players[table.currentPlayerIndex].addr != msg.sender) {
            revert NotYourTurn();
        }
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor() {
        tableCount = 0;
    }
    
    // ============ 核心函数 ============
    // (将在后续阶段实现)
    
    /**
     * @notice 创建新游戏桌
     * @param smallBlind 小盲注金额
     * @param bigBlind 大盲注金额
     * @return tableId 新创建的游戏桌ID
     */
    function createTable(uint256 smallBlind, uint256 bigBlind) external returns (uint256) {
        require(smallBlind > 0, "Small blind must be positive");
        require(bigBlind >= smallBlind * 2, "Big blind must be at least 2x small blind");
        
        uint256 tableId = tableCount;
        tableCount++;
        
        Table storage table = tables[tableId];
        table.state = GameState.Waiting;
        table.playerCount = 0;
        table.activePlayers = 0;
        table.communityCardCount = 0;
        table.currentPlayerIndex = 0;
        table.dealerIndex = 0;
        table.smallBlind = smallBlind;
        table.bigBlind = bigBlind;
        table.roundStartTime = 0;
        table.isDecryptionPending = false;
        table.winnerIndex = 255; // 255 表示未决出获胜者

        // 初始化奖池和当前下注为0
        tablePots[tableId] = FHE.asEuint64(uint64(0));
        tablePotAmounts[tableId] = 0; // 明文奖池
        tableCurrentBets[tableId] = FHE.asEuint64(uint64(0));
        tableCurrentBetAmounts[tableId] = 0; // 明文当前下注

        // ✅ 为初始化的加密字段设置 ACL 权限
        FHE.allowThis(tablePots[tableId]);
        FHE.allowThis(tableCurrentBets[tableId]);

        emit TableCreated(tableId, smallBlind, bigBlind);
        
        return tableId;
    }
    
    /**
     * @notice 加入游戏桌
     * @param tableId 游戏桌ID
     * @param encryptedBuyIn 加密的买入金额
     * @param inputProof 输入证明
     */
    function joinTable(
        uint256 tableId,
        externalEuint64 encryptedBuyIn,
        bytes calldata inputProof
    ) external tableExists(tableId) {
        Table storage table = tables[tableId];
        
        // 检查游戏状态
        if (table.state != GameState.Waiting) revert InvalidState();
        
        // 检查是否已在游戏中
        // 注意：playerTable 存储的是 tableId + 1，这样默认值 0 表示未在任何桌子中
        if (playerTable[msg.sender] != 0) {
            revert AlreadyInGame();
        }
        
        // 双重检查：确保玩家不在当前桌子中
        if (_isPlayerInTable(tableId, msg.sender)) {
            revert AlreadyInGame();
        }
        
        // 检查是否已满
        if (table.playerCount >= MAX_PLAYERS) revert TableFull();
        
        // 验证并转换加密买入金额
        euint64 buyIn = FHE.fromExternal(encryptedBuyIn, inputProof);
        
        // 检查买入金额是否足够(至少是大盲注)
        // 注意: 这里为了简化,我们暂时跳过加密比较
        // 在生产环境中应该使用完全加密的比较
        
        // 添加玩家到游戏桌
        uint8 seatIndex = table.playerCount;
        Player storage player = tablePlayers[tableId][seatIndex];
        
        player.addr = msg.sender;
        player.balance = buyIn;
        player.card1 = FHE.asEuint8(uint8(0)); // 初始化为0
        player.card2 = FHE.asEuint8(uint8(0));
        player.decryptedCard1 = 0;
        player.decryptedCard2 = 0;
        player.hasRevealedCards = false;
        player.hasFolded = false;
        player.isActive = true;
        player.currentBet = FHE.asEuint64(uint64(0));
        player.totalBet = FHE.asEuint64(uint64(0));
        player.lastAction = PlayerAction.None;
        player.lastActionTime = block.timestamp;

        // 设置ACL权限 - 必须为所有加密字段设置权限
        FHE.allowThis(player.balance);
        FHE.allow(player.balance, msg.sender);

        // ✅ 为 currentBet 和 totalBet 设置 ACL 权限
        // 这些字段在 _processBet 中会被访问,必须有合约权限
        FHE.allowThis(player.currentBet);
        FHE.allowThis(player.totalBet);

        // 为卡牌设置 ACL 权限
        FHE.allowThis(player.card1);
        FHE.allowThis(player.card2);
        // ✅ 允许玩家访问自己的手牌(用于解密)
        FHE.allow(player.card1, msg.sender);
        FHE.allow(player.card2, msg.sender);
        
        table.playerCount++;
        table.activePlayers++;
        
        // 记录玩家所在桌号 (存储 tableId + 1 以避免与默认值 0 冲突)
        playerTable[msg.sender] = tableId + 1;
        
        emit PlayerJoined(tableId, msg.sender, seatIndex);
    }
    
    /**
     * @notice 离开游戏桌
     * @param tableId 游戏桌ID
     * @dev 支持在游戏等待状态和游戏进行中离开
     *      游戏进行中离开会自动弃牌
     */
    function leaveTable(uint256 tableId) external inGame(tableId) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 找到玩家
        uint8 playerIndex = 255; // 255 表示未找到
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (players[i].addr == msg.sender) {
                playerIndex = i;
                break;
            }
        }

        // 验证玩家存在
        if (playerIndex == 255) {
            revert NotInGame();
        }

        Player storage player = players[playerIndex];

        // 如果游戏进行中，先弃牌
        if (table.state != GameState.Waiting) {
            // 游戏进行中：自动弃牌
            if (!player.hasFolded) {
                player.hasFolded = true;
                player.isActive = false;

                // 只有在玩家是活跃的时候才减少计数
                if (table.activePlayers > 0) {
                    table.activePlayers--;
                }

                // 如果只剩一个活跃玩家，游戏结束
                if (table.activePlayers == 1) {
                    _endGame(tableId);
                }
            }
        } else {
            // 游戏等待状态：直接移除玩家
            // 只有在玩家是活跃的时候才减少计数
            if (player.isActive && table.activePlayers > 0) {
                table.activePlayers--;
            }
        }

        // 移除玩家数据
        // 如果不是最后一个玩家，将最后一个玩家移到当前位置
        if (playerIndex < table.playerCount - 1) {
            players[playerIndex] = players[table.playerCount - 1];
        }
        delete players[table.playerCount - 1];

        table.playerCount--;

        // 清除玩家桌号记录
        delete playerTable[msg.sender];

        emit PlayerLeft(tableId, msg.sender);
    }
    
    /**
     * @notice 开始游戏
     * @param tableId 游戏桌ID
     */
    function startGame(uint256 tableId) external tableExists(tableId) inGame(tableId) {
        Table storage table = tables[tableId];
        
        // 检查状态
        if (table.state != GameState.Waiting) revert InvalidState();
        
        // 检查玩家数量
        if (table.playerCount < MIN_PLAYERS) revert MinPlayersNotMet();
        
        // 更新状态为PreFlop
        table.state = GameState.PreFlop;
        table.roundStartTime = block.timestamp;
        
        // 重置所有玩家状态
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        for (uint8 i = 0; i < table.playerCount; i++) {
            players[i].hasFolded = false;
            players[i].isActive = true;
            players[i].hasRevealedCards = false;
            players[i].decryptedCard1 = 0;
            players[i].decryptedCard2 = 0;
            players[i].currentBet = FHE.asEuint64(uint64(0));
            players[i].totalBet = FHE.asEuint64(uint64(0));
            players[i].lastAction = PlayerAction.None;

            // ✅ 为重置的加密字段设置 ACL 权限
            FHE.allowThis(players[i].currentBet);
            FHE.allowThis(players[i].totalBet);
        }
        
        table.activePlayers = table.playerCount;
        table.lastRaiserIndex = 255; // 255表示无加注者
        table.bettingRoundComplete = false;
        
        // 设置盲注位置
        table.dealerIndex = 0;
        
        if (table.playerCount == 2) {
            // 2人桌：庄家是小盲注，另一个是大盲注
            table.smallBlindIndex = table.dealerIndex; // 0
            table.bigBlindIndex = (table.dealerIndex + 1) % table.playerCount; // 1
            // 翻牌前小盲注先行动
            table.currentPlayerIndex = table.smallBlindIndex; // 0
        } else {
            // 多人桌：庄家左边是小盲注，再左边是大盲注
            table.smallBlindIndex = (table.dealerIndex + 1) % table.playerCount;
            table.bigBlindIndex = (table.dealerIndex + 2) % table.playerCount;
            // 从大盲位下家开始
            table.currentPlayerIndex = (table.bigBlindIndex + 1) % table.playerCount;
        }
        
        // 收取盲注
        _collectBlinds(tableId);
        
        // 发放手牌
        _dealHoleCards(tableId);
        
        emit GameStarted(tableId, table.playerCount);
        emit StateChanged(tableId, GameState.Waiting, GameState.PreFlop);
    }
    
    /**
     * @notice 下注/加注
     * @param tableId 游戏桌ID
     * @param amount 下注金额（明文）
     * @param encryptedAmount 加密的下注金额
     * @param inputProof 输入证明
     */
    function bet(
        uint256 tableId,
        uint256 amount,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external inGame(tableId) isPlayerTurn(tableId) {
        // 调试：检查游戏状态
        Table storage table = tables[tableId];
        require(table.state != GameState.Waiting, "Game has not started");

        _processBet(tableId, amount, encryptedAmount, inputProof);

        // 设置加注者，重置其他玩家的行动状态
        _handleRaise(tableId);
    }
    
    /**
     * @notice 处理加注逻辑
     * @param tableId 游戏桌ID
     */
    function _handleRaise(uint256 tableId) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        
        // 设置当前玩家为最后加注者
        table.lastRaiserIndex = table.currentPlayerIndex;
        
        // 重置其他玩家的行动状态（除了当前加注者）
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (i != table.currentPlayerIndex && !players[i].hasFolded && players[i].isActive) {
                // 其他玩家需要重新行动来响应加注
                players[i].lastAction = PlayerAction.None;
            }
        }
        
        // 移动到下一个玩家
        _moveToNextActivePlayer(tableId);
        
        // 检查本轮是否结束
        _checkRoundEnd(tableId);
    }
    
    /**
     * @notice 弃牌
     * @param tableId 游戏桌ID
     */
    function fold(uint256 tableId) external inGame(tableId) isPlayerTurn(tableId) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        Player storage player = players[table.currentPlayerIndex];
        
        // 标记为弃牌
        player.hasFolded = true;
        player.isActive = false;
        player.lastAction = PlayerAction.Fold;
        player.lastActionTime = block.timestamp;
        
        table.activePlayers--;
        
        emit PlayerActioned(tableId, msg.sender, PlayerAction.Fold, 0);
        
        // 检查是否只剩一人
        if (table.activePlayers == 1) {
            _endGame(tableId);
            return;
        }
        
        // 移动到下一个玩家
        _moveToNextActivePlayer(tableId);
        
        // 检查本轮是否结束
        _checkRoundEnd(tableId);
    }
    
    /**
     * @notice 过牌
     * @param tableId 游戏桌ID
     */
    function check(uint256 tableId) external inGame(tableId) isPlayerTurn(tableId) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        Player storage player = players[table.currentPlayerIndex];
        
        // 只有当前下注为0时才能过牌
        // 简化版本: 暂不检查加密下注，但需要验证没有未跟注的下注
        
        player.lastAction = PlayerAction.Check;
        player.lastActionTime = block.timestamp;
        
        emit PlayerActioned(tableId, msg.sender, PlayerAction.Check, 0);
        
        // 移动到下一个玩家
        _moveToNextActivePlayer(tableId);
        
        // 检查本轮是否结束
        _checkRoundEnd(tableId);
    }
    
    /**
     * @notice 跟注
     * @param tableId 游戏桌ID
     */
    function call(uint256 tableId) external inGame(tableId) isPlayerTurn(tableId) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        Player storage player = players[table.currentPlayerIndex];

        // 计算需要跟注的金额（当前最高注 - 玩家已下注金额）
        uint256 callAmount = tableCurrentBetAmounts[tableId];

        // 注意：这里简化处理，假设玩家有足够余额
        // 实际应该检查余额是否足够

        // 更新奖池（明文）
        tablePotAmounts[tableId] += callAmount;

        // 同时更新加密奖池（保持一致性）
        euint64 encryptedCallAmount = FHE.asEuint64(uint64(callAmount));
        FHE.allowThis(encryptedCallAmount);
        tablePots[tableId] = FHE.add(tablePots[tableId], encryptedCallAmount);
        FHE.allowThis(tablePots[tableId]);

        // 从玩家余额中扣除
        player.balance = FHE.sub(player.balance, encryptedCallAmount);
        FHE.allowThis(player.balance);
        FHE.allow(player.balance, msg.sender);

        player.lastAction = PlayerAction.Call;
        player.lastActionTime = block.timestamp;

        emit PlayerActioned(tableId, msg.sender, PlayerAction.Call, callAmount);

        // 移动到下一个玩家
        _moveToNextActivePlayer(tableId);

        // 检查本轮是否结束
        _checkRoundEnd(tableId);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @notice 获取游戏桌信息
     * @param tableId 游戏桌ID
     */
    function getTableInfo(uint256 tableId) 
        external 
        view 
        tableExists(tableId) 
        returns (
            GameState state,
            uint8 playerCount,
            uint8 activePlayers,
            uint8 currentPlayerIndex,
            uint8 dealerIndex,
            uint8 smallBlindIndex,
            uint8 bigBlindIndex,
            uint8 communityCardCount,
            uint256 smallBlind,
            uint256 bigBlind
        ) 
    {
        Table storage table = tables[tableId];
        return (
            table.state,
            table.playerCount,
            table.activePlayers,
            table.currentPlayerIndex,
            table.dealerIndex,
            table.smallBlindIndex,
            table.bigBlindIndex,
            table.communityCardCount,
            table.smallBlind,
            table.bigBlind
        );
    }
    
    /**
     * @notice 获取下注轮次信息
     * @param tableId 游戏桌ID
     */
    function getBettingRoundInfo(uint256 tableId) 
        external 
        view 
        tableExists(tableId) 
        returns (
            uint8 lastRaiserIndex,
            bool bettingRoundComplete,
            uint256 roundStartTime
        ) 
    {
        Table storage table = tables[tableId];
        return (
            table.lastRaiserIndex,
            table.bettingRoundComplete,
            table.roundStartTime
        );
    }
    
    /**
     * @notice 获取玩家手牌(加密)
     * @param tableId 游戏桌ID
     * @return card1 手牌1(加密)
     * @return card2 手牌2(加密)
     */
    function getPlayerCards(uint256 tableId) 
        external 
        view 
        inGame(tableId) 
        returns (euint8 card1, euint8 card2) 
    {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (players[i].addr == msg.sender) {
                return (players[i].card1, players[i].card2);
            }
        }
        revert NotInGame();
    }
    
    /**
     * @notice 获取玩家在桌子中的索引
     * @param tableId 游戏桌ID
     * @param player 玩家地址
     * @return 玩家索引
     */
    function getPlayerIndex(uint256 tableId, address player) external view tableExists(tableId) returns (uint8) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        for (uint8 i = 0; i < table.playerCount; i++) {
            if (players[i].addr == player) {
                return i;
            }
        }

        revert NotInGame();
    }
    
    /**
     * @notice 获取指定位置玩家的地址（调试用）
     * @param tableId 游戏桌ID
     * @param playerIndex 玩家索引
     * @return 玩家地址
     */
    function getPlayerAddress(uint256 tableId, uint8 playerIndex) external view returns (address) {
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        return players[playerIndex].addr;
    }
    
    /**
     * @notice 获取玩家是否有足够余额（调试用）
     * @param tableId 游戏桌ID
     * @param playerIndex 玩家索引
     * @return 玩家是否激活
     */
    function getPlayerActive(uint256 tableId, uint8 playerIndex) external view returns (bool) {
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        return players[playerIndex].isActive;
    }
    
    /**
     * @notice 检查玩家是否能下注指定金额（调试用）
     * @param tableId 游戏桌ID
     * @param playerIndex 玩家索引
     * @param amount 明文金额
     * @return 是否有足够余额
     * @dev 注意：这个函数返回的是加密的布尔值，需要在链下解密
     */
    function canPlayerBet(uint256 tableId, uint8 playerIndex, uint64 amount) external view returns (bool) {
        // 简化版本：由于无法在链上解密，返回 true
        // 实际的余额检查应该在链下进行
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        require(playerIndex < MAX_PLAYERS, "Invalid player index");
        require(players[playerIndex].addr != address(0), "Player not found");
        return true;
    }
    
    /**
     * @notice 获取公共牌
     * @param tableId 游戏桌ID
     * @return cards 公共牌数组
     */
    function getCommunityCards(uint256 tableId)
        external
        view
        tableExists(tableId)
        returns (uint8[COMMUNITY_CARDS] memory cards)
    {
        return tableCommunityCards[tableId];
    }

    /**
     * @notice 获取玩家是否已公开手牌
     * @param tableId 游戏桌ID
     * @param playerIndex 玩家索引
     * @return 是否已公开手牌
     */
    function hasPlayerRevealedCards(uint256 tableId, uint8 playerIndex) external view returns (bool) {
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        require(playerIndex < MAX_PLAYERS, "Invalid player index");
        return players[playerIndex].hasRevealedCards;
    }

    /**
     * @notice 获取玩家公开的手牌
     * @param tableId 游戏桌ID
     * @param playerIndex 玩家索引
     * @return card1 手牌1
     * @return card2 手牌2
     */
    function getRevealedCards(uint256 tableId, uint8 playerIndex) external view returns (uint8, uint8) {
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        require(playerIndex < MAX_PLAYERS, "Invalid player index");
        require(players[playerIndex].hasRevealedCards, "Cards not revealed");
        return (players[playerIndex].decryptedCard1, players[playerIndex].decryptedCard2);
    }

    /**
     * @notice 获取获胜者信息
     * @param tableId 游戏桌ID
     * @return winnerIndex 获胜者索引 (255 表示未决出)
     * @return winnerAddress 获胜者地址
     */
    function getWinner(uint256 tableId) external view returns (uint8 winnerIndex, address winnerAddress) {
        Table storage table = tables[tableId];
        winnerIndex = table.winnerIndex;

        if (winnerIndex != 255 && winnerIndex < table.playerCount) {
            Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
            winnerAddress = players[winnerIndex].addr;
        } else {
            winnerAddress = address(0);
        }
    }

    /**
     * @notice 获取游戏桌完整信息（包括玩家和奖池）
     * @param tableId 游戏桌ID
     * @return players 玩家地址数组
     * @return playerBets 玩家当前下注数组（明文，仅用于显示）
     * @return playerFolded 玩家是否弃牌数组
     * @return currentPlayerIndex 当前玩家索引
     * @return pot 奖池金额（明文）
     * @return dealerIndex 庄家索引
     */
    function getTableInfoWithPlayers(uint256 tableId)
        external
        view
        tableExists(tableId)
        returns (
            address[MAX_PLAYERS] memory players,
            uint256[MAX_PLAYERS] memory playerBets,
            bool[MAX_PLAYERS] memory playerFolded,
            uint8 currentPlayerIndex,
            uint256 pot,
            uint8 dealerIndex
        )
    {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage tablePlayers_ = tablePlayers[tableId];

        // 填充玩家信息
        for (uint8 i = 0; i < MAX_PLAYERS; i++) {
            if (i < table.playerCount) {
                players[i] = tablePlayers_[i].addr;
                // 注意：下注金额是加密的，这里返回0
                // 实际应用中可以维护明文版本用于显示
                playerBets[i] = 0;
                playerFolded[i] = tablePlayers_[i].hasFolded;
            } else {
                players[i] = address(0);
                playerBets[i] = 0;
                playerFolded[i] = false;
            }
        }

        currentPlayerIndex = table.currentPlayerIndex;
        // 返回明文奖池金额
        pot = tablePotAmounts[tableId];
        dealerIndex = table.dealerIndex;
    }

    // ============ 内部辅助函数 ============
    
    /**
     * @notice 检查玩家是否在指定游戏桌中
     * @param tableId 游戏桌ID
     * @param player 玩家地址
     * @return 是否在游戏桌中
     */
    function _isPlayerInTable(uint256 tableId, address player) internal view returns (bool) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (players[i].addr == player) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice 发放手牌给所有玩家
     * @param tableId 游戏桌ID
     */
    function _dealHoleCards(uint256 tableId) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 为每位玩家发2张加密手牌
        for (uint8 i = 0; i < table.playerCount; i++) {
            // 生成第一张牌 (1-52)，0 表示未发的牌
            euint8 card1 = FHE.add(FHE.rem(FHE.randEuint8(), 52), FHE.asEuint8(1));

            // 生成第二张牌 (1-52)
            euint8 card2 = FHE.add(FHE.rem(FHE.randEuint8(), 52), FHE.asEuint8(1));

            // 分配给玩家
            players[i].card1 = card1;
            players[i].card2 = card2;

            // 设置ACL权限 - 只有玩家自己和合约可以访问
            FHE.allowThis(card1);
            FHE.allow(card1, players[i].addr);

            FHE.allowThis(card2);
            FHE.allow(card2, players[i].addr);
        }

        emit CardsDealt(tableId, GameState.PreFlop);
    }
    
    /**
     * @notice 发放公共牌
     * @param tableId 游戏桌ID
     * @param count 发牌数量 (3 for Flop, 1 for Turn/River)
     */
    function _dealCommunityCards(uint256 tableId, uint8 count) internal {
        Table storage table = tables[tableId];
        uint8[COMMUNITY_CARDS] storage communityCards = tableCommunityCards[tableId];

        for (uint8 i = 0; i < count; i++) {
            // 生成随机牌 (1-52)，0 表示未发的牌
            // 注意: 这里简化处理,实际应该检查重复
            uint8 cardIndex = table.communityCardCount;

            // 使用block.timestamp和cardIndex作为随机源
            uint256 randomValue = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                tableId,
                cardIndex,
                i
            )));

            // 生成 1-52 的随机数（而不是 0-51）
            communityCards[cardIndex] = uint8((randomValue % 52) + 1);
            table.communityCardCount++; // ✅ 增加公共牌计数
        }
    }
    
    /**
     * @notice 进入下一个游戏阶段
     * @param tableId 游戏桌ID
     */
    function _nextGameState(uint256 tableId) internal {
        Table storage table = tables[tableId];
        GameState oldState = table.state;
        GameState newState;
        
        if (table.state == GameState.PreFlop) {
            // PreFlop -> Flop: 发3张公共牌
            _dealCommunityCards(tableId, 3);
            newState = GameState.Flop;
        } else if (table.state == GameState.Flop) {
            // Flop -> Turn: 发1张公共牌
            _dealCommunityCards(tableId, 1);
            newState = GameState.Turn;
        } else if (table.state == GameState.Turn) {
            // Turn -> River: 发1张公共牌
            _dealCommunityCards(tableId, 1);
            newState = GameState.River;
        } else if (table.state == GameState.River) {
            // River -> Showdown: 准备摊牌
            newState = GameState.Showdown;
        } else {
            revert InvalidState();
        }
        
        table.state = newState;
        table.roundStartTime = block.timestamp;
        
        // 重置下注轮次
        _resetBettingRound(tableId);
        
        // 翻牌后从小盲注开始行动
        table.currentPlayerIndex = table.smallBlindIndex;
        
        // 跳过已弃牌的玩家
        _moveToNextActivePlayer(tableId);
        
        emit StateChanged(tableId, oldState, newState);
        emit CardsDealt(tableId, newState);
    }
    
    /**
     * @notice 移动到下一个活跃玩家
     * @param tableId 游戏桌ID
     */
    function _moveToNextActivePlayer(uint256 tableId) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 检查是否有玩家
        if (table.playerCount == 0) {
            return;
        }

        uint8 startIndex = table.currentPlayerIndex;
        uint8 attempts = 0;

        // 最多尝试MAX_PLAYERS次,避免死循环
        while (attempts < MAX_PLAYERS) {
            table.currentPlayerIndex = (table.currentPlayerIndex + 1) % table.playerCount;

            // 找到未弃牌的玩家
            if (!players[table.currentPlayerIndex].hasFolded) {
                emit TurnChanged(tableId, table.currentPlayerIndex, players[table.currentPlayerIndex].addr);
                return;
            }

            attempts++;

            // 如果回到起点,说明没有活跃玩家了
            if (table.currentPlayerIndex == startIndex && attempts > 0) {
                break;
            }
        }
    }
    
    /**
     * @notice 检查当前轮是否结束
     * @param tableId 游戏桌ID
     */
    function _checkRoundEnd(uint256 tableId) internal {
        if (_isRoundComplete(tableId)) {
            _advanceGameState(tableId);
        }
    }
    
    /**
     * @notice 检查轮次是否完成
     * @param tableId 游戏桌ID
     */
    function _isRoundComplete(uint256 tableId) internal view returns (bool) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        
        (uint8 activePlayerCount, uint8 playersActioned) = _getPlayerCounts(tableId);
        
        // 基本条件检查
        if (playersActioned == 0 || playersActioned < activePlayerCount) {
            return false;
        }
        
        // 检查加注响应逻辑
        if (table.lastRaiserIndex != 255) {
            return _allPlayersRespondedToRaise(tableId);
        }
        
        return activePlayerCount > 1;
    }
    
    /**
     * @notice 统计玩家数量
     * @param tableId 游戏桌ID
     */
    function _getPlayerCounts(uint256 tableId) internal view returns (uint8 activePlayerCount, uint8 playersActioned) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (!players[i].hasFolded && players[i].isActive) {
                activePlayerCount++;
                if (players[i].lastAction != PlayerAction.None) {
                    playersActioned++;
                }
            }
        }
    }
    
    /**
     * @notice 检查所有玩家是否已响应加注
     * @param tableId 游戏桌ID
     */
    function _allPlayersRespondedToRaise(uint256 tableId) internal view returns (bool) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (!players[i].hasFolded && players[i].isActive && i != table.lastRaiserIndex) {
                if (players[i].lastAction == PlayerAction.None) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * @notice 推进游戏状态
     * @param tableId 游戏桌ID
     */
    function _advanceGameState(uint256 tableId) internal {
        Table storage table = tables[tableId];
        
        if (table.state == GameState.River) {
            table.state = GameState.Showdown;
            emit StateChanged(tableId, GameState.River, GameState.Showdown);
        } else {
            _nextGameState(tableId);
        }
    }
    
    /**
     * @notice 结束游戏
     * @param tableId 游戏桌ID
     */
    function _endGame(uint256 tableId) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 保存当前游戏状态用于事件
        GameState previousState = table.state;

        // 找到唯一的获胜者
        address winner = address(0);
        uint8 winnerIndex = 255;

        for (uint8 i = 0; i < table.playerCount; i++) {
            if (!players[i].hasFolded) {
                winner = players[i].addr;
                winnerIndex = i;
                break;
            }
        }

        // 如果找到获胜者，分配奖池
        if (winnerIndex != 255 && winner != address(0)) {
            players[winnerIndex].balance = FHE.add(
                players[winnerIndex].balance,
                tablePots[tableId]
            );
            // ✅ 为更新后的余额设置 ACL 权限
            FHE.allowThis(players[winnerIndex].balance);
            FHE.allow(players[winnerIndex].balance, winner);
        }

        // 重置奖池
        tablePots[tableId] = FHE.asEuint64(uint64(0));
        tablePotAmounts[tableId] = 0; // 重置明文奖池
        FHE.allowThis(tablePots[tableId]);

        // 标记游戏结束
        table.state = GameState.Finished;
        table.winnerIndex = winnerIndex; // 保存获胜者索引

        emit GameFinished(tableId, winner, 0);
        emit StateChanged(tableId, previousState, GameState.Finished);
    }
    
    /**
     * @notice 收取盲注
     * @param tableId 游戏桌ID
     */
    function _collectBlinds(uint256 tableId) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 收取小盲注
        euint64 smallBlindAmount = FHE.asEuint64(uint64(table.smallBlind));
        FHE.allowThis(smallBlindAmount);

        players[table.smallBlindIndex].balance = FHE.sub(
            players[table.smallBlindIndex].balance,
            smallBlindAmount
        );
        FHE.allowThis(players[table.smallBlindIndex].balance);
        FHE.allow(players[table.smallBlindIndex].balance, players[table.smallBlindIndex].addr);

        players[table.smallBlindIndex].currentBet = smallBlindAmount;
        players[table.smallBlindIndex].totalBet = smallBlindAmount;
        FHE.allowThis(players[table.smallBlindIndex].currentBet);
        FHE.allowThis(players[table.smallBlindIndex].totalBet);

        // 收取大盲注
        euint64 bigBlindAmount = FHE.asEuint64(uint64(table.bigBlind));
        FHE.allowThis(bigBlindAmount);

        players[table.bigBlindIndex].balance = FHE.sub(
            players[table.bigBlindIndex].balance,
            bigBlindAmount
        );
        FHE.allowThis(players[table.bigBlindIndex].balance);
        FHE.allow(players[table.bigBlindIndex].balance, players[table.bigBlindIndex].addr);

        players[table.bigBlindIndex].currentBet = bigBlindAmount;
        players[table.bigBlindIndex].totalBet = bigBlindAmount;
        FHE.allowThis(players[table.bigBlindIndex].currentBet);
        FHE.allowThis(players[table.bigBlindIndex].totalBet);

        // 更新奖池
        tablePots[tableId] = FHE.add(smallBlindAmount, bigBlindAmount);
        tablePotAmounts[tableId] = table.smallBlind + table.bigBlind; // 更新明文奖池
        FHE.allowThis(tablePots[tableId]);

        // 设置当前最高注为大盲注
        tableCurrentBets[tableId] = bigBlindAmount;
        tableCurrentBetAmounts[tableId] = table.bigBlind; // 更新明文当前下注
        FHE.allowThis(tableCurrentBets[tableId]);
    }
    
    /**
     * @notice 重置下注轮次
     * @param tableId 游戏桌ID
     */
    function _resetBettingRound(uint256 tableId) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 重置所有玩家的当前下注和动作
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (!players[i].hasFolded) {
                players[i].currentBet = FHE.asEuint64(uint64(0));
                players[i].lastAction = PlayerAction.None;

                // ✅ 为重置的加密字段设置 ACL 权限
                FHE.allowThis(players[i].currentBet);
            }
        }

        // 重置当前最高注和加注者
        tableCurrentBets[tableId] = FHE.asEuint64(uint64(0));
        tableCurrentBetAmounts[tableId] = 0; // 重置明文当前下注
        FHE.allowThis(tableCurrentBets[tableId]);

        table.lastRaiserIndex = 255; // 255表示无加注者
        table.bettingRoundComplete = false;
    }
    
    /**
     * @notice 处理下注逻辑
     * @param tableId 游戏桌ID
     * @param amount 下注金额（明文）
     * @param encryptedAmount 加密金额
     * @param inputProof 输入证明
     */
    function _processBet(
        uint256 tableId,
        uint256 amount,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 验证表格存在
        if (tableId >= tableCount) revert InvalidState();

        // 验证玩家在游戏中
        if (playerTable[msg.sender] != tableId + 1) revert NotInGame();

        // 验证游戏已开始
        if (table.state == GameState.Waiting) revert InvalidState();

        // 验证轮到该玩家
        if (players[table.currentPlayerIndex].addr != msg.sender) revert NotYourTurn();

        Player storage player = players[table.currentPlayerIndex];

        // 验证证明不为空 - 这是关键检查
        if (inputProof.length == 0) revert InvalidProofData();

        // 验证并转换加密金额
        // 注意：这里是关键的 FHE.fromExternal 调用
        // 如果 inputProof 格式不正确，这个调用会失败
        euint64 encAmount = FHE.fromExternal(encryptedAmount, inputProof);

        // 从玩家余额中扣除
        player.balance = FHE.sub(player.balance, encAmount);
        // ✅ 对运算结果授权,确保合约可以在后续操作中使用
        FHE.allowThis(player.balance);
        FHE.allow(player.balance, msg.sender);

        // 更新玩家下注
        player.currentBet = FHE.add(player.currentBet, encAmount);
        FHE.allowThis(player.currentBet);

        player.totalBet = FHE.add(player.totalBet, encAmount);
        FHE.allowThis(player.totalBet);

        // 更新奖池（加密和明文）
        tablePots[tableId] = FHE.add(tablePots[tableId], encAmount);
        tablePotAmounts[tableId] += amount; // 更新明文奖池
        FHE.allowThis(tablePots[tableId]);

        // 更新当前最高注（明文）
        tableCurrentBetAmounts[tableId] = amount;

        // 设置玩家动作为加注
        player.lastAction = PlayerAction.Raise;
        player.lastActionTime = block.timestamp;

        emit PlayerActioned(tableId, msg.sender, PlayerAction.Raise, amount);

        // 注意: 不在这里调用 _moveToNextActivePlayer 和 _checkRoundEnd
        // 因为 bet() 函数会通过 _handleRaise() 来调用它们
    }

    // ============ Showdown 相关函数 ============

    /**
     * @notice 玩家公开手牌 (Showdown 阶段)
     * @param tableId 游戏桌ID
     * @param card1 解密后的手牌1
     * @param card2 解密后的手牌2
     */
    function revealCards(uint256 tableId, uint8 card1, uint8 card2) external inGame(tableId) {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 必须在 Showdown 阶段
        if (table.state != GameState.Showdown) revert InvalidState();

        // 找到玩家索引
        uint8 playerIndex = 255;
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (players[i].addr == msg.sender) {
                playerIndex = i;
                break;
            }
        }

        if (playerIndex == 255) revert NotInGame();

        Player storage player = players[playerIndex];

        // 玩家必须未弃牌
        if (player.hasFolded) revert InvalidState();

        // 不能重复公开
        if (player.hasRevealedCards) revert CardsAlreadyRevealed();

        // 验证卡牌值有效性 (1-52)，0 表示未发的牌
        if (card1 < 1 || card1 > 52 || card2 < 1 || card2 > 52) revert InvalidCardValue();

        // 存储解密后的手牌
        player.decryptedCard1 = card1;
        player.decryptedCard2 = card2;
        player.hasRevealedCards = true;

        emit CardsRevealed(tableId, msg.sender, card1, card2);

        // 检查是否所有未弃牌玩家都已公开手牌
        _checkShowdownComplete(tableId);
    }

    /**
     * @notice 检查 Showdown 是否完成
     * @param tableId 游戏桌ID
     */
    function _checkShowdownComplete(uint256 tableId) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];

        // 统计未弃牌且已公开手牌的玩家数
        uint8 revealedCount = 0;
        uint8 activeCount = 0;

        for (uint8 i = 0; i < table.playerCount; i++) {
            if (!players[i].hasFolded && players[i].isActive) {
                activeCount++;
                if (players[i].hasRevealedCards) {
                    revealedCount++;
                }
            }
        }

        // 如果所有未弃牌玩家都已公开手牌，进行比牌
        if (revealedCount == activeCount && activeCount > 0) {
            _performShowdown(tableId);
        }
    }

    /**
     * @notice 执行摊牌比较
     * @param tableId 游戏桌ID
     */
    function _performShowdown(uint256 tableId) internal {
        Table storage table = tables[tableId];
        Player[MAX_PLAYERS] storage players = tablePlayers[tableId];
        uint8[COMMUNITY_CARDS] storage communityCards = tableCommunityCards[tableId];

        uint8 winnerIndex = 255;
        HandRank bestHandRank = HandRank.HighCard;
        uint256 bestHandValue = 0;

        // 遍历所有未弃牌的玩家，评估牌型
        for (uint8 i = 0; i < table.playerCount; i++) {
            if (!players[i].hasFolded && players[i].isActive && players[i].hasRevealedCards) {
                // 评估玩家的最佳牌型
                (HandRank handRank, uint256 handValue) = _evaluateHand(
                    players[i].decryptedCard1,
                    players[i].decryptedCard2,
                    communityCards,
                    table.communityCardCount
                );

                // 比较牌型
                if (winnerIndex == 255 || _compareHands(handRank, handValue, bestHandRank, bestHandValue)) {
                    winnerIndex = i;
                    bestHandRank = handRank;
                    bestHandValue = handValue;
                }
            }
        }

        // 分配奖池给获胜者
        if (winnerIndex != 255) {
            address winner = players[winnerIndex].addr;
            players[winnerIndex].balance = FHE.add(
                players[winnerIndex].balance,
                tablePots[tableId]
            );
            FHE.allowThis(players[winnerIndex].balance);
            FHE.allow(players[winnerIndex].balance, winner);

            emit ShowdownComplete(tableId, winner, winnerIndex, bestHandRank);

            // 重置奖池
            tablePots[tableId] = FHE.asEuint64(uint64(0));
            tablePotAmounts[tableId] = 0; // 重置明文奖池
            FHE.allowThis(tablePots[tableId]);

            // 结束游戏
            table.state = GameState.Finished;
            table.winnerIndex = winnerIndex; // 保存获胜者索引
            emit GameFinished(tableId, winner, 0);
            emit StateChanged(tableId, GameState.Showdown, GameState.Finished);
        }
    }

    /**
     * @notice 评估玩家的最佳牌型
     * @param holeCard1 手牌1
     * @param holeCard2 手牌2
     * @param communityCards 公共牌数组
     * @param communityCardCount 公共牌数量
     * @return handRank 牌型等级
     * @return handValue 牌型数值(用于比较相同牌型)
     */
    function _evaluateHand(
        uint8 holeCard1,
        uint8 holeCard2,
        uint8[COMMUNITY_CARDS] storage communityCards,
        uint8 communityCardCount
    ) internal view returns (HandRank handRank, uint256 handValue) {
        // 组合所有7张牌 (2张手牌 + 5张公共牌)
        uint8[] memory allCards = new uint8[](7);
        allCards[0] = holeCard1;
        allCards[1] = holeCard2;

        for (uint8 i = 0; i < communityCardCount && i < COMMUNITY_CARDS; i++) {
            allCards[2 + i] = communityCards[i];
        }

        uint8 totalCards = 2 + communityCardCount;

        // 从7张牌中选择最佳的5张牌组合
        // 这里使用简化算法：评估所有可能的5张牌组合
        HandRank bestRank = HandRank.HighCard;
        uint256 bestValue = 0;

        // 遍历所有C(7,5) = 21种组合
        for (uint8 i = 0; i < totalCards; i++) {
            for (uint8 j = i + 1; j < totalCards; j++) {
                for (uint8 k = j + 1; k < totalCards; k++) {
                    for (uint8 l = k + 1; l < totalCards; l++) {
                        for (uint8 m = l + 1; m < totalCards; m++) {
                            // 评估这5张牌的牌型
                            uint8[] memory fiveCards = new uint8[](5);
                            fiveCards[0] = allCards[i];
                            fiveCards[1] = allCards[j];
                            fiveCards[2] = allCards[k];
                            fiveCards[3] = allCards[l];
                            fiveCards[4] = allCards[m];

                            (HandRank rank, uint256 value) = _evaluateFiveCards(fiveCards);

                            // 更新最佳牌型
                            if (uint8(rank) > uint8(bestRank) ||
                                (rank == bestRank && value > bestValue)) {
                                bestRank = rank;
                                bestValue = value;
                            }
                        }
                    }
                }
            }
        }

        return (bestRank, bestValue);
    }

    /**
     * @notice 评估5张牌的牌型
     * @param cards 5张牌的数组
     * @return handRank 牌型等级
     * @return handValue 牌型数值
     */
    function _evaluateFiveCards(uint8[] memory cards) internal pure returns (HandRank, uint256) {
        require(cards.length == 5, "Must be exactly 5 cards");

        // 提取点数和花色
        uint8[] memory ranks = new uint8[](5);
        uint8[] memory suits = new uint8[](5);

        for (uint8 i = 0; i < 5; i++) {
            ranks[i] = cards[i] % 13;  // 0-12 (A,2,3,...,K)
            suits[i] = cards[i] / 13;  // 0-3 (♠,♥,♦,♣)
        }

        // 排序点数(降序)
        _sortDescending(ranks);

        // 检查是否同花
        bool isFlush = _isFlush(suits);

        // 检查是否顺子
        bool isStraight = _isStraight(ranks);

        // 统计每个点数出现的次数
        uint8[] memory rankCounts = new uint8[](13);
        for (uint8 i = 0; i < 5; i++) {
            rankCounts[ranks[i]]++;
        }

        // 找出最大重复次数
        uint8 maxCount = 0;
        uint8 secondMaxCount = 0;
        for (uint8 i = 0; i < 13; i++) {
            if (rankCounts[i] > maxCount) {
                secondMaxCount = maxCount;
                maxCount = rankCounts[i];
            } else if (rankCounts[i] > secondMaxCount) {
                secondMaxCount = rankCounts[i];
            }
        }

        // 判断牌型
        if (isFlush && isStraight) {
            // 检查是否皇家同花顺 (10,J,Q,K,A)
            if (ranks[0] == 12 && ranks[1] == 11 && ranks[2] == 10 && ranks[3] == 9 && ranks[4] == 8) {
                return (HandRank.RoyalFlush, _calculateHandValue(ranks));
            }
            return (HandRank.StraightFlush, _calculateHandValue(ranks));
        }

        if (maxCount == 4) {
            return (HandRank.FourOfKind, _calculateHandValue(ranks));
        }

        if (maxCount == 3 && secondMaxCount == 2) {
            return (HandRank.FullHouse, _calculateHandValue(ranks));
        }

        if (isFlush) {
            return (HandRank.Flush, _calculateHandValue(ranks));
        }

        if (isStraight) {
            return (HandRank.Straight, _calculateHandValue(ranks));
        }

        if (maxCount == 3) {
            return (HandRank.ThreeOfKind, _calculateHandValue(ranks));
        }

        if (maxCount == 2 && secondMaxCount == 2) {
            return (HandRank.TwoPair, _calculateHandValue(ranks));
        }

        if (maxCount == 2) {
            return (HandRank.OnePair, _calculateHandValue(ranks));
        }

        return (HandRank.HighCard, _calculateHandValue(ranks));
    }

    /**
     * @notice 检查是否同花
     */
    function _isFlush(uint8[] memory suits) internal pure returns (bool) {
        for (uint8 i = 1; i < 5; i++) {
            if (suits[i] != suits[0]) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice 检查是否顺子
     */
    function _isStraight(uint8[] memory ranks) internal pure returns (bool) {
        // 特殊情况: A-2-3-4-5 (A作为1)
        if (ranks[0] == 12 && ranks[1] == 3 && ranks[2] == 2 && ranks[3] == 1 && ranks[4] == 0) {
            return true;
        }

        // 正常顺子
        for (uint8 i = 1; i < 5; i++) {
            if (ranks[i] != ranks[i-1] - 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice 计算手牌数值(用于比较相同牌型)
     * @dev 将5张牌的点数编码为一个uint256值
     */
    function _calculateHandValue(uint8[] memory ranks) internal pure returns (uint256) {
        uint256 value = 0;
        for (uint8 i = 0; i < 5; i++) {
            // 每张牌占4位(0-15),足够表示0-12的点数
            value = value * 16 + uint256(ranks[i]);
        }
        return value;
    }

    /**
     * @notice 比较两手牌的大小
     * @return true 如果第一手牌更大
     */
    function _compareHands(
        HandRank rank1,
        uint256 value1,
        HandRank rank2,
        uint256 value2
    ) internal pure returns (bool) {
        if (uint8(rank1) > uint8(rank2)) {
            return true;
        }
        if (uint8(rank1) < uint8(rank2)) {
            return false;
        }
        // 牌型相同,比较数值
        return value1 > value2;
    }

    /**
     * @notice 降序排序(冒泡排序)
     */
    function _sortDescending(uint8[] memory arr) internal pure {
        uint256 n = arr.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (arr[j] < arr[j + 1]) {
                    uint8 temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }
}
