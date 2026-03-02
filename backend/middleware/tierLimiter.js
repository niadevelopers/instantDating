import Subscription from "../models/Subscription.js";

export default async (req, res, next) => {

  const sub = await Subscription.findOne({
    user: req.user._id
  });

  if (!sub)
    return res.status(403).json({
      msg: "Upgrade required"
    });

  const plan = sub.plan;

  if (plan === "Elite")
    return next();

  if (plan === "Premium" && sub.usage.daily >= 20)
    return res.status(403).json({
      msg: "Daily limit reached"
    });

  if (plan === "Legend" && sub.usage.weekly >= 100)
    return res.status(403).json({
      msg: "Weekly limit reached"
    });

  next();
};