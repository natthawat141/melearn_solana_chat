# Suggested backend contract — provider-neutral
This is an implementation proposal, not production-ready payment code. Choose stack/SDK against current official docs during implementation.

## Entities
User(id, displayName?, locale, level); Teacher(id, enabled); Lesson(id, teacherId, access, version); Conversation(id, userId/guestId, teacherId, lessonId); Message(id, conversationId, role, text, clientMessageId, createdAt); Progress(userId, lessonId, lessonVersion, status, attempts, hintsUsed, rubricScores, updatedAt); Purchase(id, userId, lessonId, priceAtomic, mint, network, recipient, status, signature?); Entitlement(userId, lessonId, purchaseId, startsAt, expiresAt?).
Unique indexes: (conversationId,clientMessageId), signature per network, entitlement purchaseId. Atomic DB transaction on fulfillment.

## Endpoint proposals
GET /teachers → enabled teachers + coming-soon metadata
GET /teachers/:id/lessons → lessons with actual access status
POST /conversations {teacherId,lessonId} → authorized conversation
POST /conversations/:id/messages {clientMessageId,text,mode} → streaming message + final message ID
GET /progress → only authenticated user's progress
POST /lessons/:id/answers {attemptId,answer} → validated result; numeric grader for math, rubric for language
POST /purchases {lessonId} → server quote and purchase ID, never trust client price
POST /purchases/:id/transaction → server-built transaction request; wallet signs only after review
POST /purchases/:id/verify {signature} → server checks chain and fulfills idempotently
GET /purchases/:id → status, entitlement, receipt
DELETE /me/learning-history → authenticated, confirmation in UI; explain what is deleted
All write routes enforce owner authorization, server validation and rate limits. Standard error shape {code,message,retryable,requestId}; no internal secrets.

## Solana demo scope
Use devnet and a clearly labelled test token mint; do not label a custom test token as genuine USDC. Future production USDC mint/configuration must be verified from issuer/network sources during implementation. No own speculative token, escrow or autonomous spending required.
Bind wallet to signed-in account with nonce challenge including domain, network, expiration, single use. Verify backend; never request seed/private key. Learning identity is userId, not public wallet address.
Backend constructs order-specific instruction set with fixed recipient, mint, amount and purchase reference. Verify finalized successful transaction, expected signer/payer, matching reference, recipient, mint, amount and network; do not accept a signature alone or user chat assertion. Use integer atomic token units, not floating point. Reject reused signatures.
Client timeout ≠ failed payment; check purchase status before retry. Access only after backend verification. If network confirmation arrives before DB fulfillment, retry fulfillment safely.
Revenue split is a future configurable rule; no percentage has been approved. For demo, configure explicit test recipients and basis points summing to 10000; transfers can be grouped atomically in one transaction. Do not claim onchain automatic splitting unless actually implemented. If only lesson payment is built, label split as planned in submission.

## Data boundaries
Onchain: payment transfers/order reference without student name, grades or chat.
Offchain: lesson content, account, conversations, progress, entitlements. Offchain does not automatically mean private: access control, encryption, retention policy, deletion and log redaction still required.
Never pass wallet keys/financial identity to LLM. Render generated text safely. Access-check every lesson and conversation server-side, not by hidden UI alone.

## Configuration placeholders (not secrets)
AI_PROVIDER, AI_MODEL, server-only AI_API_KEY; SOLANA_NETWORK=devnet; RPC_URL; TEST_TOKEN_MINT; PAYMENT_RECIPIENT; lesson prices; revenue recipients/basis points; database/auth provider.
No real credentials, live payment addresses or final pricing are supplied in this kit.
