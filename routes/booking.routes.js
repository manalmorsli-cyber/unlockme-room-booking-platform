const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");

// POST /api/bookings
 
router.post("/", auth, role("client"), async (req, res) => {
  try {
    const { room, startDate, endDate } = req.body;

    // Verifier la salle
    const existingRoom = await Room.findById(room);
    if (!existingRoom)
      return res.status(404).json({ message: "Salle introuvable" });

    // Verifier conflits de dates
    const conflict = await Booking.findOne({
      room,
      status: { $ne: "cancelled" },
      $or: [
        { startDate: { $lt: endDate, $gte: startDate } },
        { endDate: { $gt: startDate, $lte: endDate } }
      ]
    });

    if (conflict) {
      return res.status(400).json({
        message: "Salle déjà réservée sur cette période"
      });
    }

    const booking = await Booking.create({
      room,
      user: req.user._id,
      startDate,
      endDate
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//GET /api/bookings/me    Voir reservations
router.get("/me", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("room", "title location")
      .sort({ startDate: 1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get("/", auth, role("admin"), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("room", "title")
      .populate("user", "name email");

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// GET /api/bookings/me  Mes reservations
router.get("/me", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("room", "title location")
      .sort({ startDate: 1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// GET reservations pour owner (sur ses salles)
router.get("/owner", auth, role("owner", "admin"), async (req, res) => {
  try {
    const rooms = await Room.find({ owner: req.user._id });
    const roomIds = rooms.map(r => r._id);
    
    const bookings = await Booking.find({ room: { $in: roomIds } })
      .populate("room", "title")
      .populate("user", "name email");
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE statut reservation
router.put("/:id", auth, role("owner", "admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) return res.status(404).json({ message: "Réservation non trouvée" });
    
    // Verifier si owner possede la salle
    const room = await Room.findById(booking.room);
    if (room.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }
    
    booking.status = status;
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
////finn
//ajoutt page admin
// DELETE /api/bookings/:id - Supprimer une reservation
router.delete("/:id", auth, role("admin"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Réservation non trouvée" });
    
    await booking.deleteOne();
    res.json({ message: "Réservation supprimée" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/bookings/:id  Mettre à jour une reservation
router.put("/:id", auth, async (req, res) => {
  try {
    console.log("📥 Requête UPDATE réservation:", req.params.id, req.body);
    console.log("👤 Utilisateur:", req.user._id, "Rôle:", req.user.role);
    
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }
    
    // Verifier les permissions
    const room = await Room.findById(booking.room);
    
    if (!room) {
      return res.status(404).json({ message: "Salle non trouvée" });
    }
    
    const isAdmin = req.user.role === "admin";
    const isOwner = room.owner.toString() === req.user._id.toString();
    const isClient = booking.user.toString() === req.user._id.toString();
    
    console.log("Permissions:", { isAdmin, isOwner, isClient });
    
    if (!isAdmin && !isOwner && !isClient) {
      return res.status(403).json({ 
        message: "Accès refusé: vous n'avez pas la permission de modifier cette réservation" 
      });
    }
    
    // Validation du statut
    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Statut invalide", 
        validStatuses 
      });
    }
    
    
    if (status) booking.status = status;
    
    await booking.save();
    
    console.log(" Réservation mise à jour:", booking._id, "Statut:", booking.status);
    
    // Populer les donnees pour la reponse
    const updatedBooking = await Booking.findById(booking._id)
      .populate("room", "title")
      .populate("user", "name email");
    
    res.json({
      message: "Réservation mise à jour",
      booking: updatedBooking
    });
    
  } catch (error) {
    console.error("Erreur mise à jour réservation:", error);
    res.status(500).json({ 
      message: "Erreur serveur",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
//--
// DELETE /api/bookings/:id - Supprimer une reservation
router.delete("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }
    
    // Verifier les permissions
    const room = await Room.findById(booking.room);
    const isAdmin = req.user.role === "admin";
    const isOwner = room && room.owner.toString() === req.user._id.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        message: "Accès refusé: vous n'avez pas la permission de supprimer cette réservation" 
      });
    }
    
    await booking.deleteOne();
    
    res.json({ message: "Réservation supprimée" });
    
  } catch (error) {
    console.error("Erreur suppression réservation:", error);
    res.status(500).json({ message: error.message });
  }
});
// GET /api/bookings/owner  Reservations des salles de l'owner
router.get("/owner", auth, async (req, res) => {
  try {
    // Trouver toutes les salles de l'owner
    const rooms = await Room.find({ owner: req.user._id });
    const roomIds = rooms.map(r => r._id);
    
    // Trouver les reservations pour ces salles
    const bookings = await Booking.find({ room: { $in: roomIds } })
      .populate("room", "title capacity price")
      .populate("user", "name email")
      .sort({ startDate: 1 });
    
    res.json(bookings);
    
  } catch (error) {
    console.error("Erreur chargement réservations owner:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
