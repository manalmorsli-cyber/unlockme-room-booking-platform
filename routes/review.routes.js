const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");

// Client cree un avis

router.post("/", auth, role("client"), async (req, res) => {
  try {
    const { room, booking, rating, comment } = req.body;
    
    // Validation
    if (!room || !booking || !rating || !comment) {
      return res.status(400).json({ 
        message: "Tous les champs sont requis" 
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: "La note doit être entre 1 et 5" 
      });
    }
    
    // Verifier que la reservation existe et appartient à l'utilisateur
    const existingBooking = await Booking.findOne({
      _id: booking,
      user: req.user._id,
      room: room
    });
    
    if (!existingBooking) {
      return res.status(404).json({ 
        message: "Réservation non trouvée ou non autorisée" 
      });
    }
    
  
    const existingReview = await Review.findOne({ booking });
    
    if (existingReview) {
      return res.status(400).json({ 
        message: "Vous avez déjà laissé un avis pour cette réservation" 
      });
    }
    
    
    if (new Date(existingBooking.endDate) > new Date()) {
      return res.status(400).json({ 
        message: "Vous ne pouvez laisser un avis qu'après la fin de la réservation" 
      });
    }
    
    
    const review = await Review.create({
      room,
      user: req.user._id,
      booking,
      rating,
      comment,
      status: "pending" 
    });
    
    res.status(201).json({
      message: "Avis soumis avec succès (en attente de modération)",
      review
    });
    
  } catch (error) {
    console.error("Erreur création avis:", error);
    res.status(500).json({ message: error.message });
  }
});


router.get("/room/:roomId", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find({ 
      room: req.params.roomId,
      status: "approved"
    })
    .populate("user", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
    const total = await Review.countDocuments({ 
      room: req.params.roomId,
      status: "approved" 
    });
    
    res.json({
      reviews,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalReviews: total
    });
    
  } catch (error) {
    console.error("Erreur chargement avis:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate("room", "title")
      .populate("booking", "startDate endDate")
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    console.error("Erreur chargement mes avis:", error);
    res.status(500).json({ message: error.message });
  }
});


router.get("/owner", auth, role("owner", "admin"), async (req, res) => {
  try {
    // Trouver les salles de l'owner
    const rooms = await Room.find({ owner: req.user._id });
    const roomIds = rooms.map(r => r._id);
    
    const reviews = await Review.find({ room: { $in: roomIds } })
      .populate("room", "title")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    console.error("Erreur chargement avis owner:", error);
    res.status(500).json({ message: error.message });
  }
});


router.put("/:id/reply", auth, role("owner", "admin"), async (req, res) => {
  try {
    const { reply } = req.body;
    
    if (!reply) {
      return res.status(400).json({ message: "La réponse est requise" });
    }
    
    // Trouver l'avis
    const review = await Review.findById(req.params.id)
      .populate("room");
    
    if (!review) {
      return res.status(404).json({ message: "Avis non trouvé" });
    }
    
    
    if (review.room.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ 
        message: "Vous n'êtes pas propriétaire de cette salle" 
      });
    }
    
    
    review.ownerReply = reply;
    review.updatedAt = new Date();
    await review.save();
    
    res.json({
      message: "Réponse ajoutée avec succès",
      review
    });
    
  } catch (error) {
    console.error("Erreur ajout réponse:", error);
    res.status(500).json({ message: error.message });
  }
});


router.get("/admin", auth, role("admin"), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (status) filter.status = status;
    
    const reviews = await Review.find(filter)
      .populate("room", "title")
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Review.countDocuments(filter);
    
    res.json({
      reviews,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalReviews: total
    });
    
  } catch (error) {
    console.error("Erreur chargement avis admin:", error);
    res.status(500).json({ message: error.message });
  }
});


router.put("/:id/status", auth, role("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ 
        message: "Statut invalide" 
      });
    }
    
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    ).populate("room", "title")
     .populate("user", "name email");
    
    if (!review) {
      return res.status(404).json({ message: "Avis non trouvé" });
    }
    
    res.json({
      message: `Avis ${status === "approved" ? "approuvé" : "rejeté"}`,
      review
    });
    
  } catch (error) {
    console.error("Erreur modération avis:", error);
    res.status(500).json({ message: error.message });
  }
});


router.delete("/:id", auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("room");
    
    if (!review) {
      return res.status(404).json({ message: "Avis non trouvé" });
    }
    
    // Permissions admin ou owner de la salle
    const isAdmin = req.user.role === "admin";
    const isOwner = review.room && review.room.owner.toString() === req.user._id.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        message: "Non autorisé" 
      });
    }
    
    await review.deleteOne();
    
    res.json({ message: "Avis supprimé" });
    
  } catch (error) {
    console.error("Erreur suppression avis:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;