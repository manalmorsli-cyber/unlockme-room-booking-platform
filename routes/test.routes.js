const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");

router.get("/private", auth, (req, res) => {
  res.json({
    message: "Accès autorisé",
    user: req.user
  });
});

router.get("/admin", auth, role("admin"), (req, res) => {
  res.json({ message: "Bienvenue admin" });
});

module.exports = router;
