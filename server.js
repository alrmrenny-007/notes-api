require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: "" },
});
const Note = mongoose.model("Note", noteSchema);

app.get("/", (req, res) => res.send("My notes API is working!"));

app.get("/notes", async (req, res) => {
  res.json(await Note.find());
});

app.get("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  } catch {
    res.status(400).json({ error: "Invalid id" });
  }
});

app.post("/notes", async (req, res) => {
  try {
    const note = await Note.create(req.body);
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  } catch {
    res.status(400).json({ error: "Invalid request" });
  }
});

app.delete("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch {
    res.status(400).json({ error: "Invalid id" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
