# StackPay Frontend

The **StackPay Frontend** is the merchant-facing dashboard and payment interface for [StackPay](https://github.com/yourname/stackpay).  
It provides a smooth onboarding flow, business account management, and real-time payment tracking — all powered by the Stacks blockchain.

---

## Features

- **Onboarding Flow** – Collect business biodata & verification  
- **Merchant Dashboard** – See invoices, balances, and activity at a glance  
- **Bitcoin Wallet Setup** – Create or connect a BTC/Stacks wallet  
- **Invoice Creation** – Generate invoices with unique payment addresses & QR codes  
- **Transaction Tracking** – Real-time updates for pending/confirmed payments  
- **Escrow Management** – Release funds after successful trade/service  
- **Settings** – Manage business profile, notifications, and security  

---

## Tech Stack

- **Frontend Framework**: [Vite](https://vitejs.dev/) + [React](https://react.dev/)  
- **UI Library**: [TailwindCSS](https://tailwindcss.com/)  
- **State Management**: React Query / Zustand (TBD)  
- **Backend**: [Supabase](https://supabase.com/) (auth, storage, database)  
- **Blockchain**: [Stacks](https://stacks.co) (Clarity smart contracts)  

---

## Project Structure

```

stackpay-frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Dashboard pages (Home, Invoices, Wallet, Settings)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # API clients (Supabase, Blockchain, Backend)
│   └── styles/          # Tailwind config and global styles
├── public/              # Static assets
├── package.json
└── vite.config.js

````

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/yourname/stackpay-frontend.git
cd stackpay-frontend

# 2. Install dependencies
npm install

# 3. Add your environment variables
cp .env.example .env
# fill in your Supabase project keys + API endpoints

# 4. Start the development server
npm run dev
````

The app should now be running at **[http://localhost:5173](http://localhost:5173)** 🎉

---

## Environment Variables

Create a `.env` file with the following values:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:4000  # backend server
```

---

## Documentation

* [How StackPay Works](../docs/how-it-works.md)
* [Smart Contracts (Clarity)](../contracts/README.md)
* [Backend API](../backend/README.md)

---

## Roadmap (Frontend)

* [ ] Onboarding flow with Supabase auth + profile setup
* [ ] Wallet creation/connection flow
* [ ] Invoice creation + sharing (link + QR)
* [ ] Real-time transaction status updates
* [ ] Escrow management UI
* [ ] Merchant analytics dashboard
* [ ] Deploy to production (Vercel/Netlify)

---

## Contributing

We’d love help building StackPay!
If you’re into **UI/UX**, **frontend dev**, or **crypto payments**, feel free to open an issue or PR.

```bash
# Run linter
npm run lint

# Run tests
npm run test
```

---

## Inspiration

StackPay frontend is inspired by **Stripe Dashboard** and **Paystack Merchant UI** — reimagined for **Bitcoin-native programmable commerce**.

---

## Contact

Built with ❤️ by [@psalmuel\_1st](https://x.com/psalmuel_1st)

---

## License

MIT © 2025 Samuel Dahunsi