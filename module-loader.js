/**
 * module-loader.js
 * Manages loading of local learning modules.
 * Loads preloaded offline modules and provides File System Access API / HTML File Input
 * for user-selected local files and folders (TXT, MD, JSON, CSV, HTML).
 */

const ModuleLoader = (() => {
  let modules = [];
  let activeModuleId = null;
  const listeners = {
    modulesChanged: [],
    activeModuleChanged: []
  };

  /**
   * Initialize module loader with preloaded offline data
   */
  function init(initialModuleId = null) {
    if (typeof PRELOADED_MODULES !== 'undefined' && Array.isArray(PRELOADED_MODULES)) {
      modules = JSON.parse(JSON.stringify(PRELOADED_MODULES));
    } else {
      modules = [];
    }

    // Set initial active module
    const savedId = Storage.getActiveModuleId('Modul_02_Biologi');
    const targetId = initialModuleId || savedId;
    
    const exists = modules.find(m => m.id === targetId);
    if (exists) {
      activeModuleId = targetId;
    } else if (modules.length > 0) {
      activeModuleId = modules[0].id;
    } else {
      activeModuleId = null;
    }

    notifyModulesChanged();
    notifyActiveModuleChanged();
  }

  function getModules() {
    return modules;
  }

  function getActiveModule() {
    return modules.find(m => m.id === activeModuleId) || modules[0] || null;
  }

  function setActiveModule(id) {
    const found = modules.find(m => m.id === id);
    if (found && activeModuleId !== id) {
      activeModuleId = id;
      Storage.setActiveModuleId(id);
      notifyActiveModuleChanged();
    }
  }

  function on(event, callback) {
    if (listeners[event]) {
      listeners[event].push(callback);
    }
  }

  function notifyModulesChanged() {
    listeners.modulesChanged.forEach(cb => {
      try { cb(modules); } catch (e) { console.error(e); }
    });
  }

  function notifyActiveModuleChanged() {
    const active = getActiveModule();
    listeners.activeModuleChanged.forEach(cb => {
      try { cb(active); } catch (e) { console.error(e); }
    });
  }

  /**
   * Parse plain text or markdown files into structured module
   */
  function parseTextFile(fileName, content) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const titleLine = lines[0] || fileName;
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    
    // Split into sections by numbers or headers
    const sections = [];
    let currentSection = {
      bab: 'Bab 1',
      hal: 1,
      topic: baseName,
      keywords: [],
      content: ''
    };

    lines.forEach((line, idx) => {
      // Look for numbered topics like "1. Latar Belakang" or "BAB: ..."
      const match = line.match(/^(\d+)\.\s*(.*)/);
      if (match) {
        if (currentSection.content) {
          sections.push(currentSection);
        }
        currentSection = {
          bab: `Bab ${match[1]}`,
          hal: idx + 1,
          topic: match[2],
          keywords: Utils.extractKeywords(match[2]),
          content: line + '\n'
        };
      } else {
        currentSection.content += line + ' ';
      }
    });

    if (currentSection.content) {
      sections.push(currentSection);
    }

    // Default summary
    const summary = lines.slice(0, 5).join(' ');

    return {
      id: baseName.replace(/\s+/g, '_'),
      fileName: fileName,
      displayName: Utils.truncate(baseName, 18),
      fullName: baseName,
      category: 'Materi Lokal',
      summary: summary,
      sections: sections.length > 0 ? sections : [{
        bab: 'Bab 1',
        hal: 1,
        topic: baseName,
        keywords: Utils.extractKeywords(content),
        content: content.slice(0, 2000)
      }],
      quiz: generateDefaultQuiz(baseName, sections)
    };
  }

  /**
   * Helper to generate a default 4-choice quiz if custom document has none
   */
  function generateDefaultQuiz(baseName, sections) {
    if (!sections || sections.length === 0) {
      return [
        {
          id: 1,
          question: `Topik utama apakah yang dipelajari pada ${baseName}?`,
          options: [`Prinsip dasar ${baseName}`, 'Sejarah peradaban kuno', 'Analisis astronomi', 'Kalkulasi pasar global'],
          correctIndex: 0,
          explanation: `Modul ini secara spesifik mengulas konsep dan prinsip fundamental dari ${baseName}.`
        }
      ];
    }

    return sections.slice(0, 5).map((sec, idx) => {
      const topic = sec.topic || `Konsep Bagian ${idx + 1}`;
      return {
        id: idx + 1,
        question: `Berdasarkan ${sec.bab}, apakah fokus pembahasan pada materi "${topic}"?`,
        options: [
          `Penjelasan terstruktur mengenai ${topic}`,
          'Eksperimen astronomi galaksi',
          'Perhitungan statistik demografi',
          'Hukum pasar modal internasional'
        ],
        correctIndex: 0,
        explanation: `Sesuai dokumen pada ${sec.bab}, topik "${topic}" membahas konsep yang tertera dalam modul.`
      };
    });
  }

  /**
   * Load local directory using File System Access API
   */
  async function pickDirectory() {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const loadedModules = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const ext = entry.name.split('.').pop().toLowerCase();
            if (['txt', 'md', 'json', 'csv', 'html'].includes(ext)) {
              const file = await entry.getFile();
              const content = await file.text();
              const parsed = parseTextFile(entry.name, content);
              loadedModules.push(parsed);
            }
          }
        }

        if (loadedModules.length > 0) {
          // Merge or replace
          loadedModules.forEach(mod => {
            const idx = modules.findIndex(m => m.id === mod.id);
            if (idx >= 0) {
              modules[idx] = mod;
            } else {
              modules.push(mod);
            }
          });
          notifyModulesChanged();
          setActiveModule(loadedModules[0].id);
          return { success: true, count: loadedModules.length };
        } else {
          return { success: false, message: 'Tidak ditemukan file materi (TXT, MD, JSON) di folder yang dipilih.' };
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Directory picker error:', err);
        }
        return { success: false, error: err };
      }
    } else {
      return { success: false, notSupported: true };
    }
  }

  /**
   * Handle files from HTML <input type="file">
   */
  async function loadFromFileInput(fileList) {
    const loadedModules = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop().toLowerCase();
      if (['txt', 'md', 'json', 'csv', 'html'].includes(ext)) {
        try {
          const content = await file.text();
          const parsed = parseTextFile(file.name, content);
          loadedModules.push(parsed);
        } catch (e) {
          console.error('Failed reading file:', file.name, e);
        }
      }
    }

    if (loadedModules.length > 0) {
      loadedModules.forEach(mod => {
        const idx = modules.findIndex(m => m.id === mod.id);
        if (idx >= 0) {
          modules[idx] = mod;
        } else {
          modules.push(mod);
        }
      });
      notifyModulesChanged();
      setActiveModule(loadedModules[0].id);
      return { success: true, count: loadedModules.length };
    }
    return { success: false, message: 'Format file tidak didukung.' };
  }

  return {
    init,
    getModules,
    getActiveModule,
    setActiveModule,
    on,
    pickDirectory,
    loadFromFileInput,
    parseTextFile
  };
})();

if (typeof window !== 'undefined') {
  window.ModuleLoader = ModuleLoader;
}
if (typeof module !== 'undefined') {
  module.exports = ModuleLoader;
}
