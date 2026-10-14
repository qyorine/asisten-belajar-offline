/**
 * app.js
 * Main application coordinator:
 * - Initializes sidebar module list
 * - Manages active tab state (AI Chatbot vs Generator Kuis)
 * - Connects ModuleLoader, Chatbot, and Quiz
 * - Supports File System Access API & HTML file upload
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const sidebarListEl = document.getElementById('sidebar-modules-list');
  const moduleCountEl = document.getElementById('sidebar-module-count');
  const tabChatbotBtn = document.getElementById('tab-btn-chatbot');
  const tabQuizBtn = document.getElementById('tab-btn-quiz');
  const panelChatbot = document.getElementById('panel-chatbot');
  const panelQuiz = document.getElementById('panel-quiz');
  const btnLoadFolder = document.getElementById('btn-load-folder');
  const folderInputFallback = document.getElementById('folder-input-fallback');

  let currentTab = Storage.getActiveTab('chatbot');

  // Initialize ModuleLoader
  ModuleLoader.init();

  // Initialize Chatbot
  Chatbot.init({
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('btn-send-chat'),
    summaryBtn: document.getElementById('btn-summary-chat')
  });

  // Initialize Quiz
  Quiz.init(document.getElementById('quiz-container'));

  // Render initial sidebar
  renderSidebar();

  // Set initial tab (check URL param ?tab=quiz first, then Storage)
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  if (tabFromUrl === 'quiz' || tabFromUrl === 'chatbot') {
    currentTab = tabFromUrl;
  }
  switchTab(currentTab);

  // Global helper for tab switching
  window.AppSwitchTab = (tab) => {
    switchTab(tab);
  };

  // Event Listeners for tabs
  tabChatbotBtn?.addEventListener('click', () => switchTab('chatbot'));
  tabQuizBtn?.addEventListener('click', () => switchTab('quiz'));

  // Module change listeners
  ModuleLoader.on('activeModuleChanged', (activeModule) => {
    renderSidebar();
    Chatbot.updateForNewModule();
    Quiz.updateForNewModule();
  });

  ModuleLoader.on('modulesChanged', (modules) => {
    renderSidebar();
  });

  // Folder loader button
  btnLoadFolder?.addEventListener('click', async () => {
    if ('showDirectoryPicker' in window) {
      const res = await ModuleLoader.pickDirectory();
      if (!res.success && res.notSupported) {
        folderInputFallback?.click();
      } else if (!res.success && res.message) {
        alert(res.message);
      }
    } else {
      folderInputFallback?.click();
    }
  });

  folderInputFallback?.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const res = await ModuleLoader.loadFromFileInput(e.target.files);
      if (!res.success) {
        alert(res.message || 'Gagal memuat materi.');
      }
    }
  });

  /**
   * Render sidebar module items
   */
  function renderSidebar() {
    if (!sidebarListEl) return;
    const modules = ModuleLoader.getModules();
    const activeModule = ModuleLoader.getActiveModule();

    if (moduleCountEl) {
      moduleCountEl.textContent = `${modules.length} MODUL TERSEDIA`;
    }

    sidebarListEl.innerHTML = '';

    modules.forEach((mod) => {
      const isActive = activeModule && activeModule.id === mod.id;
      const li = document.createElement('li');
      li.className = `module-item ${isActive ? 'module-item-active' : ''}`;
      li.setAttribute('data-id', mod.id);

      // SVG document icon matching screenshot
      li.innerHTML = `
        <span class="module-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </span>
        <span class="module-title" title="${Utils.escapeHtml(mod.fullName || mod.id)}">${Utils.escapeHtml(mod.displayName || mod.id)}</span>
      `;

      li.addEventListener('click', () => {
        ModuleLoader.setActiveModule(mod.id);
      });

      sidebarListEl.appendChild(li);
    });
  }

  /**
   * Switch between AI Chatbot and Generator Kuis
   */
  function switchTab(tabName) {
    currentTab = tabName;
    Storage.setActiveTab(tabName);

    if (tabName === 'chatbot') {
      tabChatbotBtn?.classList.add('tab-active');
      tabQuizBtn?.classList.remove('tab-active');
      panelChatbot?.classList.remove('tab-panel-hidden');
      panelQuiz?.classList.add('tab-panel-hidden');
    } else {
      tabQuizBtn?.classList.add('tab-active');
      tabChatbotBtn?.classList.remove('tab-active');
      panelQuiz?.classList.remove('tab-panel-hidden');
      panelChatbot?.classList.add('tab-panel-hidden');
    }
  }
});
