# 🎨 FHE Poker 前端开发计划

## 技术栈

### 核心框架
- **React 18** + **TypeScript** - 现代化UI框架
- **Vite** - 快速开发构建工具
- **TailwindCSS** - 实用优先的CSS框架
- **shadcn/ui** - 高质量React组件库

### Web3集成
- **ethers.js v6** - 以太坊交互库
- **@fhevm/fhevmjs** - FHEVM客户端SDK
- **wagmi** - React Hooks for Ethereum
- **RainbowKit** - 钱包连接UI

### 状态管理
- **Zustand** - 轻量级状态管理
- **React Query** - 服务端状态管理

### UI增强
- **Framer Motion** - 动画库
- **Lucide React** - 图标库
- **react-hot-toast** - 通知提示

---

## 项目结构

```
frontend/
├── public/
│   └── cards/              # 扑克牌图片资源
├── src/
│   ├── components/
│   │   ├── ui/            # shadcn/ui基础组件
│   │   ├── game/          # 游戏组件
│   │   │   ├── GameTable.tsx
│   │   │   ├── PlayerSeat.tsx
│   │   │   ├── CommunityCards.tsx
│   │   │   ├── PlayerHand.tsx
│   │   │   ├── BettingPanel.tsx
│   │   │   └── GameControls.tsx
│   │   ├── layout/        # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   └── wallet/        # 钱包组件
│   │       └── ConnectButton.tsx
│   ├── hooks/
│   │   ├── usePokerGame.ts      # 游戏逻辑Hook
│   │   ├── useFHEVM.ts          # FHEVM交互Hook
│   │   ├── useContract.ts       # 合约交互Hook
│   │   ├── useDecryption.ts     # 解密Hook
│   │   └── useGameState.ts      # 游戏状态Hook
│   ├── lib/
│   │   ├── fhevm.ts             # FHEVM工具函数
│   │   ├── poker.ts             # 扑克牌工具函数
│   │   ├── contract.ts          # 合约ABI和地址
│   │   └── utils.ts             # 通用工具函数
│   ├── store/
│   │   └── gameStore.ts         # Zustand状态管理
│   ├── types/
│   │   ├── game.ts              # 游戏类型定义
│   │   └── contract.ts          # 合约类型定义
│   ├── pages/
│   │   ├── Home.tsx             # 首页
│   │   ├── Lobby.tsx            # 游戏大厅
│   │   └── Game.tsx             # 游戏页面
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 核心功能模块

### 1. 钱包连接模块

**组件**: `ConnectButton.tsx`

**功能**:
- MetaMask钱包连接
- 网络切换(Localhost/Sepolia)
- 账户余额显示
- 断开连接

**技术**:
```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
```

---

### 2. 游戏大厅模块

**组件**: `Lobby.tsx`

**功能**:
- 显示所有游戏桌列表
- 创建新游戏桌
- 加入现有游戏桌
- 显示桌子状态(等待中/进行中/已满)

**UI设计**:
```
┌─────────────────────────────────────┐
│  🎮 游戏大厅                         │
├─────────────────────────────────────┤
│  [创建新游戏桌]                      │
│                                     │
│  游戏桌列表:                         │
│  ┌──────────────────────────────┐  │
│  │ 桌号: #1  玩家: 2/6  状态: 等待│  │
│  │ 盲注: 10/20  [加入游戏]       │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ 桌号: #2  玩家: 4/6  状态: 进行│  │
│  │ 盲注: 50/100  [观战]         │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### 3. 游戏桌主界面

**组件**: `GameTable.tsx`

**布局**:
```
┌─────────────────────────────────────────────┐
│              公共牌区域                      │
│         [♠A] [♥K] [♦Q] [♣J] [♠10]          │
│              奖池: 500                       │
├─────────────────────────────────────────────┤
│                                             │
│    [玩家2]        [玩家3]        [玩家4]    │
│     筹码           筹码           筹码       │
│                                             │
│  [玩家1]                          [玩家5]   │
│   筹码                              筹码     │
│                                             │
│              [你的位置]                      │
│            [♠A] [♥K]                        │
│             筹码: 1000                       │
│                                             │
│  [Fold] [Check] [Call] [Raise]             │
└─────────────────────────────────────────────┘
```

**子组件**:
- `PlayerSeat.tsx` - 玩家座位
- `CommunityCards.tsx` - 公共牌
- `PlayerHand.tsx` - 玩家手牌
- `BettingPanel.tsx` - 下注面板

---

### 4. FHEVM集成模块

**文件**: `lib/fhevm.ts`

**核心功能**:

```typescript
import { createInstance } from '@fhevm/fhevmjs'

// 初始化FHEVM实例
export async function initFHEVM() {
  const instance = await createInstance({
    chainId: 11155111, // Sepolia
    publicKey: '...',
    gatewayUrl: 'https://gateway.testnet.zama.cloud'
  })
  return instance
}

// 加密买入金额
export async function encryptBuyIn(amount: number) {
  const instance = await initFHEVM()
  const encrypted = instance.encrypt64(amount)
  return {
    data: encrypted,
    proof: instance.generateProof()
  }
}

// 解密手牌
export async function decryptCard(
  encryptedCard: string,
  contractAddress: string,
  userAddress: string
) {
  const instance = await initFHEVM()
  const decrypted = await instance.decrypt(
    encryptedCard,
    contractAddress,
    userAddress
  )
  return decrypted
}
```

---

### 5. 合约交互模块

**文件**: `hooks/useContract.ts`

**功能**:

```typescript
import { useContract, useSigner } from 'wagmi'
import PokerTableABI from '../lib/PokerTable.json'

export function usePokerContract() {
  const { data: signer } = useSigner()
  
  const contract = useContract({
    address: POKER_TABLE_ADDRESS,
    abi: PokerTableABI,
    signerOrProvider: signer
  })
  
  // 创建游戏桌
  const createTable = async (smallBlind: number, bigBlind: number) => {
    const tx = await contract.createTable(smallBlind, bigBlind)
    await tx.wait()
  }
  
  // 加入游戏桌
  const joinTable = async (tableId: number, buyIn: number) => {
    const { data, proof } = await encryptBuyIn(buyIn)
    const tx = await contract.joinTable(tableId, data, proof)
    await tx.wait()
  }
  
  // 弃牌
  const fold = async (tableId: number) => {
    const tx = await contract.fold(tableId)
    await tx.wait()
  }
  
  return { createTable, joinTable, fold }
}
```

---

### 6. 游戏状态管理

**文件**: `store/gameStore.ts`

```typescript
import create from 'zustand'

interface GameState {
  tableId: number | null
  players: Player[]
  communityCards: number[]
  myCards: number[]
  currentPlayer: number
  pot: number
  gameState: 'Waiting' | 'PreFlop' | 'Flop' | 'Turn' | 'River'
  
  // Actions
  setTableId: (id: number) => void
  updatePlayers: (players: Player[]) => void
  updateCommunityCards: (cards: number[]) => void
  setMyCards: (cards: number[]) => void
}

export const useGameStore = create<GameState>((set) => ({
  tableId: null,
  players: [],
  communityCards: [],
  myCards: [],
  currentPlayer: 0,
  pot: 0,
  gameState: 'Waiting',
  
  setTableId: (id) => set({ tableId: id }),
  updatePlayers: (players) => set({ players }),
  updateCommunityCards: (cards) => set({ communityCards: cards }),
  setMyCards: (cards) => set({ myCards: cards })
}))
```

---

### 7. 扑克牌显示

**文件**: `lib/poker.ts`

```typescript
// 扑克牌编码转换
export function cardToString(cardValue: number): string {
  const suits = ['♠', '♥', '♦', '♣']
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  
  const suit = Math.floor(cardValue / 13)
  const rank = cardValue % 13
  
  return `${suits[suit]}${ranks[rank]}`
}

// 获取扑克牌颜色
export function getCardColor(cardValue: number): 'red' | 'black' {
  const suit = Math.floor(cardValue / 13)
  return suit === 1 || suit === 2 ? 'red' : 'black'
}
```

**组件**: `PlayerHand.tsx`

```tsx
export function PlayerHand({ cards }: { cards: number[] }) {
  return (
    <div className="flex gap-2">
      {cards.map((card, index) => (
        <div 
          key={index}
          className={`
            w-16 h-24 rounded-lg border-2 
            flex items-center justify-center
            text-2xl font-bold
            ${getCardColor(card) === 'red' ? 'text-red-500' : 'text-black'}
            bg-white shadow-lg
          `}
        >
          {cardToString(card)}
        </div>
      ))}
    </div>
  )
}
```

---

## 开发步骤

### 步骤1: 项目初始化 (30分钟)

```bash
# 创建Vite + React + TypeScript项目
npm create vite@latest frontend -- --template react-ts
cd frontend

# 安装依赖
npm install

# 安装TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 安装shadcn/ui
npx shadcn-ui@latest init

# 安装Web3依赖
npm install ethers@6 @fhevm/fhevmjs wagmi @rainbow-me/rainbowkit

# 安装其他依赖
npm install zustand @tanstack/react-query framer-motion lucide-react react-hot-toast
```

### 步骤2: 配置基础设置 (30分钟)

- 配置TailwindCSS
- 配置wagmi和RainbowKit
- 设置路由
- 创建基础布局

### 步骤3: 实现钱包连接 (1小时)

- 集成RainbowKit
- 实现网络切换
- 显示账户信息

### 步骤4: 实现游戏大厅 (2小时)

- 获取游戏桌列表
- 创建游戏桌表单
- 加入游戏桌逻辑

### 步骤5: 实现游戏主界面 (3小时)

- 游戏桌布局
- 玩家座位显示
- 公共牌显示
- 手牌显示(解密)

### 步骤6: 实现下注面板 (1.5小时)

- Fold/Check/Call按钮
- Raise滑块
- 下注金额输入

### 步骤7: 实现实时更新 (1小时)

- 监听合约事件
- 更新游戏状态
- 刷新UI

### 步骤8: 添加动画效果 (1小时)

- 发牌动画
- 下注动画
- 状态转换动画

---

## 部署方案

### 开发环境
```bash
npm run dev
# 访问 http://localhost:5173
```

### 生产构建
```bash
npm run build
# 输出到 dist/ 目录
```

### 部署选项

**1. Vercel (推荐)**
```bash
npm install -g vercel
vercel
```

**2. Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**3. GitHub Pages**
```bash
npm run build
# 将dist/目录推送到gh-pages分支
```

**4. IPFS (去中心化)**
```bash
npm install -g ipfs
ipfs add -r dist/
```

---

## 环境变量配置

**`.env`文件**:
```env
VITE_POKER_CONTRACT_ADDRESS=0x...
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
VITE_GATEWAY_URL=https://gateway.testnet.zama.cloud
```

---

## UI设计参考

### 配色方案
```css
:root {
  --poker-green: #0a5f38;
  --poker-felt: #1a472a;
  --gold: #ffd700;
  --chip-red: #dc2626;
  --chip-blue: #2563eb;
  --chip-black: #1f2937;
}
```

### 组件样式
- 游戏桌: 深绿色毛毡背景
- 扑克牌: 白色卡片,圆角,阴影
- 筹码: 彩色圆形,带金额标识
- 按钮: 现代化扁平设计

---

## 测试计划

### 功能测试
- [ ] 钱包连接/断开
- [ ] 创建游戏桌
- [ ] 加入游戏桌
- [ ] 查看手牌(解密)
- [ ] 执行下注操作
- [ ] 游戏流程完整性

### 兼容性测试
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] 移动端浏览器

---

## 时间估算

| 任务 | 预计时间 |
|------|---------|
| 项目初始化 | 0.5小时 |
| 基础配置 | 0.5小时 |
| 钱包连接 | 1小时 |
| 游戏大厅 | 2小时 |
| 游戏主界面 | 3小时 |
| 下注面板 | 1.5小时 |
| 实时更新 | 1小时 |
| 动画效果 | 1小时 |
| 测试调试 | 1.5小时 |
| **总计** | **12小时** |

---

**创建时间**: 2025-10-20  
**最后更新**: 2025-10-20
