// 合约地址和ABI配置
export const POKER_TABLE_ADDRESS = '0xB670D1b2a80b5B0f3b393F9Ce79bAe974e79a623'; // Sepolia - Deployed with fhevm/solidity 0.9.1 + ZamaEthereumConfig

// 完整的 JSON ABI - 包含所有错误定义
export const POKER_TABLE_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ActionTimeout",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyInGame",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidBetAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidEncryptedData",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPlayerIndex",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidProofData",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidState",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidEncryptedAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProofVerificationFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MinPlayersNotMet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInGame",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotYourTurn",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TableFull",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TableNotFound",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum PokerTable.GameState",
        "name": "gameState",
        "type": "uint8"
      }
    ],
    "name": "CardsDealt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "requestId",
        "type": "uint256"
      }
    ],
    "name": "DecryptionRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "winnerIndex",
        "type": "uint8"
      }
    ],
    "name": "GameEnded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "winnings",
        "type": "uint256"
      }
    ],
    "name": "GameFinished",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "playerCount",
        "type": "uint8"
      }
    ],
    "name": "GameStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum PokerTable.PlayerAction",
        "name": "action",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "PlayerActioned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "seatIndex",
        "type": "uint8"
      }
    ],
    "name": "PlayerJoined",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "PlayerLeft",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum PokerTable.GameState",
        "name": "from",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "enum PokerTable.GameState",
        "name": "to",
        "type": "uint8"
      }
    ],
    "name": "StateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "smallBlind",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bigBlind",
        "type": "uint256"
      }
    ],
    "name": "TableCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "newPlayerIndex",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newPlayer",
        "type": "address"
      }
    ],
    "name": "TurnChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "card1",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "card2",
        "type": "uint8"
      }
    ],
    "name": "CardsRevealed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "winnerIndex",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "enum PokerTable.HandRank",
        "name": "handRank",
        "type": "uint8"
      }
    ],
    "name": "ShowdownComplete",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BET_TIMEOUT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CARDS_PER_PLAYER",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "COMMUNITY_CARDS",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_PLAYERS",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_PLAYERS",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "externalEuint64",
        "name": "encryptedAmount",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "bet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "call",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "playerIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint64",
        "name": "amount",
        "type": "uint64"
      }
    ],
    "name": "canPlayerBet",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "check",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "smallBlind",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bigBlind",
        "type": "uint256"
      }
    ],
    "name": "createTable",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "fold",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "getBettingRoundInfo",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "lastRaiserIndex",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "bettingRoundComplete",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "roundStartTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "getCommunityCards",
    "outputs": [
      {
        "internalType": "uint8[5]",
        "name": "cards",
        "type": "uint8[5]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "playerIndex",
        "type": "uint8"
      }
    ],
    "name": "getPlayerActive",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "playerIndex",
        "type": "uint8"
      }
    ],
    "name": "getPlayerAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "getPlayerCards",
    "outputs": [
      {
        "internalType": "euint8",
        "name": "card1",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "card2",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerIndex",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "getTableInfo",
    "outputs": [
      {
        "internalType": "enum PokerTable.GameState",
        "name": "state",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "playerCount",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "activePlayers",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "currentPlayerIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "dealerIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "smallBlindIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "bigBlindIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "communityCardCount",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "smallBlind",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bigBlind",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "getTableInfoWithPlayers",
    "outputs": [
      {
        "internalType": "address[6]",
        "name": "players",
        "type": "address[6]"
      },
      {
        "internalType": "uint256[6]",
        "name": "playerBets",
        "type": "uint256[6]"
      },
      {
        "internalType": "bool[6]",
        "name": "playerFolded",
        "type": "bool[6]"
      },
      {
        "internalType": "uint8",
        "name": "currentPlayerIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "pot",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "dealerIndex",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "getWinner",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "winnerIndex",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "winnerAddress",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "externalEuint64",
        "name": "encryptedBuyIn",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "joinTable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "leaveTable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "playerBalances",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "playerTable",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      }
    ],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "card1",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "card2",
        "type": "uint8"
      }
    ],
    "name": "revealCards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "playerIndex",
        "type": "uint8"
      }
    ],
    "name": "hasPlayerRevealedCards",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tableId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "playerIndex",
        "type": "uint8"
      }
    ],
    "name": "getRevealedCards",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tableCommunityCards",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tableCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tableCurrentBets",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tablePlayers",
    "outputs": [
      {
        "internalType": "address",
        "name": "addr",
        "type": "address"
      },
      {
        "internalType": "euint64",
        "name": "balance",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "card1",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "card2",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "hasFolded",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "euint64",
        "name": "currentBet",
        "type": "bytes32"
      },
      {
        "internalType": "euint64",
        "name": "totalBet",
        "type": "bytes32"
      },
      {
        "internalType": "enum PokerTable.PlayerAction",
        "name": "lastAction",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "lastActionTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tablePots",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tableSidePots",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tables",
    "outputs": [
      {
        "internalType": "enum PokerTable.GameState",
        "name": "state",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "playerCount",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "activePlayers",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "communityCardCount",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "currentPlayerIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "dealerIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "smallBlindIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "bigBlindIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "smallBlind",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bigBlind",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "roundStartTime",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isDecryptionPending",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "lastRaiserIndex",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "bettingRoundComplete",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// 游戏状态常量
export const GameState = {
  Waiting: 0,
  PreFlop: 1,
  Flop: 2,
  Turn: 3,
  River: 4,
  Showdown: 5,
  Finished: 6,
} as const;

// 玩家行动常量
export const PlayerAction = {
  None: 0,
  Fold: 1,
  Check: 2,
  Call: 3,
  Raise: 4,
} as const;
