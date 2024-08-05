import express from "express";
import Stripe from "stripe";
import { User } from "../models/user.model.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_KEY);
const stripeEndpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        stripeEndpointSecret
      );
    } catch (err) {
      console.error(
        "Stripe webhook signature verification failed:",
        err.message
      );
      return res.status(400).send(`Stripe Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { userId, currentUser } = session.metadata;
      console.log("payment complete");
      try {
        // Update the user document with the paid stream
        await User.findByIdAndUpdate(
          currentUser,
          { $addToSet: { payments: { userId } } },
          { new: true }
        );
        res.status(200).send("Payment recorded successfully");
      } catch (err) {
        console.error("Error updating user payment status:", err.message);
        res.status(500).send("Internal Server Error");
      }
    } else {
      console.log(`Unhandled event type ${event.type}`);
      res.status(400).send("Event type not handled");
    }
  }
);

export default router;
