const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Ensure JSON bodies are parsed

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Could not connect to MongoDB", err));



// Product Schema
const productSchema = new mongoose.Schema({
  Ref: String,
  Designation: String,
  Price: String,
  Stock: String,
  Image: String,
  Brand: String,
  Company: String,
  Link: String,
});
const Product = mongoose.model("Product", productSchema);



// Products API
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/products-by-reference/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    const products = await Product.find({ Ref: reference });
    if (products.length === 0) {
      res.status(404).json({ message: "Aucun produit trouvé pour la référence spécifiée." });
    } else {
      res.json(products);
    }
  } catch (error) {
    console.error("Error fetching products by reference:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});





  const userSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String, required: true },
    Tel: { type: String, required: true },
    Societe: { type: String, required: true },
    Site_web: { type: String, required: true },
    motDePasse: { type: String, required: true },
  });

// Registration and Login API
userSchema.pre('save', async function(next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 10);
  next();
});

const User = mongoose.model('User', userSchema);

app.post("/api/register", async (req, res) => {
  try {
    const { nom, prenom, email, Site_web, motDePasse, Tel, Societe } = req.body;
    if (!nom || !prenom || !email || !Site_web || !motDePasse || !Tel || !Societe) {
      return res.status(400).send("Veuillez remplir tous les champs.");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send("Email déjà utilisé.");
    }

    // Vous ne devez vérifier le mot de passe que s'il y a un utilisateur existant
    if (existingUser && motDePasse !== existingUser.motDePasse) {
      return res.status(400).send("Les mots de passe ne correspondent pas.");
    }

    // Validation d'email simple, peut être améliorée avec une regex ou un package de validation d'email
    if (!email.includes('@')) {
      return res.status(400).send("Adresse email invalide.");
    }

    // Validation de la longueur du numéro de téléphone
    if (Tel.length !== 8) {
      return res.status(400).send("Numéro de téléphone invalide.");
    }

    const user = new User({ nom, prenom, email, Site_web, motDePasse, Tel, Societe });
    await user.save();

    res.status(200).send("Veuillez vérifier votre email pour confirmer la création de compte.");
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).send("Erreur lors de l'inscription : " + error.message);
  }
});



app.post("/api/login", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send("Either the email has not been verified or it does not exist.");
    }

    const isMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isMatch) {
      return res.status(401).send("Invalid login credentials.");
    }

    res.send("Logged in successfully.");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Error logging in: " + error.message);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
