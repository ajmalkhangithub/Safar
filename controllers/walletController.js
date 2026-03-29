import Wallet from "../models/Wallet.js";
import BookingRequest from "../models/BookingRequest.js";
import User from "../models/User.js";

// Get or create wallet for user
export const getWallet = async (req, res) => {
  try {
    const { userId } = req.params;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      // Create new wallet
      wallet = new Wallet({ userId });
      await wallet.save();
    }

    // Calculate current balances from bookings
    const acceptedBookings = await BookingRequest.find({
      travelerId: userId,
      status: "accepted",
    });

    let totalEarnings = 0;
    let paidEarnings = 0;
    let pendingEarnings = 0;
    let totalCommissions = 0;

    acceptedBookings.forEach((booking) => {
      const amount = booking.paymentAmount || 0;
      totalEarnings += amount;
      const commission = amount * (wallet.commissionRate || 0.1);
      totalCommissions += commission;

      if (booking.paymentStatus === "paid") {
        paidEarnings += amount - commission;
      } else {
        pendingEarnings += amount - commission;
      }
    });

    // Update wallet balances
    wallet.totalEarnings = totalEarnings;
    wallet.totalCommissions = totalCommissions;
    wallet.availableBalance = paidEarnings;
    wallet.pendingBalance = pendingEarnings;
    wallet.totalPayouts = paidEarnings; // Assuming all paid earnings have been paid out
    await wallet.save();

    res.status(200).json({
      message: "Wallet retrieved successfully",
      data: wallet,
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

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId });
      await wallet.save();
    }

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

    const bookings = await BookingRequest.find({
      travelerId: userId,
      status: "accepted",
    })
      .populate("packageId", "packageName")
      .populate("senderId", "name")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const wallet = await Wallet.findOne({ userId });
    const commissionRate = wallet?.commissionRate || 0.1;

    const transactions = bookings.map((booking) => {
      const amount = booking.paymentAmount || 0;
      const commission = amount * commissionRate;
      const netAmount = amount - commission;

      return {
        id: booking._id,
        type: "earning",
        description: `Delivery: ${booking.packageId?.packageName || "Package"}`,
        amount: amount,
        commission: commission,
        netAmount: netAmount,
        status: booking.paymentStatus || "pending",
        date: booking.createdAt,
        sender: booking.senderId?.name || "Sender",
        packageId: booking.packageId?._id || booking.packageId,
      };
    });

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

    const wallet = await Wallet.findOne({ userId });
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

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (!wallet.stripeAccountId || !wallet.stripeOnboardingCompleted) {
      return res.status(400).json({
        message: "Please complete Stripe account setup first",
      });
    }

    if (amount > wallet.availableBalance) {
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
    wallet.availableBalance -= amount;
    wallet.totalPayouts += amount;
    await wallet.save();

    res.status(200).json({
      message: "Payout requested successfully",
      data: {
        payoutId: `payout_${Date.now()}`,
        amount: amount,
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
