# 🏦 Choma Wallet Implementation Roadmap

## 📋 Overview
This document outlines the comprehensive implementation of the Choma Wallet system, integrating Paystack virtual accounts for seamless meal plan payments and refunds.

## 🎯 Objectives
- Enable users to fund their wallet via bank transfers to virtual accounts
- Use wallet balance for meal plan payments with auto-renewal options
- Handle refunds directly to wallet balance
- Provide comprehensive transaction history and management

## 📊 Current State Analysis

### ✅ Already Implemented
- **Payment Infrastructure**: Paystack integration with test/live keys
- **Payment Controller**: Basic payment initialization, verification, webhook handling
- **Payment Routes**: `/payments/*` endpoints already exist
- **Payment Service**: Frontend PaymentService class
- **Wallet UI**: Basic WalletScreen with mock data
- **Environment Setup**: All required Paystack keys configured

### ❌ Missing Components
- Virtual account creation and management
- Wallet balance storage and tracking
- Transaction history database
- Wallet-specific API endpoints
- Auto-renewal logic
- Webhook handling for virtual account credits

## 🗂️ Database Architecture

### 1. Extended Customer Model
```javascript
// Add to existing Customer schema (/backend/models/Customer.js)
wallet: {
  balance: { type: Number, default: 0 },
  accountNumber: { type: String, unique: true, sparse: true },
  accountName: { type: String },
  bankName: { type: String, default: 'Paystack-Titan' },
  paystackCustomerCode: { type: String },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  dailyLimit: { type: Number, default: 100000 }, // ₦100k for basic users
  minimumTopUp: { type: Number, default: 5000 },
  maximumTopUp: { type: Number, default: 500000 },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
},

subscriptionPreferences: {
  autoRenewal: { type: Boolean, default: false },
  autoRenewalSource: { type: String, enum: ['wallet', 'card'], default: 'wallet' },
  lowBalanceNotifications: { type: Boolean, default: true },
  renewalReminders: { type: Boolean, default: true }
}
```

### 2. New WalletTransaction Model
```javascript
// New file: /backend/models/WalletTransaction.js
const WalletTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  source: { 
    type: String, 
    enum: ['bank_transfer', 'card', 'refund', 'meal_payment', 'subscription_payment'], 
    required: true 
  },
  description: { type: String, required: true },
  reference: { type: String, unique: true },
  paystackReference: { type: String },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  metadata: {
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    paystackData: { type: Object }
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});
```

## 🔧 Backend Implementation

### 1. Services Layer

#### A. WalletService
**File**: `/backend/services/walletService.js`
**Functions**:
- `createVirtualAccount(userId)`: Create Paystack virtual account
- `getWalletBalance(userId)`: Get current wallet balance
- `creditWallet(userId, amount, source, reference)`: Add money to wallet
- `debitWallet(userId, amount, purpose, reference)`: Deduct money from wallet
- `getTransactionHistory(userId, pagination)`: Get wallet transactions
- `checkDailyLimit(userId, amount)`: Validate transaction limits

#### B. PaystackService  
**File**: `/backend/services/paystackService.js`
**Functions**:
- `createDedicatedAccount(customerData)`: Create virtual account via Paystack API
- `verifyTransaction(reference)`: Verify transaction status
- `handleWebhookEvent(event)`: Process webhook notifications

### 2. Controllers Layer

#### A. WalletController
**File**: `/backend/controllers/walletController.js`
**Endpoints**:
- `GET /wallet/balance`: Get wallet balance
- `GET /wallet/account`: Get virtual account details
- `GET /wallet/transactions`: Get transaction history
- `POST /wallet/transfer`: Internal wallet operations
- `PUT /wallet/preferences`: Update auto-renewal settings

#### B. Enhanced PaymentController
**Existing file**: `/backend/controllers/paymentController.js`
**Add functions**:
- `handleVirtualAccountWebhook()`: Process virtual account credits
- `payWithWallet()`: Handle wallet-based payments
- `processHybridPayment()`: Handle wallet + card payments

### 3. Routes Layer

#### A. New Wallet Routes
**File**: `/backend/routes/wallet.js` (NEW)
```javascript
router.get('/balance', auth, WalletController.getBalance);
router.get('/account', auth, WalletController.getAccount);
router.get('/transactions', auth, WalletController.getTransactions);
router.post('/transfer', auth, WalletController.transfer);
router.put('/preferences', auth, WalletController.updatePreferences);
```

#### B. Enhanced Payment Routes
**Existing file**: `/backend/routes/payments.js`
**Add routes**:
```javascript
router.post('/wallet-payment', auth, PaymentController.payWithWallet);
router.post('/hybrid-payment', auth, PaymentController.payWithHybrid);
```

## 📱 Frontend Implementation

### 1. Enhanced Screens

#### A. WalletScreen Updates
**File**: `/src/screens/dashboard/WalletScreen.js`
**Changes**:
- Replace mock data with real API calls
- Show real account number from backend
- Display actual wallet balance
- Add recent transactions section
- Add auto-renewal toggle

#### B. New Transaction History Screen
**File**: `/src/screens/dashboard/TransactionHistoryScreen.js` (NEW)
**Features**:
- Paginated transaction list
- Filter by transaction type
- Search by reference/description
- Export transaction history

#### C. Enhanced Payment Flow
**Files**: Payment screens and checkout flows
**Changes**:
- Add "Pay with Wallet" option
- Show wallet balance during checkout
- Handle insufficient balance scenarios
- Implement hybrid payment UI

### 2. Services Layer

#### A. Enhanced WalletService
**File**: `/src/services/walletService.js` (NEW)
**Functions**:
- `getWalletBalance()`: Fetch current balance
- `getTransactionHistory(pagination)`: Fetch transactions
- `updateAutoRenewalSettings(settings)`: Update preferences
- `getVirtualAccountDetails()`: Get account info

#### B. Enhanced PaymentService
**Existing file**: `/src/services/paymentService.js`
**Add functions**:
- `payWithWallet(amount, purpose)`: Process wallet payments
- `payWithHybrid(walletAmount, cardAmount, purpose)`: Handle hybrid payments
- `checkWalletBalance()`: Validate sufficient balance

## 🔄 Integration Points

### 1. User Registration Flow
- Automatically create virtual account when user registers
- Send welcome notification with account details
- Initialize wallet with ₦0 balance

### 2. Subscription Payment Flow
- Check auto-renewal preference 24hrs before renewal
- If wallet selected and sufficient balance: auto-deduct
- If insufficient balance: send notification with options
- If card selected: use existing payment flow

### 3. Order Payment Flow
- Add wallet option in payment methods
- Show wallet balance and required amount
- Handle partial wallet payments
- Implement "Top up and pay" flow

### 4. Refund Processing
- Automatically credit refunds to wallet
- Send notification of credit
- Update transaction history

## 🔐 Security & Compliance

### 1. Webhook Security
- Verify Paystack webhook signatures
- Implement IP whitelisting
- Use secure webhook endpoints
- Log all webhook events

### 2. Transaction Security
- Encrypt sensitive transaction data
- Implement transaction limits
- Add fraud detection patterns
- Require authentication for large amounts

### 3. Data Protection
- Encrypt wallet account numbers
- Secure API endpoints
- Implement rate limiting
- Add audit logging

## 📈 Monitoring & Analytics

### 1. Wallet Metrics
- Total wallet balance across users
- Daily/monthly transaction volumes
- Top-up success rates
- Auto-renewal success rates

### 2. User Behavior
- Wallet vs card payment preferences
- Average wallet balance
- Transaction frequency patterns
- Refund claim rates

## 🧪 Testing Strategy

### 1. Unit Tests
- Service layer functions
- Controller endpoints
- Model validations
- Utility functions

### 2. Integration Tests
- Paystack API integration
- Webhook handling
- Payment flows
- Database operations

### 3. End-to-End Tests
- Complete wallet funding flow
- Subscription payment with wallet
- Refund processing
- Auto-renewal scenarios

## 📅 Implementation Timeline

### Phase 1: Core Infrastructure (Days 1-3)
- [ ] Extend Customer model with wallet fields
- [ ] Create WalletTransaction model
- [ ] Implement WalletService base functions
- [ ] Create PaystackService for virtual accounts

### Phase 2: API Development (Days 4-6)
- [ ] Implement WalletController
- [ ] Create wallet routes
- [ ] Enhance PaymentController
- [ ] Implement webhook handling

### Phase 3: Frontend Integration (Days 7-9)
- [ ] Update WalletScreen with real data
- [ ] Create TransactionHistoryScreen
- [ ] Add wallet payment options to checkout
- [ ] Implement auto-renewal settings

### Phase 4: Testing & Polish (Days 10-12)
- [ ] Comprehensive testing
- [ ] Bug fixes and optimizations
- [ ] Security review
- [ ] Performance optimization

## 🚨 Risk Mitigation

### 1. Paystack API Failures
- Implement retry mechanisms
- Add fallback payment methods
- Monitor API status
- Cache account details

### 2. Webhook Reliability
- Implement idempotency
- Add manual reconciliation
- Monitor webhook delivery
- Implement retry logic

### 3. Balance Discrepancies
- Regular balance reconciliation
- Transaction audit trails
- Automated balance checks
- Manual correction procedures

## 📋 Success Metrics

### 1. Technical Metrics
- Webhook success rate > 99.5%
- API response time < 500ms
- Zero balance discrepancies
- Payment success rate > 98%

### 2. Business Metrics
- Wallet adoption rate > 60%
- Auto-renewal rate improvement
- Reduced payment failures
- Increased user retention

---

## 📝 Implementation Progress

### ✅ Completed
- [ ] Phase 1: Core Infrastructure
- [ ] Phase 2: API Development  
- [ ] Phase 3: Frontend Integration
- [ ] Phase 4: Testing & Polish

### 🔄 Currently Working On
- Initial roadmap documentation

### ⏳ Next Steps
- Start Phase 1: Database model updates

---

*Last Updated: [Current Date]*
*Next Review: [Weekly Update Schedule]*