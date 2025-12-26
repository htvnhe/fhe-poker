# 🎮 FHE Poker - Privacy-Preserving On-Chain Texas Hold'em

<div align="center">

![License](https://img.shields.io/badge/license-BSD--3--Clause--Clear-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.24-363636?logo=solidity)
![FHEVM](https://img.shields.io/badge/@fhevm/solidity-0.9.1-purple)
![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)
![Zama](https://img.shields.io/badge/Powered%20by-Zama%20FHEVM-blue)

**A fully on-chain Texas Hold'em poker game powered by FHEVM (Fully Homomorphic Encryption Virtual Machine), ensuring complete privacy and provable fairness.**

[🎮 Live Demo](https://stealth-holdem.vercel.app) | [🎬 Video Demo](https://youtu.be/YOUR_VIDEO_ID) | [📖 Documentation](./docs/DESIGN.md) | [🐛 Report Bug](../../issues)

</div>

---

## 📜 Deployed Contracts

| Network | Contract | Address | Status |
|---------|----------|---------|--------|
| Sepolia | PokerTable | [`0xB670D1b2a80b5B0f3b393F9Ce79bAe974e79a623`](https://sepolia.etherscan.io/address/0xB670D1b2a80b5B0f3b393F9Ce79bAe974e79a623) | ✅ Deployed |

---

## 🎬 Video Demo

[![FHE Poker Demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://youtu.be/YOUR_VIDEO_ID)

> **Watch the 2-minute demo** showing gameplay with FHE encryption in action!
>
> *Click the image above or [watch on YouTube](https://youtu.be/YOUR_VIDEO_ID)*

---

## 🌟 Highlights

### 🔐 True Privacy with FHE
- **Encrypted Hole Cards**: Player hands are encrypted using `euint8` on-chain
- **Encrypted Balances**: All player balances and bets use `euint64` encryption
- **Access Control**: ACL (Access Control List) ensures players can only view their own cards
- **No Trusted Third Party**: All encryption happens on-chain via FHEVM

### 🎲 Provably Fair Gaming
- **On-Chain Randomness**: Cryptographically secure random number generation
- **Transparent Logic**: All game rules executed in smart contracts (1,655 lines)
- **Verifiable Results**: Every action and outcome is recorded on-chain
- **Anti-Cheating**: Asynchronous decryption prevents front-running attacks

### ⚡ Full-Featured Poker Experience
- **2-6 Players**: Support for multi-player games
- **Complete Texas Hold'em Rules**: Pre-flop, Flop, Turn, River, Showdown
- **10 Hand Rankings**: From High Card to Royal Flush
- **Advanced Betting**: Fold, Check, Call, Raise, All-in
- **Automatic Settlement**: Smart contract handles pot distribution

### 🌐 Modern Tech Stack
- **Smart Contracts**: Solidity ^0.8.24 with FHEVM
- **FHEVM Solidity**: v0.9.1 with `ZamaEthereumConfig`
- **Relayer SDK**: v0.3.0-8
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Wallet Integration**: Wagmi v2 + Viem
- **Internationalization**: English & Chinese support
- **Deployment**: Vercel (Frontend) + Zama Ethereum (Contracts)

---

## 🚀 Quick Start

### 📋 Prerequisites

- **Node.js**: v20 or higher
- **MetaMask**: Browser wallet extension
- **Sepolia ETH**: Get testnet ETH from [faucet](https://sepoliafaucet.com/)

### 🎮 Play Now

1. **Visit the Live Demo**: [https://stealth-holdem.vercel.app](https://stealth-holdem.vercel.app)
2. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask
3. **Switch to Sepolia**: Make sure you're on Sepolia testnet
4. **Join or Create Table**: Choose a table or create your own
5. **Start Playing**: Enjoy privacy-preserving poker!

### 💻 Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/htvnhe/fhe-poker.git
cd fhe-poker
```

#### 2. Install Dependencies

```bash
# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### 3. Set Up Environment Variables

```bash
# Set your mnemonic for deployment
npx hardhat vars set MNEMONIC

# Set Infura API key (for Sepolia access)
npx hardhat vars set INFURA_API_KEY

# Optional: Etherscan API key (for verification)
npx hardhat vars set ETHERSCAN_API_KEY
```

#### 4. Compile Contracts

```bash
npm run compile
```

#### 5. Run Tests

```bash
npm run test
```

#### 6. Deploy Contracts

```bash
# Deploy to Sepolia testnet
npx hardhat deploy --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

#### 7. Run Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` to see the app!

---

## 🎮 How to Play

### Game Rules (Texas Hold'em)

1. **Join Table**: 2-6 players can join a table
2. **Blinds**: Small blind and big blind are posted
3. **Hole Cards**: Each player receives 2 encrypted cards
4. **Betting Rounds**:
   - **Pre-Flop**: After receiving hole cards
   - **Flop**: After 3 community cards are dealt
   - **Turn**: After 4th community card
   - **River**: After 5th community card
5. **Showdown**: Players reveal cards (decrypted on-chain)
6. **Winner**: Best 5-card hand wins the pot

### Hand Rankings (Highest to Lowest)

| Rank | Hand | Example |
|------|------|---------|
| 1 | 🏆 Royal Flush | A♠ K♠ Q♠ J♠ 10♠ |
| 2 | Straight Flush | 9♥ 8♥ 7♥ 6♥ 5♥ |
| 3 | Four of a Kind | K♣ K♦ K♥ K♠ 3♦ |
| 4 | Full House | Q♠ Q♥ Q♦ 7♣ 7♦ |
| 5 | Flush | A♦ J♦ 9♦ 6♦ 3♦ |
| 6 | Straight | 10♣ 9♦ 8♥ 7♠ 6♣ |
| 7 | Three of a Kind | 8♠ 8♥ 8♦ K♣ 4♦ |
| 8 | Two Pair | A♠ A♥ 5♣ 5♦ Q♠ |
| 9 | One Pair | 10♦ 10♠ K♣ 7♥ 4♠ |
| 10 | High Card | A♣ J♦ 8♠ 6♥ 3♣ |

### Player Actions

- **Fold**: Give up your hand
- **Check**: Pass action (if no bet to match)
- **Call**: Match the current bet
- **Raise**: Increase the bet
- **All-In**: Bet all remaining chips

---

## 🏗️ Technical Architecture

### Smart Contract Architecture

```
PokerTable.sol (1,655 lines)
├── Game State Management
│   ├── Table creation & configuration
│   ├── Player join/leave logic
│   └── Game state transitions
├── FHE Encryption Layer
│   ├── Encrypted hole cards (euint8)
│   ├── Encrypted balances (euint64)
│   ├── Encrypted bets (euint64)
│   └── ACL permission management
├── Card Dealing System
│   ├── On-chain random number generation
│   ├── Encrypted card distribution
│   └── Community card management
├── Betting Engine
│   ├── Multi-round betting logic
│   ├── Pot calculation
│   └── Side pot handling
├── Hand Evaluation
│   ├── 10 hand ranking algorithms
│   ├── Best 5-card combination finder
│   └── Winner determination
└── Settlement System
    ├── Asynchronous card decryption
    ├── Pot distribution
    └── Balance updates
```

### Key FHE Features

| Feature | Type | Purpose |
|---------|------|---------|
| Hole Cards | `euint8` | Keep player hands private |
| Player Balance | `euint64` | Hide chip counts |
| Current Bet | `euint64` | Encrypt bet amounts |
| ACL Control | Permission | Restrict card access |
| Async Decrypt | Callback | Prevent front-running |

### Frontend Architecture

- **React 19**: Modern UI framework
- **TypeScript**: Type-safe development
- **Wagmi v2**: Ethereum wallet integration
- **Viem**: Lightweight Ethereum library
- **Tailwind CSS**: Utility-first styling
- **i18next**: Internationalization
- **FHEVM SDK**: Encryption client

---

## Project Highlights

- ✅ **Meaningful FHE Usage**: Encrypts cards, balances, and bets
- ✅ **Working Deployment**: Live on Sepolia testnet
- ✅ **Full-Stack Implementation**: Complete frontend + backend
- ✅ **Production-Ready**: Deployable to Vercel in minutes

### Technical Achievements

- 🔐 Advanced FHE integration with ACL permissions
- 🎲 Complex game logic with 10 hand ranking algorithms
- ⚡ Asynchronous decryption for security
- 🌐 Modern React frontend with TypeScript
- 🧪 Comprehensive test coverage
- 📱 Responsive design with Tailwind CSS
