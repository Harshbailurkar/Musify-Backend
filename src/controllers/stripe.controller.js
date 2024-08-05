import { asyncHandler } from "../utils/asyncHandler.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_KEY);

const stripecheckout = asyncHandler(async (req, res) => {
  const { concertName, price, id } = req.body;
  if (!concertName || !price || !id) {
    return res
      .status(400)
      .send("Missing concert name, price, user ID, or stream ID parameter");
  }
  if (isNaN(price) || price <= 0) {
    return res.status(400).send("Invalid price value");
  }
  const currentUser = req.user._id;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: concertName,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CORS_ORIGIN}/stream/${id}?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CORS_ORIGIN}/concerts`,
      metadata: {
        userId: id,
        currentUser: currentUser.toString(),
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    res.status(500).send("Internal Server Error");
  }
});

export { stripecheckout };
