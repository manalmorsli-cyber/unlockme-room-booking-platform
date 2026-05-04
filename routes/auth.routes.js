const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

// Routes
router.post("/register", register);
router.post("/login", login);

const auth = require("../middlewares/auth");
const User = require("../models/User");
const role = require("../middlewares/role"); // AJOUTEZ CETTE LIGNE

// Route pour obtenir l'utilisateur connecte
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// GET /api/auth/users - Liste tous les utilisateurs (admin seulement)
router.get("/users", auth, role("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/auth/users/:id  Modifier un utilisateur
router.put("/users/:id", auth, role("admin"), async (req, res) => {
  try {
    const { role, active } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    
    if (role) user.role = role;
    if (active !== undefined) user.active = active;
    
    await user.save();
    res.json({ message: "Utilisateur mis à jour", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
