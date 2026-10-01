# Wallet login

Wallet login is verified by the Melearn backend. It does not call Dynamic, a blockchain RPC, or a hosted identity provider.

- MetaMask: an EIP-4361 (SIWE) message, signed using `personal_sign`. The backend uses `siwe`/`ethers` to verify normal Ethereum EOA signatures. It uses the connected wallet's chain ID. Contract wallet / ERC-1271 authentication is not supported.
- Phantom and Solflare: SIWS message format through `@solana/wallet-standard-util`, signed using Wallet Standard `solana:signMessage`. The backend verifies Ed25519 signatures locally.
- Account records, guest progress migration, setup redirects and session cookies use the existing Melearn account system. Existing wallet addresses continue to identify the same account.

## Configuration

Local development allows `http://127.0.0.1:43123` and `http://localhost:43123` when `WALLET_AUTH_ORIGIN` is empty. In production set `WALLET_AUTH_ORIGIN` to the exact public HTTPS origin, without a trailing slash, for example `https://melearn.example`. Missing production configuration fails closed. Do not derive the allowed domain from forwarded headers.

No Dynamic environment ID or JWKS configuration is used. Old environment values may be removed independently; this change does not edit private environment files.

## Request validation

Both wallet APIs require an allowed `Origin`. The server generates a random 256-bit nonce and saves a challenge expiring after five minutes. The signed message includes the website domain/URI and a hash binding it to the initiating guest cookie, wallet and chain. Client-provided messages are not accepted: the backend verifies the stored message. A used or expired nonce cannot sign in again. Challenge consumption and account creation/progress migration commit or roll back together.

Local limits remain: 10 challenge requests and 20 verification requests per minute per client IP. These counters are currently per process; a deployment with multiple instances needs a shared limiter and a trusted proxy configuration. This is separate from the removed Dynamic limits.

The browser cooldown key is versioned so an old Dynamic cooldown does not disable the new login flow. Reopen/reload the login page before retrying.

## Validation

Automated tests use isolated SQLite databases and real generated Ed25519/Ethereum signatures. They cover all three wallets, replay, concurrent verification, expiry, forged signatures, origin/browser/wallet/chain binding, account reuse, progress migration and rollback. Real extension approval and mobile wallet handoffs must still be tested with the actual wallets; generated signatures do not establish that browser integration has passed.

References: [SIWE / EIP-4361](https://eips.ethereum.org/EIPS/eip-4361), [Sign In With Solana](https://github.com/phantom/sign-in-with-solana).
