const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

// Configuração do servidor Express
const app = express();
app.use(express.json());
app.use(cors());

// Variável para conexão MongoDB
let cachedDb = null;

// Função para conectar ao MongoDB
async function connectToDatabase() {
    try {
        if (cachedDb) {
            return cachedDb;
        }

        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('Variável de ambiente MONGODB_URI não definida');
        }

        console.log('Tentando conectar ao MongoDB...');
        const client = await MongoClient.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // Timeout após 5 segundos
        });

        // Extrair o nome do banco de dados da URI
        let dbName;
        try {
            dbName = new URL(MONGODB_URI).pathname.substr(1);
        } catch (error) {
            // Se a URI não for uma URL válida, tenta extrair por outras formas
            const parts = MONGODB_URI.split('/');
            dbName = parts[parts.length - 1];
        }

        if (!dbName) {
            dbName = 'inventory'; // Nome padrão se não conseguir extrair
        }

        const db = client.db(dbName);

        // Testar a conexão com o banco de dados
        await db.command({ ping: 1 });
        console.log('Conectado com sucesso ao MongoDB');

        cachedDb = db;
        return db;
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        throw new Error(`Falha na conexão com MongoDB: ${error.message}`);
    }
}

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro na aplicação:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

// Rota para listar todas as peças
app.get('/api/pecas', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const pecas = await db.collection('pecas').find({}).toArray();
        res.json(pecas);
    } catch (error) {
        console.error('Erro ao buscar peças:', error);
        res.status(500).json({ error: 'Falha ao buscar peças', message: error.message });
    }
});

// Rota para adicionar uma peça
app.post('/api/pecas', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const novaPeca = req.body;
        const result = await db.collection('pecas').insertOne(novaPeca);
        res.status(201).json({ _id: result.insertedId, ...novaPeca });
    } catch (error) {
        console.error('Erro ao adicionar peça:', error);
        res.status(500).json({ error: 'Falha ao adicionar peça', message: error.message });
    }
});

// Rota para atualizar uma peça
app.put('/api/pecas/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { id } = req.params;
        const pecaAtualizada = req.body;

        await db.collection('pecas').updateOne(
            { _id: new ObjectId(id) },
            { $set: pecaAtualizada }
        );

        res.json({ _id: id, ...pecaAtualizada });
    } catch (error) {
        console.error('Erro ao atualizar peça:', error);
        res.status(500).json({ error: 'Falha ao atualizar peça', message: error.message });
    }
});

// Rota para excluir uma peça
app.delete('/api/pecas/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { id } = req.params;

        await db.collection('pecas').deleteOne({ _id: new ObjectId(id) });

        res.json({ message: 'Peça excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir peça:', error);
        res.status(500).json({ error: 'Falha ao excluir peça', message: error.message });
    }
});

// Rota de healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API funcionando corretamente' });
});

// Handler para serverless
module.exports = app;
