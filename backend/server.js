const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const app = express();

app.use(cors());
app.use(express.json());

// Item model
const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);

// Check submitted data
function validateItem(req, res, next) {
  const { name, quantity, category } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      message: "Item name is required",
    });
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({
      message: "Quantity must be a whole number of 0 or more",
    });
  }
  if(typeof category !== "string" || !category.trim){
    return res.status(400).json({
      massage: "Category is required"
    });
  }
  next();
}

// Check MongoDB ID
function validateId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      message: "Invalid item ID",
    });
  }

  next();
}

// API health check
app.get("/", (req, res) => {
  res.json({ message: "Item Manager API is running" });
});

// View all items
app.get("/api/items", async (req, res, next) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// Add an item
app.post("/api/items", validateItem, async (req, res, next) => {
  try {
    const item = await Item.create({
      name: req.body.name.trim(),
      quantity: req.body.quantity,
      category: req.body.category.trim(),
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// Edit an item
app.put(
  "/api/items/:id",
  validateId,
  validateItem,
  async (req, res, next) => {
    try {
      const item = await Item.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name.trim(),
          quantity: req.body.quantity,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!item) {
        return res.status(404).json({
          message: "Item not found",
        });
      }

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Delete an item
app.delete("/api/items/:id", validateId, async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Error handling
app.use((error, req, res, next) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  console.error("Request failed:", error.message);
  res.status(500).json({ message: "Server error" });
});

// Connect database, then start server
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();