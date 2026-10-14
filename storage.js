/**
 * storage.js
 * LocalStorage wrapper for persistent states:
 * - Active module selection
 * - Chat history per module
 * - Quiz progress and scores per module
 * - Active tab state
 */

const Storage = (() => {
  const PREFIX = 'asisten_belajar_';

  function isAvailable() {
    try {
      const test = '__test_ls__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  function get(key, defaultValue = null) {
    if (!isAvailable()) return defaultValue;
    try {
      const item = window.localStorage.getItem(PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('Storage read error:', e);
      return defaultValue;
    }
  }

  function set(key, value) {
    if (!isAvailable()) return false;
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage write error:', e);
      return false;
    }
  }

  function remove(key) {
    if (!isAvailable()) return;
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch (e) {}
  }

  // Specialized helpers
  function getActiveModuleId(defaultId = 'Modul_02_Biologi') {
    return get('active_module', defaultId);
  }

  function setActiveModuleId(moduleId) {
    return set('active_module', moduleId);
  }

  function getChatHistory(moduleId) {
    const allChats = get('chat_histories', {});
    return allChats[moduleId] || [];
  }

  function saveChatMessage(moduleId, message) {
    const allChats = get('chat_histories', {});
    if (!allChats[moduleId]) {
      allChats[moduleId] = [];
    }
    allChats[moduleId].push(message);
    set('chat_histories', allChats);
  }

  function clearChatHistory(moduleId) {
    const allChats = get('chat_histories', {});
    delete allChats[moduleId];
    set('chat_histories', allChats);
  }

  function getQuizState(moduleId) {
    const allQuizzes = get('quiz_states', {});
    return allQuizzes[moduleId] || null;
  }

  function saveQuizState(moduleId, state) {
    const allQuizzes = get('quiz_states', {});
    allQuizzes[moduleId] = state;
    set('quiz_states', allQuizzes);
  }

  function clearQuizState(moduleId) {
    const allQuizzes = get('quiz_states', {});
    delete allQuizzes[moduleId];
    set('quiz_states', allQuizzes);
  }

  function getActiveTab(defaultTab = 'chatbot') {
    return get('active_tab', defaultTab);
  }

  function setActiveTab(tab) {
    return set('active_tab', tab);
  }

  return {
    get,
    set,
    remove,
    getActiveModuleId,
    setActiveModuleId,
    getChatHistory,
    saveChatMessage,
    clearChatHistory,
    getQuizState,
    saveQuizState,
    clearQuizState,
    getActiveTab,
    setActiveTab
  };
})();

if (typeof window !== 'undefined') {
  window.Storage = Storage;
}
if (typeof module !== 'undefined') {
  module.exports = Storage;
}
