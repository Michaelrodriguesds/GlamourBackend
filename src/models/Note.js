const mongoose = require("mongoose");

// ── Constantes ───────────────────────────────────────────────────
// Espelha exatamente as tags do Flutter (AppStrings.noteTags)
const NOTE_TAGS = ["lembrete", "financeiro", "estoque", "geral"];

const NOTE_COLORS = [
  "#B47FD4", // Lavanda (padrão)
  "#E8527A", // Rose
  "#4ECBA0", // Green
  "#F0C060", // Gold
  "#98CFFF", // Blue
  "#FF9898", // Salmon
  "#8A7A9A", // Muted
];

// ── Schema ───────────────────────────────────────────────────────
const noteSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      trim:      true,
      maxlength: [100, "Título muito longo (máx. 100 caracteres)"],
      default:   "",
    },
    content: {
      type:      String,
      required:  [true, "Conteúdo da anotação é obrigatório"],
      trim:      true,
      maxlength: [2000, "Anotação muito longa (máx. 2000 caracteres)"],
    },
    // ← campo string simples, alinhado com Flutter GeneralNote.tag
    // lembrete | financeiro | estoque | geral
    tag: {
      type:    String,
      default: "geral",
    },
    color: {
      type:    String,
      default: "#B47FD4",
    },
    pinned: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Índices ───────────────────────────────────────────────────────
noteSchema.index({ createdAt: -1 });
noteSchema.index({ pinned: -1, createdAt: -1 });
noteSchema.index({ tag: 1 });

// ── Exporta ───────────────────────────────────────────────────────
const NoteModel       = mongoose.model("Note", noteSchema);
NoteModel.NOTE_TAGS   = NOTE_TAGS;
NoteModel.NOTE_COLORS = NOTE_COLORS;

module.exports = NoteModel;