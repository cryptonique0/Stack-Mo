# Stack-Mo – Web3 & Zero-Knowledge Proof Projects

A comprehensive repository containing **blockchain dApps**, **smart contracts**, and **cryptographic implementations** focused on the Stacks blockchain and zero-knowledge proof systems.

This workspace includes production-ready applications, educational implementations, and research projects exploring the intersection of blockchain, cryptography, and decentralized finance.

---

## 📚 Repository Overview

### **Blockchain Applications & dApps**

#### Counter dApp
- **Location**: `counter/`, `counter-dapp/`
- **Purpose**: Introductory smart contract and frontend for learning Stacks development
- **Stack**: Clarity (contracts), React + Vite (frontend), TypeScript

#### Payment dApp
- **Location**: `payment-dapp/`
- **Purpose**: Payment processing interface on Stacks blockchain
- **Stack**: React + Vite, TailwindCSS, Stacks integration

#### StackPay Application
- **Location**: `stackpay/`, `stackpay-app/`
- **Purpose**: Merchant dashboard and payment platform powered by Stacks
- **Features**: Onboarding, invoice management, wallet integration, real-time transaction tracking
- **Tech Stack**: Clarity smart contracts, React + Vite, TailwindCSS, Supabase backend
- **Documentation**: See [stackpay-app/README.md](stackpay-app/README.md)

#### Secret Wisher dApp
- **Location**: `secret-wisher/`, `secret-wisher-dapp/`
- **Purpose**: Decentralized wishlist/gifting application on Stacks
- **Stack**: Clarity contracts, React + Vite frontend

#### Timelock Contracts
- **Location**: `timelock/`
- **Purpose**: Time-locked smart contracts for scheduled transactions
- **Stack**: Clarity smart contracts

#### Token System
- **Location**: `my-token/`
- **Purpose**: Custom token implementation on Stacks
- **Stack**: Clarity SIP-010 token standard

#### Tic-Tac-Toe Game
- **Location**: `tic-tac-toe/`
- **Purpose**: On-chain game implementation
- **Stack**: Clarity smart contracts, test suite

#### Hello World
- **Location**: `hello-world/`
- **Purpose**: Minimal Stacks smart contract starter template

### **Backend Services**

#### Backend Server
- **Location**: `backend/`
- **Purpose**: API server and blockchain indexing service
- **Stack**: TypeScript/Node.js
- **Features**: Chainhook integration, contract event monitoring, type definitions

---

## 🔐 Cryptographic & Zero-Knowledge Proof Implementations

Pure Rust implementations of core ZK primitives and polynomial operations:

### `fft/` – Fast Fourier Transform
Efficient polynomial evaluation and multiplication over finite fields.

**Includes**: Recursive FFT, inverse FFT, polynomial multiplication

### `univariate_poly/` – Univariate Polynomials
Core polynomial operations over prime fields: arithmetic, evaluation, interpolation

### `multivariate_poly/` – Multivariate Polynomials
Multilinear extensions and multi-variable polynomial operations

### `shamir_secret_sharing/` – Threshold Cryptography
Polynomial-based secret sharing with finite-field arithmetic

### `sum_check/` – Sum-Check Protocol
Interactive proof protocol for multilinear polynomial evaluation

**Used in**: GKR protocols, efficient proof systems

### `gkr/` – Goldwasser–Kalai–Rothblum Protocol
Scalable verification of computation over layered arithmetic circuits

### `kzg/` – Kate–Zaverucha–Goldberg Commitments
Polynomial commitment scheme with efficient witness computation

### `lagrange/` – Lagrange Interpolation
Standalone implementation of Lagrange interpolation over finite fields

---

## 🚀 Getting Started

### For dApp Development

Each dApp has its own setup instructions. Example:

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
│   ├── kzg/                   # KZG commitments
│   └── other-implementations/
└── docs/

Repository Structure

Each Rust directory focuses on a specific primitive or protocol commonly used in zero-knowledge systems.

### `fft/`
Implementations of the Fast Fourier Transform over suitable fields and domains.

Used for:
- Polynomial evaluation and interpolation
- Fast polynomial multiplication
- Foundations for quotient polynomials in zk systems

Includes:
- Recursive FFT
- Inverse FFT
- Polynomial multiplication via FFT

---

### `univariate_poly/`
Core univariate polynomial operations over finite fields.

Includes:
- Polynomial arithmetic
- Evaluation
- Interpolation
- Utilities reused across multiple protocols

---

### `multivariate_poly/`
Multivariate polynomial representations and operations.

Relevant for:
- Multilinear extensions
- Sum-check protocol
- GKR-style protocols

---

### `lagrange interpolation over prime fields/`
Standalone implementations of Lagrange interpolation over finite fields.

Used for:
- Polynomial reconstruction from evaluations
- Foundations for commitments and proof systems

---

### `shamir_secret_sharing/`
Implementation of Shamir’s Secret Sharing scheme.

Covers:
- Polynomial-based secret sharing
- Threshold reconstruction
- Finite-field arithmetic

Serves as an early bridge between polynomial algebra and cryptographic protocols.

---

### `sum_check/`
Implementation of the Sum-Check protocol.

Used in:
- GKR
- Multilinear polynomial verification
- Interactive proof systems

Includes:
- Iterative sum-check rounds
- Polynomial reductions
- Verifier checks

---

### `gkr/`
Implementation of the Goldwasser–Kalai–Rothblum (GKR) protocol.

Focuses on:
- Verifying computations over layered arithmetic circuits
- Combining sum-check with polynomial techniques
- Scalable verification of computation

---

### `kzg/`
Implementations related to the Kate–Zaverucha–Goldberg (KZG) polynomial commitment scheme.

Includes:
- Univariate KZG commitments
- Multilinear KZG constructions
- Witness computation and verification logic

This module connects polynomial algebra directly to cryptographic commitments and pairings.

---

### `impl simple circuit/`
Early experiments with representing and evaluating arithmetic circuits.

Used to:
- Ground abstract protocols in concrete computation
- Prepare for circuit-based proof systems and arithmetization

---

## Goals of This Repository

- Build zero-knowledge primitives from scratch
- Understand how algebra, polynomials, and cryptography connect
- Explore how FFTs, commitments, and interactive proofs fit together
- Serve as a long-term reference while studying zk systems

This is **not** a production library.  
Correctness, clarity, and understanding take priority over optimization.

---

## Planned / Future Additions

Possible future work includes:
- FFT-based polynomial division
- Multi-point KZG openings
- PLONK-style quotient polynomial construction
- Lookup arguments
- Constraint systems and arithmetization
- Comparisons with STARK-style constructions

---

## Notes

- Most modules assume familiarity with finite fields and basic cryptography
- Implementations may change as understanding improves
- Some code intentionally favors clarity over performance
