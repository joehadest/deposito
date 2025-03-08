const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexão com o MongoDB
mongoose.connect('mongodb+srv://joelmelo171:joe12823134719@sistemadeestoque.yprfm.mongodb.net/?retryWrites=true&w=majority&appName=sistemadeestoque', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Modelo de Peça
const Peca = mongoose.model('Peca', {
    nome: { type: String, required: true },
    descricao: String,
    quantidade: { type: Number, required: true, default: 0 },
    preco: Number,
    localizacao: String,
    dataCadastro: { type: Date, default: Date.now }
});

// Rotas da API
// Obter todas as peças
app.get('/api/pecas', async (req, res) => {
    try {
        const pecas = await Peca.find().sort({ dataCadastro: -1 });
        res.json(pecas);
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao buscar peças', erro: error.message });
    }
});

// Obter uma peça específica
app.get('/api/pecas/:id', async (req, res) => {
    try {
        const peca = await Peca.findById(req.params.id);
        if (!peca) return res.status(404).json({ mensagem: 'Peça não encontrada' });
        res.json(peca);
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao buscar peça', erro: error.message });
    }
});

// Adicionar peça
app.post('/api/pecas', async (req, res) => {
    try {
        const novaPeca = new Peca(req.body);
        const pecaSalva = await novaPeca.save();
        res.status(201).json(pecaSalva);
    } catch (error) {
        res.status(400).json({ mensagem: 'Erro ao adicionar peça', erro: error.message });
    }
});

// Atualizar peça
app.put('/api/pecas/:id', async (req, res) => {
    try {
        const pecaAtualizada = await Peca.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!pecaAtualizada) return res.status(404).json({ mensagem: 'Peça não encontrada' });
        res.json(pecaAtualizada);
    } catch (error) {
        res.status(400).json({ mensagem: 'Erro ao atualizar peça', erro: error.message });
    }
});

// Deletar peça
app.delete('/api/pecas/:id', async (req, res) => {
    try {
        const pecaRemovida = await Peca.findByIdAndDelete(req.params.id);
        if (!pecaRemovida) return res.status(404).json({ mensagem: 'Peça não encontrada' });
        res.json({ mensagem: 'Peça removida com sucesso' });
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao remover peça', erro: error.message });
    }
});

// Rota para a página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
