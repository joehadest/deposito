// Elementos DOM
const pecaForm = document.getElementById('pecaForm');
const pecasList = document.getElementById('pecasList');
const emptyMessage = document.getElementById('emptyMessage');
const toggleFormBtn = document.getElementById('toggleForm');
const formContainer = document.getElementById('formContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close');
const cancelEdit = document.getElementById('cancelEdit');

// Estado da aplicação
let pecas = [];
let pecaEditando = null;

// Funções Auxiliares
function formatMoeda(valor) {
    if (!valor) return '-';
    return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
}

function mostrarMensagemVazia() {
    if (pecas.length === 0) {
        emptyMessage.style.display = 'flex';
    } else {
        emptyMessage.style.display = 'none';
    }
}

// Manipulação da Interface
function toggleForm() {
    formContainer.classList.toggle('show');
    if (formContainer.classList.contains('show')) {
        toggleFormBtn.innerHTML = '<i class="fas fa-minus"></i> Ocultar Formulário';
    } else {
        toggleFormBtn.innerHTML = '<i class="fas fa-plus"></i> Nova Peça';
    }
}

function abrirModalEdicao(peca) {
    pecaEditando = peca;
    document.getElementById('editId').value = peca._id;
    document.getElementById('editNome').value = peca.nome;
    document.getElementById('editDescricao').value = peca.descricao || '';
    document.getElementById('editQuantidade').value = peca.quantidade;
    document.getElementById('editPreco').value = peca.preco || '';
    document.getElementById('editLocalizacao').value = peca.localizacao || '';
    editModal.style.display = 'block';
}

function fecharModalEdicao() {
    editModal.style.display = 'none';
    pecaEditando = null;
}

// Renderização
function renderizarPecas(listaPecas) {
    pecasList.innerHTML = '';

    if (listaPecas.length === 0) {
        emptyMessage.style.display = 'flex';
        return;
    }

    emptyMessage.style.display = 'none';

    listaPecas.forEach(peca => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${peca.nome}</td>
      <td>${peca.descricao || '-'}</td>
      <td>${peca.quantidade}</td>
      <td>${formatMoeda(peca.preco)}</td>
      <td>${peca.localizacao || '-'}</td>
      <td class="action-buttons">
        <button class="btn btn-primary btn-small edit-btn" data-id="${peca._id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-danger btn-small delete-btn" data-id="${peca._id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

        pecasList.appendChild(tr);

        // Adicionar event listeners aos botões
        tr.querySelector('.edit-btn').addEventListener('click', () => abrirModalEdicao(peca));
        tr.querySelector('.delete-btn').addEventListener('click', () => confirmarExclusao(peca));
    });
}

function confirmarExclusao(peca) {
    if (confirm(`Deseja realmente excluir "${peca.nome}"?`)) {
        deletarPeca(peca._id);
    }
}

// Operações com API
async function buscarPecas() {
    try {
        const response = await fetch('/api/pecas');
        pecas = await response.json();
        renderizarPecas(pecas);
    } catch (error) {
        console.error('Erro ao buscar peças:', error);
        alert('Erro ao carregar as peças. Verifique o console para mais detalhes.');
    }
}

async function adicionarPeca(novaPeca) {
    try {
        const response = await fetch('/api/pecas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novaPeca)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensagem || 'Erro ao adicionar peça');
        }

        const pecaAdicionada = await response.json();
        pecas.unshift(pecaAdicionada); // Adiciona no início da lista
        renderizarPecas(pecas);
        pecaForm.reset();

        // Se o formulário estava visível, mantém visível
        if (!formContainer.classList.contains('show')) {
            toggleForm();
        }

        alert('Peça adicionada com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar peça:', error);
        alert(`Erro ao adicionar peça: ${error.message}`);
    }
}

async function atualizarPeca(id, dadosAtualizados) {
    try {
        const response = await fetch(`/api/pecas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensagem || 'Erro ao atualizar peça');
        }

        const pecaAtualizada = await response.json();

        // Atualiza a lista local
        const index = pecas.findIndex(p => p._id === id);
        if (index !== -1) {
            pecas[index] = pecaAtualizada;
        }

        renderizarPecas(pecas);
        fecharModalEdicao();

        alert('Peça atualizada com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar peça:', error);
        alert(`Erro ao atualizar peça: ${error.message}`);
    }
}

async function deletarPeca(id) {
    try {
        const response = await fetch(`/api/pecas/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensagem || 'Erro ao excluir peça');
        }

        // Remove da lista local
        pecas = pecas.filter(p => p._id !== id);
        renderizarPecas(pecas);

        alert('Peça removida com sucesso!');
    } catch (error) {
        console.error('Erro ao remover peça:', error);
        alert(`Erro ao remover peça: ${error.message}`);
    }
}

function filtrarPecas() {
    const termo = searchInput.value.trim().toLowerCase();

    if (!termo) {
        renderizarPecas(pecas);
        return;
    }

    const pecasFiltradas = pecas.filter(peca =>
        peca.nome.toLowerCase().includes(termo) ||
        (peca.descricao && peca.descricao.toLowerCase().includes(termo)) ||
        (peca.localizacao && peca.localizacao.toLowerCase().includes(termo))
    );

    renderizarPecas(pecasFiltradas);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    buscarPecas();

    toggleFormBtn.addEventListener('click', toggleForm);

    pecaForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const novaPeca = {
            nome: document.getElementById('nome').value,
            descricao: document.getElementById('descricao').value,
            quantidade: parseInt(document.getElementById('quantidade').value),
            preco: parseFloat(document.getElementById('preco').value) || undefined,
            localizacao: document.getElementById('localizacao').value
        };

        adicionarPeca(novaPeca);
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('editId').value;
        const dadosAtualizados = {
            nome: document.getElementById('editNome').value,
            descricao: document.getElementById('editDescricao').value,
            quantidade: parseInt(document.getElementById('editQuantidade').value),
            preco: parseFloat(document.getElementById('editPreco').value) || undefined,
            localizacao: document.getElementById('editLocalizacao').value
        };

        atualizarPeca(id, dadosAtualizados);
    });

    searchBtn.addEventListener('click', filtrarPecas);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            filtrarPecas();
        }
    });

    closeModal.addEventListener('click', fecharModalEdicao);
    cancelEdit.addEventListener('click', fecharModalEdicao);

    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            fecharModalEdicao();
        }
    });
});
