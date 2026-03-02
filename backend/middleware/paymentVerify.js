import Subscription from "../models/Subscription.js";

export default async (req, res, next) => {

  const sub =
    await Subscription.findOne({
      user: req.user._id
    });

  if (!sub)
    return res.status(403).json({
      msg: "Subscription required"
    });

  if (new Date() > sub.expiry)
    return res.status(403).json({
      msg: "Subscription expired"
    });

  req.subscription = sub;

  next();
};