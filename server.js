const express = require("express");

const app = express();

app.use(express.json());

let notes = [{ id: 1, title: "First note", content: "Hello world" }];

let nextId = 2;

// Home

app.get("/", (req, res) => {
  res.send("My notes API is working!");
});

// READ all notes

app.get("/notes", (req, res) => {
  res.json(notes);
});

// READ one note

app.get("/notes/:id", (req, res) => {
  const note = notes.find((n) => n.id === Number(req.params.id));

  if (!note) return res.status(404).json({ error: "Note not found" });

  res.json(note);
});

// CREATE a note

app.post("/notes", (req, res) => {
  const { title, content } = req.body;

  if (!title) return res.status(400).json({ error: "Title is required" });

  const note = { id: nextId++, title, content: content || "" };

  notes.push(note);

  res.status(201).json(note);
});

// UPDATE a note

app.put("/notes/:id", (req, res) => {
  const note = notes.find((n) => n.id === Number(req.params.id));

  if (!note) return res.status(404).json({ error: "Note not found" });

  note.title = req.body.title || note.title;

  note.content = req.body.content || note.content;

  res.json(note);
});

// DELETE a note

app.delete("/notes/:id", (req, res) => {
  const index = notes.findIndex((n) => n.id === Number(req.params.id));

  if (index === -1) return res.status(404).json({ error: "Note not found" });

  notes.splice(index, 1);

  res.json({ message: "Note deleted" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
