const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  let token;

  // Le token est envoyé dans le header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user || !req.user.active) {
        return res.status(401).json({ message: "Utilisateur non autorisé" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Token invalide" });
    }
  } else {
    return res.status(401).json({ message: "Pas de token" });
  }
};

module.exports = auth;
