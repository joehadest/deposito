const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

// Configuração do servidor Express
const app = express();
app.use(express.json());
app.use(cors());

// Variável para conexão MongoDB
let cachedDb = null;
let cachedClient = null;

// Função para conectar ao MongoDB
async function connectToDatabase() {
    try {
        if (cachedDb) {
            console.log('Usando conexão existente com o MongoDB');
            return cachedDb;
        }

        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('Variável de ambiente MONGODB_URI não definida');
        }

        console.log('Iniciando nova conexão com MongoDB...');

        // Opções de conexão ajustadas para Vercel
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Limite o número de conexões simultâneas
            serverSelectionTimeoutMS: 10000, // Timeout aumentado para 10 segundos
            socketTimeoutMS: 45000, // Soket timeout aumentado
        };

        const client = await MongoClient.connect(MONGODB_URI, options);

        // Determinar o nome do banco de dados da URI
        let dbName;
        try {
            const url = new URL(MONGODB_URI);
            dbName = url.pathname.substring(1);
        } catch (error) {
            const parts = MONGODB_URI.split('/');
            dbName = parts[parts.length - 1].split('?')[0];
        }

        if (!dbName) {
            dbName = 'inventory'; // Nome padrão se não conseguir extrair
        }

        console.log(`Conectando ao banco de dados: ${dbName}`);
        const db = client.db(dbName);

        // Teste simples para verificar a conexão
        await db.command({ ping: 1 });
        console.log('Conexão com MongoDB estabelecida com sucesso');

        // Armazenar em cache
        cachedClient = client;
        cachedDb = db;
        return db;
    } catch (error) {
        console.error('Erro de conexão com MongoDB:', error);
        throw new Error(`Falha na conexão com MongoDB: ${error.message}`);
    }
}

// Handler específico para o formato Vercel
const handler = async (req, res) => {
    // Extrair o caminho da API
    const urlPath = req.url.replace('/api/', '');
    console.log(`Requisição recebida: ${req.method} ${urlPath}`);

    try {
        // Conectar ao banco de dados
        const db = await connectToDatabase();

        // Roteamento API
        if (req.method === 'GET' && urlPath === 'pecas') {
            // Buscar todas as peças
            console.log('Buscando todas as peças...');
            const pecas = await db.collection('pecas').find({}).toArray();
            console.log(`Encontradas ${pecas.length} peças`);
            return res.status(200).json(pecas);
        }
        else if (req.method === 'POST' && urlPath === 'pecas') {
            // Adicionar peça
            const novaPeca = req.body;
            console.log('Adicionando nova peça:', novaPeca.nome);
            const result = await db.collection('pecas').insertOne(novaPeca);
            return res.status(201).json({ _id: result.insertedId, ...novaPeca });
        }
        else if (req.method === 'PUT' && urlPath.startsWith('pecas/')) {
            // Atualizar peça
            const id = urlPath.split('/')[1];
            console.log(`Atualizando peça ID: ${id}`);
            const pecaAtualizada = req.body;
            await db.collection('pecas').updateOne(
                { _id: new ObjectId(id) },
                { $set: pecaAtualizada }
            );
            return res.status(200).json({ _id: id, ...pecaAtualizada });
        }
        else if (req.method === 'DELETE' && urlPath.startsWith('pecas/')) {
            // Remover peça
            const id = urlPath.split('/')[1];
            console.log(`Removendo peça ID: ${id}`);
            await db.collection('pecas').deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ message: 'Peça excluída com sucesso' });
        }
        else if (req.method === 'GET' && urlPath === 'health') {
            // Health check
            return res.status(200).json({ status: 'ok', serverTime: new Date().toISOString() });
        }
        else {
            // Rota não encontrada
            console.log(`Rota não encontrada: ${req.method} ${urlPath}`);
            return res.status(404).json({ error: 'Rota não encontrada' });
        }
    }
    catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Configuração para suportar ambos os modos: Vercel Serverless e Express
if (process.env.NODE_ENV === 'development') {
    // Rota para desenvolvimento local usando Express
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

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', message: 'API funcionando corretamente' });
    });

    // Exporta o Express em modo de desenvolvimento
    module.exports = app;
} else {
    // Exporta o handler para produção no Vercel
    module.exports = handler;
}
