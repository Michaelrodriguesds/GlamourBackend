const Note = require("../models/Note");

// ────────────────────────────────────────────────────────────────
// LISTAR anotações
// GET /api/notes
// Query: ?pinned=true | ?tag=geral | ?search=texto | ?limit=50
// ────────────────────────────────────────────────────────────────
exports.getNotes = async (req, res) => {
  try {
    const { pinned, tag, search, limit = 100 } = req.query;
    const filters = {};

    if (pinned !== undefined) filters.pinned = pinned === "true";
    if (tag)    filters.tag = tag;   // ← string simples (alinhado com Flutter)
    if (search) {
      filters.$or = [
        { title:   { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const notes = await Note.find(filters)
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(parseInt(limit));

    res.json({ count: notes.length, data: notes });
  } catch (error) {
    console.error("getNotes:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// BUSCAR por ID
// GET /api/notes/:id
// ────────────────────────────────────────────────────────────────
exports.getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Anotação não encontrada" });
    res.json(note);
  } catch (error) {
    console.error("getNoteById:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// CRIAR anotação
// POST /api/notes
// Body: { title?, content, color?, pinned?, tag? }
// ────────────────────────────────────────────────────────────────
exports.createNote = async (req, res) => {
  try {
    const note = await Note.create(req.body);
    res.status(201).json(note);
  } catch (error) {
    console.error("createNote:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: "Dados inválidos", messages });
    }
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// ATUALIZAR anotação
// PUT /api/notes/:id
// ────────────────────────────────────────────────────────────────
exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    );
    if (!note) return res.status(404).json({ error: "Anotação não encontrada" });
    res.json(note);
  } catch (error) {
    console.error("updateNote:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: "Dados inválidos", messages });
    }
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// DELETAR anotação
// DELETE /api/notes/:id
// ────────────────────────────────────────────────────────────────
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: "Anotação não encontrada" });
    res.json({ message: "Anotação removida com sucesso" });
  } catch (error) {
    console.error("deleteNote:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// FIXAR / DESAFIXAR (toggle pin)
// PATCH /api/notes/:id/pin
// ────────────────────────────────────────────────────────────────
exports.togglePin = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Anotação não encontrada" });

    note.pinned = !note.pinned;
    await note.save();

    res.json({ message: `Anotação ${note.pinned ? "fixada" : "desafixada"}`, data: note });
  } catch (error) {
    console.error("togglePin:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// LISTAR TODAS AS TAGS usadas
// GET /api/notes/tags
// ────────────────────────────────────────────────────────────────
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Note.distinct("tag"); // ← campo "tag" string
    res.json({ tags: tags.filter(Boolean).sort() });
  } catch (error) {
    console.error("getAllTags:", error);
    res.status(500).json({ error: error.message });
  }
};