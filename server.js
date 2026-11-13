require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

// ---------- Models ----------
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});
const User = mongoose.model("User", userSchema);

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: "" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});
const Note = mongoose.model("Note", noteSchema);

// ---------- Helpers ----------
function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// admins can reach any note, normal users only their own
function noteFilter(req, id) {
  return req.user.role === "admin"
    ? { _id: id }
    : { _id: id, user: req.user.id };
}

// ---------- Auth routes ----------
app.get("/", (req, res) => res.send("My notes API is working!"));

app.post("/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({
        error: "Email and a password of at least 6 characters are required",
      });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });
    res
      .status(201)
      .json({ token: makeToken(user), email: user.email, role: user.role });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email already registered" });
    }
    res.status(400).json({ error: err.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ error: "Wrong email or password" });
    }
    res.json({ token: makeToken(user), email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- Notes routes (login required) ----------
app.get("/notes", auth, async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { user: req.user.id };
  res.json(await Note.find(filter));
});

app.get("/notes/:id", auth, async (req, res) => {
  try {
    const note = await Note.findOne(noteFilter(req, req.params.id));
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  } catch {
    res.status(400).json({ error: "Invalid id" });
  }
});

app.post("/notes", auth, async (req, res) => {
  try {
    const note = await Note.create({
      title: req.body.title,
      content: req.body.content,
      user: req.user.id,
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/notes/:id", auth, async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      noteFilter(req, req.params.id),
      { title: req.body.title, content: req.body.content },
      { new: true, runValidators: true, omitUndefined: true },
    );
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  } catch {
    res.status(400).json({ error: "Invalid request" });
  }
});

app.delete("/notes/:id", auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete(noteFilter(req, req.params.id));
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch {
    res.status(400).json({ error: "Invalid id" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
