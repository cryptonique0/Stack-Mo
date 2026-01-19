# Stack-Mo – Web3 & Zero-Knowledge Proof Projects

A comprehensive repository containing **blockchain dApps**, **smart contracts**, and **cryptographic implementations** focused on the Stacks blockchain and zero-knowledge proof systems.

This workspace includes production-ready applications, educational implementations, and research projects exploring the intersection of blockchain, cryptography, and decentralized finance.

---

## 📚 Repository Overview

### **Blockchain Applications & dApps**

#### Counter dApp
- **Location**: [counter/](counter/), [counter-dapp/](counter-dapp/)
- **Purpose**: Introductory smart contract and frontend for learning Stacks development
- **Stack**: Clarity (contracts), React + Vite (frontend), TypeScript

#### Payment dApp
- **Location**: [payment-dapp/](payment-dapp/)
- **Purpose**: Payment processing interface on Stacks blockchain
- **Stack**: React + Vite, TailwindCSS, Stacks integration

#### StackPay Application
- **Location**: [stackpay/](stackpay/), [stackpay-app/](stackpay-app/)
- **Purpose**: Merchant dashboard and payment platform powered by Stacks
- **Features**: Onboarding, invoice management, wallet integration, real-time transaction tracking, escrow management
- **Tech Stack**: Clarity smart contracts, React + Vite, TailwindCSS, Supabase backend
- **Documentation**: [stackpay-app/README.md](stackpay-app/README.md)

#### Secret Wisher dApp
- **Location**: [secret-wisher/](secret-wisher/), [secret-wisher-dapp/](secret-wisher-dapp/)
- **Purpose**: Decentralized wishlist/gifting application on Stacks
- **Stack**: Clarity contracts, React + Vite frontend

#### Timelock Contracts
- **Location**: [timelock/](timelock/)
- **Purpose**: Time-locked smart contracts for scheduled transactions
- **Stack**: Clarity smart contracts

#### Token System
- **Location**: [my-token/](my-token/)
- **Purpose**: Custom token implementation on Stacks
- **Stack**: Clarity SIP-010 token standard

#### Tic-Tac-Toe Game
- **Location**: [tic-tac-toe/](tic-tac-toe/)
- **Purpose**: On-chain game implementation
- **Stack**: Clarity smart contracts, test suite

#### Hello World
- **Location**: [hello-world/](hello-world/)
- **Purpose**: Minimal Stacks smart contract starter template

### **Backend Services**

#### Backend Server
- **Location**: [backend/](backend/)
- **Purpose**: API server and blockchain indexing service
- **Stack**: TypeScript/Node.js
- **Features**: Chainhook integration, contract event monitoring, type definitions

---

## 🔐 Cryptographic & Zero-Knowledge Proof Implementations

Pure Rust implementations of core ZK primitives and polynomial operations. These modules focus on **first-principles understanding** with emphasis on correctness and clarity.

### [fft/](fft/) – Fast Fourier Transform
Efficient polynomial evaluation and multiplication over finite fields.

**Includes**: Recursive FFT, inverse FFT, polynomial multiplication

### [univariate_poly/](univariate_poly/) – Univariate Polynomials
Core polynomial operations over prime fields: arithmetic, evaluation, interpolation

### [multivariate_poly/](multivariate_poly/) – Multivariate Polynomials
Multilinear extensions and multi-variable polynomial operations

### [shamir_secret_sharing/](shamir_secret_sharing/) – Threshold Cryptography
Polynomial-based secret sharing with finite-field arithmetic

### [sum_check/](sum_check/) – Sum-Check Protocol
Interactive proof protocol for multilinear polynomial evaluation

**Used in**: GKR protocols, efficient proof systems

### [gkr/](gkr/) – Goldwasser–Kalai–Rothblum Protocol
Scalable verification of computation over layered arithmetic circuits

### [kzg/](kzg/) – Kate–Zaverucha–Goldberg Commitments
Polynomial commitment scheme with efficient witness computation

---

## 🚀 Getting Started

### For dApp Development

Each dApp has its own setup instructions:

```bash
cd counter-dapp
npm install
npm run dev
```

### For Smart Contracts

```bash
cd counter
clarinet test
clarinet check
```

### For Rust Cryptography Modules

```bash
cd fft
cargo test
cargo build --release
```

### For Backend Services

```bash
cd backend
npm install
npm run dev
```

---

## 🏗️ Project Architecture

```
Stack-Mo/
├── blockchain-apps/
│   ├── counter/               # Smart contract
│   ├── counter-dapp/          # Frontend
│   ├── stackpay/              # Payment contracts
│   ├── stackpay-app/          # Merchant dashboard
│   ├── secret-wisher/         # Wishlist contracts
│   ├── secret-wisher-dapp/    # Wishlist frontend
│   ├── payment-dapp/          # Payment UI
│   ├── tic-tac-toe/           # Game contracts
│   ├── timelock/              # Timelock contracts
│   ├── my-token/              # Token contracts
│   └── hello-world/           # Starter template
├── backend/                   # API & indexing service
├── crypto-implementations/
│   ├── fft/                   # Fast Fourier Transform
│   ├── univariate_poly/       # Univariate polynomials
│   ├── multivariate_poly/     # Multivariate polynomials
│   ├── shamir_secret_sharing/ # Secret sharing
│   ├── sum_check/             # Sum-check protocol
│   ├── gkr/                   # GKR protocol
│   └── kzg/                   # KZG commitments
└── README.md
```

---

## 🎯 Key Features

### Blockchain Integration
- **Stacks Smart Contracts**: Full-featured Clarity contracts with testing suites
- **Real-World dApps**: Production-ready applications including payment processing and merchant dashboards
- **Backend Services**: TypeScript/Node.js API with blockchain event indexing via Chainhook
- **Wallet Integration**: Wallet setup and transaction management
- **Escrow Management**: Secure payment and service delivery workflows

### Cryptographic Research
- **Educational Focus**: Clear, well-documented implementations prioritizing understanding over optimization
- **From-First-Principles**: Building blocks without relying on black-box cryptographic libraries
- **Production Quality**: Rust implementations with full test coverage for ZK primitives

---

## 💡 Use Cases

1. **Learning Stacks Development** – Start with counter-dapp, timelock, or tic-tac-toe
2. **Building Payment Systems** – Reference StackPay for a complete merchant platform
3. **Understanding ZK Proofs** – Explore FFT, KZG, GKR, and sum-check implementations
4. **Smart Contract Integration** – Use backend services for blockchain event monitoring

---

## 📖 Documentation

| Project | Documentation |
|---------|---------------|
| StackPay | [stackpay-app/README.md](stackpay-app/README.md) |
| Payment dApp | [payment-dapp/README.md](payment-dapp/README.md) |
| Counter | [counter/](counter/) contracts and tests |
| Backend | [backend/](backend/) API and indexing |

---

## 🛠️ Technology Stack

### Frontend
- React 18+
- TypeScript
- Vite (build tool)
- TailwindCSS
- Zustand / React Query (state management)

### Smart Contracts
- Clarity (Stacks)
- Vitest (testing)

### Backend & Services
- Node.js + TypeScript
- Supabase (auth & database)
- Chainhook (blockchain indexing)

### Cryptography
- Rust
- Finite field arithmetic
- Polynomial mathematics

---

## 🚦 Project Maturity

| Status | Projects |
|--------|----------|
| **Production Ready** | StackPay, Counter, Payment dApp |
| **In Development** | Secret Wisher, Timelock enhancements |
| **Educational/Research** | ZK proof implementations, cryptographic primitives |

---

## 📝 Philosophy

### For Web3 Projects
- Prioritize security and user experience
- Ensure blockchain integration is clear and maintainable
- Provide comprehensive testing
- Create seamless onboarding workflows

### For Cryptographic Implementations
- Correctness and clarity over premature optimization
- Educational value and understanding over performance
- Full documentation and test coverage
- From-first-principles approach

---

## 🔄 Development Workflow

1. **Smart Contracts**: Write in Clarity, test with Vitest
2. **Frontend**: Build with React + Vite, style with TailwindCSS
3. **Backend**: TypeScript services with Supabase integration and Chainhook monitoring
4. **Deployment**: Vercel/Netlify for frontends, Stacks testnet/mainnet for contracts

---

## 📋 Notable Implementation Details

- **FFT Module**: Optimized polynomial multiplication for cryptographic proofs
- **KZG Commitments**: Efficient batch verification capabilities
- **GKR Protocol**: Circuit-based computation verification with sum-check
- **StackPay Architecture**: Complete end-to-end merchant payment workflow with escrow management
- **Backend Indexing**: Real-time blockchain event monitoring via Chainhook

---

## ⚠️ Important Notes

- **Cryptographic implementations** prioritize clarity; conduct security audits before production use
- **Smart contracts** have been tested but always perform thorough audits before mainnet deployment
- Implementations evolve as understanding improves
- Some code intentionally favors clarity and understandability over performance

---

## 🤝 Contributing

Contributions are welcome! Please ensure:
1. Code follows project conventions
2. Tests are included and pass
3. Documentation is updated
4. Security best practices are followed for contracts

---

## 📚 Additional Resources

- [Stacks Documentation](https://docs.stacks.co)
- [Clarity Language Reference](https://docs.stacks.co/clarity)
- [ZK Proof Fundamentals](https://zkproofs.com)
- [Vite Documentation](https://vitejs.dev)
- [Rust Book](https://doc.rust-lang.org/book/)

---

## 📄 License

See individual project directories for specific licensing information.

---

**Last Updated**: January 2026
