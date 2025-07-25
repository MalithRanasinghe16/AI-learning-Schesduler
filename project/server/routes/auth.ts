import express, { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import User from "../models/User";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { validateUser } from "../middleware/validation";

const router = express.Router();

// Helper function for generating JWT tokens
const generateToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const signOptions: SignOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as SignOptions;
  
  return jwt.sign({ userId }, jwtSecret, signOptions);
};

// Register
router.post("/register", validateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, learningPreferences } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists with this email" });
      return;
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      learningPreferences: learningPreferences || {},
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        learningPreferences: user.learningPreferences,
        performanceMetrics: user.performanceMetrics,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Update last active date
    user.performanceMetrics.lastActiveDate = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        learningPreferences: user.learningPreferences,
        performanceMetrics: user.performanceMetrics,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get current user
router.get(
  "/me",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json({
        user: {
          id: req.user!._id,
          email: req.user!.email,
          firstName: req.user!.firstName,
          lastName: req.user!.lastName,
          learningPreferences: req.user!.learningPreferences,
          performanceMetrics: req.user!.performanceMetrics,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update user preferences
router.patch(
  "/preferences",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const updates = req.body;

      const user = await User.findByIdAndUpdate(
        req.user!._id,
        updates,
        { new: true, runValidators: true }
      );

      res.json({
        message: "Preferences updated successfully",
        user: {
          id: user!._id,
          email: user!.email,
          firstName: user!.firstName,
          lastName: user!.lastName,
          learningPreferences: user!.learningPreferences,
          performanceMetrics: user!.performanceMetrics,
        },
      });
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update user profile
router.patch(
  "/me",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const updates = req.body;

      const user = await User.findByIdAndUpdate(
        req.user!._id,
        updates,
        { new: true, runValidators: true }
      );

      res.json({
        message: "Profile updated successfully",
        user: {
          id: user!._id,
          email: user!.email,
          firstName: user!.firstName,
          lastName: user!.lastName,
          learningPreferences: user!.learningPreferences,
          performanceMetrics: user!.performanceMetrics,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Logout
router.post("/logout", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // In a JWT-based system, logout is mainly handled on the client side
    // by removing the token. We can optionally update the user's last active date.
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        'performanceMetrics.lastActiveDate': new Date()
      });
    }

    res.json({
      message: "Logout successful"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
