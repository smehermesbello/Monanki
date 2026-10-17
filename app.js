// app.js
import { 
  registerUser, loginUser, logoutUser, listenAuth, 
  createCardInDB, fetchAllUserCardsFromDB, updateCardFSRSInDB 
} from "./firebase.js";
import { createInitialCardState, calculateFSRS } from "./fsrs.js";

let currentUser = null;
let allCards = [];
let dueCards = [];
let currentCardIndex = 0;
let selectedDeckFilter = null;

// DOM
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const userEmailSpan = document.getElementById('user-email');

// Monitorar Login
listenAuth((user) => {
  if (user) {
    currentUser = user;
    userEmailSpan.innerText = user.email;
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    reloadAppData();
  } else {
    currentUser = null;
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
});

// Ações Auth
document.getElementById('btn-login').addEventListener('click', async () => {
  try { 
    await loginUser(document.getElementById('email-input').value, document.getElementById('password-input').value); 
  } catch (e) { alert(e.message); }
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  try { 
    await registerUser(document.getElementById('email-input').value, document.getElementById('password-input').value); 
  } catch (e) { alert(e.message); }
});

document.getElementById('btn-logout').addEventListener('click', () => logoutUser());

// Carregar Dados Principais
async function reloadAppData() {
  allCards = await fetchAllUserCardsFromDB(currentUser.uid);
  const now = new Date().toISOString();
  
  // Cards pendentes
  dueCards = allCards.filter(c => c.fsrs && c.fsrs.nextReview <= now);
  document.getElementById('due-count').innerText = dueCards.length;

  renderDeckTree();
}

// 1. ÁRVORE DE BARALHOS E SUB-BARALHOS (::)
function renderDeckTree() {
  const container = document.getElementById('deck-tree-container');
  container.innerHTML = '';

  const now = new Date().toISOString();
  const deckMap = {};

  // Agrupa cards por baralho e sub-baralho
  allCards.forEach(card => {
    const deckName = card.deck || 'Geral';
    if (!deckMap[deckName]) deckMap[deckName] = { total: 0, due: 0 };
    deckMap[deckName].total++;
    if (card.fsrs && card.fsrs.nextReview <= now) deckMap[deckName].due++;
  });

  // Opção "Todos os Baralhos"
  const allDiv = document.createElement('div');
  allDiv.className = 'deck-tree-item';
  allDiv.innerHTML = `<span class="deck-name-title">📚 Todos os Baralhos</span> <span class="badge-due">${dueCards.length}</span>`;
  allDiv.onclick = () => filterDeckAndStudy(null);
  container.appendChild(allDiv);

  // Renderiza baralhos cadastrados
  Object.keys(deckMap).sort().forEach(deckName => {
    const item = document.createElement('div');
    item.className = 'deck-tree-item';
    
    // Formata sub-baralhos visualmente (ex: Biologia :: Citologia)
    const formattedName = deckName.replace(/::/g, ' ➔ ');
    item.innerHTML = `
      <span class="deck-name-title">${formattedName}</span>
      <span class="badge-due">${deckMap[deckName].due}</span>
    `;
    item.onclick = () => filterDeckAndStudy(deckName);
    container.appendChild(item);
  });
}

function filterDeckAndStudy(deckName) {
  selectedDeckFilter = deckName;
  const now = new Date().toISOString();

  if (deckName === null) {
    dueCards = allCards.filter(c => c.fsrs && c.fsrs.nextReview <= now);
  } else {
    // Inclui o baralho e eventuais sub-baralhos dele (ex: "Biologia" pega "Biologia::Citologia")
    dueCards = allCards.filter(c => 
      c.fsrs && c.fsrs.nextReview <= now && 
      (c.deck === deckName || c.deck.startsWith(deckName + '::'))
    );
  }

  currentCardIndex = 0;
  switchTab('tab-study');
  showCurrentCard();
}

// 2. EXIBIÇÃO E FLUXO DOS CARDS
function showCurrentCard() {
  const qEl = document.getElementById('card-question');
  const optsContainer = document.getElementById('card-options-container');
  const ansContainer = document.getElementById('card-answer-container');
  const ansText = document.getElementById('card-answer-text');

  const btnRevealOpts = document.getElementById('btn-reveal-options');
  const btnRevealGab = document.getElementById('btn-reveal-gabarito');
  const btnShowBasic = document.getElementById('btn-show-basic-answer');
  const fsrsButtons = document.getElementById('fsrs-buttons');

  // Oculta tudo por padrão
  optsContainer.classList.add('hidden');
  ansContainer.classList.add('hidden');
  btnRevealOpts.classList.add('hidden');
  btnRevealGab.classList.add('hidden');
  btnShowBasic.classList.add('hidden');
  fsrsButtons.classList.add('hidden');

  if (dueCards.length === 0 || currentCardIndex >= dueCards.length) {
    qEl.innerText = "Sem revisões pendentes para este baralho!";
    document.getElementById('deck-name').innerText = selectedDeckFilter || "Geral";
    document.getElementById('card-type-tag').innerText = "-";
    return;
  }

  const card = dueCards[currentCardIndex];
  document.getElementById('deck-name').innerText = card.deck;
  qEl.innerText = card.question;

  // FLUXO CONFORME O TIPO DE CARD
  if (card.type === 'cover_options') {
    document.getElementById('card-type-tag').innerText = "Ocultar Alternativas";
    btnRevealOpts.classList.remove('hidden'); // ETAPA 1: Esconde opções até o clique
  } 
  else if (card.type === 'vf') {
    document.getElementById('card-type-tag').innerText = "Verdadeiro / Falso";
    btnShowBasic.classList.remove('hidden');
    ansText.innerHTML = `<strong>Gabarito:</strong> ${card.correctVF === 'V' ? 'Verdadeiro (V)' : 'Falso (F)'}<br><br>${card.explanation}`;
  } 
  else { // basic
    document.getElementById('card-type-tag').innerText = "Básico";
    btnShowBasic.classList.remove('hidden');
    ansText.innerText = card.explanation;
  }
}

// ETAPA 2 (Ocultar Alternativas): Exibe as opções sem dar a resposta
document.getElementById('btn-reveal-options').addEventListener('click', () => {
  const card = dueCards[currentCardIndex];
  const optsContainer = document.getElementById('card-options-container');
  optsContainer.innerHTML = '';

  ['A', 'B', 'C', 'D'].forEach(letter => {
    if (card.options[letter]) {
      const optDiv = document.createElement('div');
      optDiv.className = 'option-item';
      optDiv.id = `opt-item-${letter}`;
      optDiv.innerText = `${letter}) ${card.options[letter]}`;
      optsContainer.appendChild(optDiv);
    }
  });

  optsContainer.classList.remove('hidden');
  document.getElementById('btn-reveal-options').classList.add('hidden');
  document.getElementById('btn-reveal-gabarito').classList.remove('hidden');
});

// ETAPA 3 (Ocultar Alternativas): Revela o gabarito e explicação
document.getElementById('btn-reveal-gabarito').addEventListener('click', () => {
  const card = dueCards[currentCardIndex];
  
  // Destaca a alternativa correta em verde
  const correctItem = document.getElementById(`opt-item-${card.correctOpt}`);
  if (correctItem) correctItem.classList.add('correct');

  const ansContainer = document.getElementById('card-answer-container');
  const ansText = document.getElementById('card-answer-text');
  ansText.innerHTML = `<strong>Gabarito: Alternativa ${card.correctOpt}</strong><br><br>${card.explanation}`;

  ansContainer.classList.remove('hidden');
  document.getElementById('btn-reveal-gabarito').classList.add('hidden');
  document.getElementById('fsrs-buttons').classList.remove('hidden');
});

// Resposta simples (Modos Básico e V/F)
document.getElementById('btn-show-basic-answer').addEventListener('click', () => {
  document.getElementById('card-answer-container').classList.remove('hidden');
  document.getElementById('btn-show-basic-answer').classList.add('hidden');
  document.getElementById('fsrs-buttons').classList.remove('hidden');
});

// Processar Nota FSRS
document.querySelectorAll('.btn-rate').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const rating = parseInt(e.currentTarget.getAttribute('data-rating'));
    const card = dueCards[currentCardIndex];

    const newFsrsState = calculateFSRS(card.fsrs, rating);
    await updateCardFSRSInDB(card.id, newFsrsState);

    currentCardIndex++;
    if (currentCardIndex < dueCards.length) {
      showCurrentCard();
    } else {
      reloadAppData();
      showCurrentCard();
    }
  });
});

// 3. FORMULÁRIO DE CRIAÇÃO DINÂMICO
const cardTypeSelect = document.getElementById('new-card-type');
cardTypeSelect.addEventListener('change', (e) => {
  const type = e.target.value;
  document.getElementById('form-options-group').classList.toggle('hidden', type !== 'cover_options');
  document.getElementById('form-vf-group').classList.toggle('hidden', type !== 'vf');
  
  const lblExp = document.getElementById('lbl-explanation');
  lblExp.innerText = type === 'basic' ? 'Resposta do Card:' : 'Justificativa / Explicação:';
});

document.getElementById('btn-save-card').addEventListener('click', async () => {
  const deck = document.getElementById('new-deck').value || 'Geral';
  const type = cardTypeSelect.value;
  const question = document.getElementById('new-question').value;
  const explanation = document.getElementById('new-explanation').value;

  if (!question || !explanation) return alert("Preencha a pergunta e a explicação/resposta!");

  const cardData = {
    deck,
    type,
    question,
    explanation,
    fsrs: createInitialCardState()
  };

  if (type === 'cover_options') {
    cardData.options = {
      A: document.getElementById('opt-a').value,
      B: document.getElementById('opt-b').value,
      C: document.getElementById('opt-c').value,
      D: document.getElementById('opt-d').value,
    };
    cardData.correctOpt = document.getElementById('correct-opt').value;
  } else if (type === 'vf') {
    cardData.correctVF = document.getElementById('vf-correct').value;
  }

  await createCardInDB(currentUser.uid, cardData);
  alert("Card adicionado!");
  
  document.getElementById('new-question').value = '';
  document.getElementById('new-explanation').value = '';
  reloadAppData();
});

// TROCA DE ABAS
function switchTab(tabId) {
  document.getElementById('tab-decks').classList.toggle('hidden', tabId !== 'tab-decks');
  document.getElementById('tab-study').classList.toggle('hidden', tabId !== 'tab-study');
  document.getElementById('tab-add').classList.toggle('hidden', tabId !== 'tab-add');

  document.getElementById('tab-decks-btn').classList.toggle('active', tabId === 'tab-decks');
  document.getElementById('tab-study-btn').classList.toggle('active', tabId === 'tab-study');
  document.getElementById('tab-add-btn').classList.toggle('active', tabId === 'tab-add');
}

document.getElementById('tab-decks-btn').onclick = () => switchTab('tab-decks');
document.getElementById('tab-study-btn').onclick = () => switchTab('tab-study');
document.getElementById('tab-add-btn').onclick = () => switchTab('tab-add');
