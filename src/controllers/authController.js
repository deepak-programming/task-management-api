const User = require("../models/User");
const { generateAccessToken } = require("../utils/jwt");

// REGISTER: Only create user, no token
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "Email already exists" });

    // Create user (schema will validate fields)
    await User.create({ username, email, password });

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please login to get access token."
    });

  } catch (err) {
    // Mongoose validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, errors });
    }
    next(err);
  }
};

// LOGIN: Generate token
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    // Generate token
    let token;
    try {
      token = generateAccessToken({ id: user._id, email: user.email });
    } catch (err) {
      return next(new Error("Token generation failed"));
    }

    res.json({ success: true, accessToken: token });

  } catch (err) {
    next(err);
  }
};
