import Wallet from "../models/Wallet.js";
import BookingRequest from "../models/BookingRequest.js";
import User from "../models/User.js";

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = new Wallet({ userId });
    await wallet.save();
  }
  return wallet;
};

const syncWalletBalances = async (wallet, userId) => {
  const travelerBookings = await BookingRequest.find({
    travelerId: userId,
    status: "accepted",
  });

  const senderBookings = await BookingRequest.find({
    senderId: userId,
    status: "accepted",
  });

  let totalEarnings = 0;
  let paidEarnings = 0;
  let pendingEarnings = 0;
  let totalCommissions = 0;

  travelerBookings.forEach((booking) => {
    const amount = Number(booking.paymentAmount || 0);
    totalEarnings += amount;
    const commission = amount * (wallet.commissionRate || 0.1);
    totalCommissions += commission;

    if (booking.paymentStatus === "paid" || booking.paymentStatus === "released") {
      paidEarnings += amount - commission;
    } else {
      pendingEarnings += amount - commission;
    }
  });

  const pendingPayments = senderBookings
    .filter((booking) => booking.paymentStatus !== "paid" && booking.paymentStatus !== "released")
    .reduce((sum, booking) => sum + Number(booking.paymentAmount || 0), 0);

  wallet.totalEarnings = totalEarnings;
  wallet.totalCommissions = totalCommissions;
  wallet.pendingBalance = pendingEarnings;
  wallet.pendingPayments = pendingPayments;
  wallet.availableBalance = Math.max(Number(wallet.availableBalance || 0), paidEarnings);
  await wallet.save();

  return {
    totalEarnings,
    paidEarnings,
    pendingEarnings,
    pendingPayments,
  };
};

// Get or create wallet for user
export const getWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = await getOrCreateWallet(userId);
    const balances = await syncWalletBalances(wallet, userId);
    const user = await User.findById(userId).select("activeRole roles");

    res.status(200).json({
      message: "Wallet retrieved successfully",
      data: {
        ...wallet.toObject(),
        pendingPayments: balances.pendingPayments,
        currency: "PKR",
        activeRole: user?.activeRole || null,
      },
    });
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Create Stripe Connect account link (onboarding)
export const createStripeAccountLink = async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = await getOrCreateWallet(userId);

    // TODO: In production, integrate with Stripe API
    // For now, return a mock onboarding link
    // In production, you would:
    // 1. Create Stripe Connect account: stripe.accounts.create()
    // 2. Create account link: stripe.accountLinks.create()
    // 3. Store stripeAccountId in wallet
    // 4. Return onboarding link

    const mockOnboardingLink = `https://connect.stripe.com/setup/s/mock_${userId}`;
    
    wallet.stripeAccountId = `acct_mock_${userId}`;
    wallet.stripeOnboardingLink = mockOnboardingLink;
    wallet.stripeAccountStatus = "pending";
    await wallet.save();

    res.status(200).json({
      message: "Stripe account link created successfully",
      data: {
        onboardingLink: mockOnboardingLink,
        accountId: wallet.stripeAccountId,
        status: wallet.stripeAccountStatus,
      },
    });
  } catch (error) {
    console.error("Create Stripe account link error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Stripe account status
export const getStripeAccountStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // TODO: In production, check actual Stripe account status
    // stripe.accounts.retrieve(wallet.stripeAccountId)

    res.status(200).json({
      message: "Stripe account status retrieved successfully",
      data: {
        accountId: wallet.stripeAccountId,
        status: wallet.stripeAccountStatus,
        onboardingCompleted: wallet.stripeOnboardingCompleted,
        onboardingLink: wallet.stripeOnboardingLink,
      },
    });
  } catch (error) {
    console.error("Get Stripe account status error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get transaction history
export const getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const incomingBookings = await BookingRequest.find({
      travelerId: userId,
      status: "accepted",
    })
      .populate("packageId", "packageName")
      .populate("senderId", "name")
      .sort({ createdAt: -1 });

    const outgoingBookings = await BookingRequest.find({
      senderId: userId,
      status: "accepted",
    })
      .populate("packageId", "packageName")
      .populate("travelerId", "name")
      .sort({ createdAt: -1 });

    const wallet = await getOrCreateWallet(userId);
    const commissionRate = wallet?.commissionRate || 0.1;

    const creditTransactions = incomingBookings.map((booking) => {
      const amount = booking.paymentAmount || 0;
      const commission = amount * commissionRate;
      const netAmount = amount - commission;

      return {
        id: booking._id,
        type: "credit",
        description: `Delivery: ${booking.packageId?.packageName || "Package"}`,
        amount: netAmount,
        commission: commission,
        netAmount: netAmount,
        status: booking.paymentStatus || "pending",
        date: booking.createdAt,
        sender: booking.senderId?.name || "Sender",
        packageId: booking.packageId?._id || booking.packageId,
      };
    });

    const debitTransactions = outgoingBookings.map((booking) => {
      const amount = Number(booking.paymentAmount || 0);
      return {
        id: `debit_${booking._id}`,
        type: "debit",
        description: `Payment: ${booking.packageId?.packageName || "Package"}`,
        amount,
        status: booking.paymentStatus || "pending",
        date: booking.createdAt,
        traveler: booking.travelerId?.name || "Traveler",
        packageId: booking.packageId?._id || booking.packageId,
      };
    });

    const walletTransactions = (wallet.transactionHistory || []).map((transaction) => ({
      id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      description: transaction.description,
      date: transaction.createdAt,
      category: transaction.category,
      bookingId: transaction.bookingId,
    }));

    const transactions = [...creditTransactions, ...debitTransactions, ...walletTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, parseInt(limit));

    res.status(200).json({
      message: "Transaction history retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    console.error("Get transaction history error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get payout history
export const getPayoutHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await BookingRequest.find({
      travelerId: userId,
      paymentStatus: "paid",
    })
      .populate("packageId", "packageName")
      .populate("senderId", "name")
      .sort({ paidAt: -1 });

    const wallet = await getOrCreateWallet(userId);
    const commissionRate = wallet?.commissionRate || 0.1;

    const payouts = bookings.map((booking) => {
      const amount = booking.paymentAmount || 0;
      const commission = amount * commissionRate;
      const netAmount = amount - commission;

      return {
        id: booking._id,
        payoutId: `payout_${booking._id}`,
        amount: netAmount,
        commission: commission,
        grossAmount: amount,
        status: "paid",
        paidAt: booking.paidAt || booking.updatedAt,
        description: `Payout for: ${booking.packageId?.packageName || "Package"}`,
        packageId: booking.packageId?._id || booking.packageId,
      };
    });

    res.status(200).json({
      message: "Payout history retrieved successfully",
      data: payouts,
    });
  } catch (error) {
    console.error("Get payout history error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Request payout (initiate Stripe payout)
export const requestPayout = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    const numericAmount = Number(amount || 0);

    const wallet = await getOrCreateWallet(userId);
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (!wallet.stripeAccountId || !wallet.stripeOnboardingCompleted) {
      return res.status(400).json({
        message: "Please complete Stripe account setup first",
      });
    }

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        message: "Please provide a valid amount",
      });
    }

    if (numericAmount > wallet.availableBalance) {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    // TODO: In production, create Stripe transfer
    // stripe.transfers.create({
    //   amount: amount * 100, // Convert to cents
    //   currency: "usd",
    //   destination: wallet.stripeAccountId,
    // })

    // For now, simulate payout
    wallet.availableBalance -= numericAmount;
    wallet.totalPayouts += numericAmount;
    wallet.transactionHistory.push({
      amount: numericAmount,
      type: "debit",
      category: "withdrawal",
      status: "pending",
      description: "Traveler withdrawal request",
    });
    await wallet.save();

    res.status(200).json({
      message: "Payout requested successfully",
      data: {
        payoutId: `payout_${Date.now()}`,
        amount: numericAmount,
        status: "pending",
        estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      },
    });
  } catch (error) {
    console.error("Request payout error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Add funds to sender wallet (basic mock top-up)
export const addFunds = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    const numericAmount = Number(amount || 0);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        message: "Please provide a valid amount",
      });
    }

    const wallet = await getOrCreateWallet(userId);
    wallet.availableBalance += numericAmount;
    wallet.transactionHistory.push({
      amount: numericAmount,
      type: "credit",
      category: "deposit",
      status: "completed",
      description: "Funds added by sender",
    });
    await wallet.save();

    res.status(200).json({
      message: "Funds added successfully",
      data: {
        availableBalance: wallet.availableBalance,
        amountAdded: numericAmount,
      },
    });
  } catch (error) {
    console.error("Add funds error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
