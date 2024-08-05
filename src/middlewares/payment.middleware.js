import { User } from "../models/user.model.js";
import { Streams } from "../models/streams.model.js";

const verifyPayment = async (req, res, next) => {
  const userId = req.user._id;
  const streamerId = req.params.id;
  console.log(streamerId);

  try {
    const user = await User.findById(userId);
    const stream = await Streams.findOne({ userId: streamerId });

    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
    }
    if (stream.userId.toString() === userId.toString()) {
      return next();
    }
    if (stream.ticketPrice <= 0) {
      // console.log("Stream is free");
      return next();
    }

    if (
      user &&
      user.payments.some((payment) => payment.userId.toString() === streamerId)
    ) {
      //console.log("User has paid for this stream");
      return next();
    } else {
      res.status(403).json({ message: "Payment required" });
    }
  } catch (error) {
    console.error("Error in verifyPayment middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { verifyPayment };
