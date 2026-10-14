/**
 * chatbot.js
 * Handles the AI Chatbot interaction, chat history,
 * Rangkum button, verified offline citations, and UI rendering.
 */

const Chatbot = (() => {
  let chatMessagesEl = null;
  let chatInputEl = null;
  let sendBtnEl = null;
  let summaryBtnEl = null;

  const WELCOME_MESSAGE = {
    role: 'ai',
    text: 'Halo! Saya Asisten Belajar Offline. Pilih modul di sidebar kiri, lalu ketik pertanyaanmu atau klik Rangkum.',
    source: null,
    isWelcome: true
  };

  function init(elements) {
    chatMessagesEl = elements.chatMessages;
    chatInputEl = elements.chatInput;
    sendBtnEl = elements.sendBtn;
    summaryBtnEl = elements.summaryBtn;

    bindEvents();
    renderCurrentModuleChat();
  }

  function bindEvents() {
    if (sendBtnEl) {
      sendBtnEl.addEventListener('click', handleSendMessage);
    }
    if (chatInputEl) {
      chatInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      });
    }
    if (summaryBtnEl) {
      summaryBtnEl.addEventListener('click', handleSummaryRequest);
    }
  }

  /**
   * Render chat history for current active module
   */
  function renderCurrentModuleChat() {
    if (!chatMessagesEl) return;
    const activeModule = ModuleLoader.getActiveModule();
    if (!activeModule) return;

    chatMessagesEl.innerHTML = '';

    // Retrieve history from storage
    let history = Storage.getChatHistory(activeModule.id);

    // If empty history, seed with default conversation matching Screenshot 1 for Modul_02_Biologi
    if (history.length === 0) {
      if (activeModule.id === 'Modul_02_Biologi') {
        history = [
          WELCOME_MESSAGE,
          {
            role: 'user',
            text: 'Jelaskan fungsi asam klorida (HCl) dan pepsin dalam sistem pencernaan!',
            timestamp: Date.now() - 60000
          },
          {
            role: 'ai',
            text: 'Asam klorida (HCl) diproduksi sel parietal lambung. Fungsinya: (1) mengaktifkan pepsinogen menjadi pepsin, (2) membunuh bakteri patogen, (3) menciptakan pH asam untuk kerja enzim. Pepsin sendiri berfungsi memecah protein menjadi polipeptida melalui hidrolisis ikatan peptida.',
            source: 'Modul_02_Biologi... - Bab 3, Hal. 14',
            timestamp: Date.now() - 30000
          }
        ];
        // Save initial history to storage so user can continue conversation seamlessly
        history.forEach(m => Storage.saveChatMessage(activeModule.id, m));
      } else {
        history = [WELCOME_MESSAGE];
      }
    }

    history.forEach(msg => {
      appendMessageElement(msg, false);
    });

    scrollToBottom();
  }

  /**
   * Handle user submitting a question
   */
  function handleSendMessage() {
    if (!chatInputEl) return;
    const text = chatInputEl.value.trim();
    if (!text) return;

    const activeModule = ModuleLoader.getActiveModule();
    if (!activeModule) {
      alert('Silakan pilih modul pembelajaran terlebih dahulu di sidebar.');
      return;
    }

    // 1. Append user message
    const userMsg = {
      role: 'user',
      text: text,
      timestamp: Date.now()
    };
    appendMessageElement(userMsg, true);
    Storage.saveChatMessage(activeModule.id, userMsg);

    chatInputEl.value = '';
    scrollToBottom();

    // 2. Perform offline search in active module
    try {
      const searchResult = SearchEngine.searchModule(activeModule, text);

      // 3. Append AI response
      const aiMsg = {
        role: 'ai',
        text: searchResult.text,
        source: searchResult.source,
        timestamp: Date.now()
      };

      // Small natural offline delay for realistic UX
      setTimeout(() => {
        appendMessageElement(aiMsg, true);
        Storage.saveChatMessage(activeModule.id, aiMsg);
        scrollToBottom();
      }, 250);
    } catch (err) {
      console.error('Chat error:', err);
      setTimeout(() => {
        const errAiMsg = {
          role: 'ai',
          text: `Maaf, informasi mengenai "${text}" belum dapat diproses dari materi ${activeModule.displayName}.`,
          source: null,
          timestamp: Date.now()
        };
        appendMessageElement(errAiMsg, true);
        Storage.saveChatMessage(activeModule.id, errAiMsg);
        scrollToBottom();
      }, 250);
    }
  }

  /**
   * Handle "Rangkum" button click
   */
  function handleSummaryRequest() {
    const activeModule = ModuleLoader.getActiveModule();
    if (!activeModule) return;

    // Trigger summary query
    const userMsg = {
      role: 'user',
      text: 'Rangkumkan materi modul ini.',
      timestamp: Date.now()
    };
    appendMessageElement(userMsg, true);
    Storage.saveChatMessage(activeModule.id, userMsg);
    scrollToBottom();

    const searchResult = SearchEngine.searchModule(activeModule, 'rangkum');

    const aiMsg = {
      role: 'ai',
      text: searchResult.text,
      source: searchResult.source || `${activeModule.displayName} - Rangkuman Inti`,
      timestamp: Date.now()
    };

    setTimeout(() => {
      appendMessageElement(aiMsg, true);
      Storage.saveChatMessage(activeModule.id, aiMsg);
      scrollToBottom();
    }, 200);
  }

  /**
   * DOM helper to render a single chat message
   */
  function appendMessageElement(msg, shouldAnimate = false) {
    if (!chatMessagesEl) return;

    const isUser = msg.role === 'user';
    const rowEl = document.createElement('div');
    rowEl.className = `chat-row ${isUser ? 'chat-row-user' : 'chat-row-ai'}`;
    if (shouldAnimate) {
      rowEl.classList.add('chat-animate');
    }

    if (isUser) {
      // User bubble on the left, Avatar "S" on the right
      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'chat-bubble chat-bubble-user';
      bubbleEl.textContent = msg.text;

      const avatarEl = document.createElement('div');
      avatarEl.className = 'chat-avatar chat-avatar-user';
      avatarEl.textContent = 'S';
      avatarEl.title = 'Siswa';

      rowEl.appendChild(bubbleEl);
      rowEl.appendChild(avatarEl);
    } else {
      // AI avatar on the left, Bubble on the right
      const avatarEl = document.createElement('div');
      avatarEl.className = 'chat-avatar chat-avatar-ai';
      avatarEl.textContent = 'AI';
      avatarEl.title = 'Asisten AI Offline';

      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'chat-bubble chat-bubble-ai';

      const textEl = document.createElement('div');
      textEl.className = 'chat-text';
      textEl.textContent = msg.text;
      bubbleEl.appendChild(textEl);

      // Render source citation if available
      if (msg.source) {
        const sourceEl = document.createElement('div');
        sourceEl.className = 'chat-source';
        sourceEl.textContent = `Sumber: ${msg.source}`;
        bubbleEl.appendChild(sourceEl);
      }

      rowEl.appendChild(avatarEl);
      rowEl.appendChild(bubbleEl);
    }

    chatMessagesEl.appendChild(rowEl);
  }

  function scrollToBottom() {
    if (chatMessagesEl) {
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
  }

  function updateForNewModule() {
    renderCurrentModuleChat();
  }

  return {
    init,
    updateForNewModule,
    handleSendMessage,
    handleSummaryRequest
  };
})();

if (typeof window !== 'undefined') {
  window.Chatbot = Chatbot;
}
if (typeof module !== 'undefined') {
  module.exports = Chatbot;
}
