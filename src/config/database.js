const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize:              10,     // Atlas M0 suporta até 500; 10 dá folga para
                                         // as consultas em paralelo das telas de
                                         // estatística sem gerar fila por conexão
      serverSelectionTimeoutMS: 5000,  // desiste de conectar em 5s
      socketTimeoutMS:          45000, // fecha socket ocioso após 45s
    });
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);

    mongoose.connection.on("disconnected", () =>
      console.warn("⚠️  MongoDB desconectado")
    );
    mongoose.connection.on("reconnected", () =>
      console.log("✅ MongoDB reconectado")
    );
    mongoose.connection.on("error", (err) =>
      console.error("❌ Erro MongoDB:", err.message)
    );
  } catch (error) {
    console.error("❌ Falha ao conectar MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
