const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const { uploadRoomImages, deleteImage } = require("../middlewares/upload");
const path = require("path");

const { geocodeAddress } = require('../services/geocoding');



router.get("/my", auth, role("owner", "admin"), async (req, res) => {
  try {
    
    const ownerId = req.user._id || req.user.id;

    const rooms = await Room.find({ owner: ownerId })
      .populate("owner", "name email");

    const roomsWithImages = rooms.map(room => ({
      ...room.toObject(),
      images: room.images.map(img =>
        img ? `${req.protocol}://${req.get("host")}/uploads/rooms/${img}` : null
      ).filter(Boolean),
      mainImage: room.mainImage
        ? `${req.protocol}://${req.get("host")}/uploads/rooms/${room.mainImage}`
        : null
    }));

    res.json(roomsWithImages);
  } catch (error) {
    console.error("Erreur /rooms/my :", error);
    res.status(500).json({ message: error.message });
  }
});



router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().populate("owner", "name email");
    
    const roomsWithImages = rooms.map(room => ({
      ...room.toObject(),
      images: room.images.map(img => 
        img ? `${req.protocol}://${req.get('host')}/uploads/rooms/${img}` : null
      ).filter(Boolean),
      mainImage: room.mainImage ? 
        `${req.protocol}://${req.get('host')}/uploads/rooms/${room.mainImage}` : null,
  coordinates: room.location.coordinates || {}
    }));
    
    res.json(roomsWithImages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("owner", "name email");
    
    if (!room) {
      return res.status(404).json({ message: "Salle non trouvée" });
    }
    
   
    const roomWithImages = {
      ...room.toObject(),
      images: room.images.map(img => 
        img ? `${req.protocol}://${req.get('host')}/uploads/rooms/${img}` : null
      ).filter(Boolean),
      mainImage: room.mainImage ? 
        `${req.protocol}://${req.get('host')}/uploads/rooms/${room.mainImage}` : null,
  coordinates: room.location.coordinates || {}
    };
    
    res.json(roomWithImages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post("/", auth, role("owner", "admin"), uploadRoomImages, async (req, res) => {
  try {
    console.log("Fichiers reçus:", req.files);
    console.log("Body:", req.body);
    
    const { 
      title, 
      description, 
      capacity, 
      price, 
      address, 
      amenities,
      latitude,    
      longitude    
    } = req.body;
    
    
    if (!title || !capacity || !price || !address) {
      return res.status(400).json({ 
        message: "Veuillez remplir tous les champs obligatoires (*)" 
      });
    }
    
    // Extraire les noms de fichiers
    const images = req.files ? req.files.map(file => file.filename) : [];
    let lat, lng;
    
    if (latitude && longitude) {
      // Coordonnees donnees par l'utilisateur
      lat = parseFloat(latitude);
      lng = parseFloat(longitude);
    } else {
      console.warn("Aucune coordonnée GPS fournie, utilisation de valeurs par défaut");
      lat = 36.752887; // Alger
      lng = 3.042048;
    }
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        message: "Coordonnées GPS invalides" 
      });
    }
    
    const roomData = {
      title,
      description,
      capacity: parseInt(capacity),
      price: parseFloat(price),
      location: {
        address: address,
        coordinates: {   
          lat: lat,
          lng: lng
        }
      },
      owner: req.user._id || req.user.id,
      images: images,
      mainImage: images.length > 0 ? images[0] : '',
      amenities: amenities ? JSON.parse(amenities) : []
    };

    
if (!latitude || !longitude) {
  // geocodage automatique
  const geocoded = await geocodeAddress(address);
  if (geocoded) {
    lat = geocoded.lat;
    lng = geocoded.lng;
    address = geocoded.address;
  } else {
    //valeurs par defaut
    lat = 36.752887;
    lng = 3.042048;
  }
}
    
   
    const room = await Room.create(roomData);
    
    const roomWithImages = {
      ...room.toObject(),
      images: images.map(img => 
        `${req.protocol}://${req.get('host')}/uploads/rooms/${img}`
      ),
      mainImage: images.length > 0 ? 
        `${req.protocol}://${req.get('host')}/uploads/rooms/${images[0]}` : null,
     
      coordinates: {
        lat: room.location.coordinates.lat,
        lng: room.location.coordinates.lng
      }
    };
    
    res.status(201).json(roomWithImages);
    
  } catch (error) {
    console.error("Erreur création salle:", error);
    
    
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        deleteImage(file.filename);
      });
    }
    
    res.status(500).json({ 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.put("/:id", auth, role("owner", "admin"), uploadRoomImages, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Salle non trouvée" });

    if (room.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

  
    let newImages = [];
    if (req.files && req.files.length > 0) {
      newImages = req.files.map(file => file.filename);
      
      if (req.body.replaceImages === 'true') {
        room.images.forEach(img => {
          if (img) deleteImage(img);
        });
        room.images = newImages;
      } else {
        room.images = [...room.images, ...newImages];
      }
      
      if (!room.mainImage && newImages.length > 0) {
        room.mainImage = newImages[0];
      }
    }

    
    const { 
      title, 
      description, 
      capacity, 
      price, 
      address, 
      amenities, 
      mainImage,
      latitude,    
      longitude    
    } = req.body;
    
    if (title) room.title = title;
    if (description !== undefined) room.description = description;
    if (capacity) room.capacity = parseInt(capacity);
    if (price) room.price = parseFloat(price);
    
    if (address) room.location.address = address;
    
    
    if (latitude && longitude) {
      if (!room.location.coordinates) {
        room.location.coordinates = {};
      }
      room.location.coordinates.lat = parseFloat(latitude);
      room.location.coordinates.lng = parseFloat(longitude);
    }
    
    if (amenities) room.amenities = JSON.parse(amenities);
    if (mainImage) room.mainImage = mainImage;

    await room.save();
    
    
    const updatedRoom = {
      ...room.toObject(),
      images: room.images.map(img => 
        img ? `${req.protocol}://${req.get('host')}/uploads/rooms/${img}` : null
      ).filter(Boolean),
      mainImage: room.mainImage ? 
        `${req.protocol}://${req.get('host')}/uploads/rooms/${room.mainImage}` : null,
      coordinates: room.location.coordinates || {}
    };
    
    res.json(updatedRoom);
  } catch (error) {
    console.error("Erreur mise à jour:", error);
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, role("owner", "admin"), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Salle non trouvée" });

    if (room.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    
    room.images.forEach(img => {
      if (img) deleteImage(img);
    });

    await room.deleteOne();
    res.json({ message: "Salle et images supprimées" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.delete("/:id/image/:imageName", auth, role("owner", "admin"), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Salle non trouvée" });

    if (room.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const imageName = req.params.imageName;
    
    const deleted = deleteImage(imageName);
    if (!deleted) {
      return res.status(404).json({ message: "Image non trouvée" });
    }

    room.images = room.images.filter(img => img !== imageName);
    
   
    if (room.mainImage === imageName) {
      room.mainImage = room.images.length > 0 ? room.images[0] : '';
    }

    await room.save();
    res.json({ message: "Image supprimée", room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
