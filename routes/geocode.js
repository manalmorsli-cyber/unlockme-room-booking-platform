const express = require('express');
const router = express.Router();
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");


router.get('/', async (req, res) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Adresse manquante' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      address
    )}&format=json&limit=1&countrycodes=DZ&accept-language=fr`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RoomBookingApp/1.0',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur géocodage' });
  }
});

module.exports = router;
