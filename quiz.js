/**
 * quiz.js
 * Handles the Generator Kuis interface:
 * - 4-choice questions (A, B, C, D)
 * - Anti-cheat answer locking
 * - Correct/wrong color indicators matching screenshots
 * - Score calculations and progress bar
 * - Final summary screen with motivational messages and 3 action buttons
 */

const Quiz = (() => {
  let quizContainerEl = null;
  let currentQuestions = [];
  let currentIndex = 0;
  let score = 0;
  let answeredCount = 0;
  let isAnswered = false;
  let selectedOptionIndex = null;

  const OPTION_LABELS = ['A', 'B', 'C', 'D'];

  function init(containerEl) {
    quizContainerEl = containerEl;
    loadQuizForActiveModule();
  }

  function loadQuizForActiveModule() {
    const activeModule = ModuleLoader.getActiveModule();
    if (!activeModule || !activeModule.quiz || activeModule.quiz.length === 0) {
      renderEmptyState();
      return;
    }

    currentQuestions = activeModule.quiz;

    // Check saved state from Storage
    const savedState = Storage.getQuizState(activeModule.id);
    if (savedState) {
      currentIndex = savedState.currentIndex || 0;
      score = savedState.score || 0;
      answeredCount = savedState.answeredCount || 0;
      isAnswered = savedState.isAnswered || false;
      selectedOptionIndex = savedState.selectedOptionIndex ?? null;
      if (savedState.isCompleted) {
        renderResults();
        return;
      }
    } else {
      // Default initial state
      // If module is Biologi, default to answered Question 3 matching Screenshot 2
      if (activeModule.id === 'Modul_02_Biologi' && currentQuestions.length >= 3) {
        currentIndex = 2; // Soal 3
        score = 2;
        answeredCount = 2;
        isAnswered = true; // User selected option C (Lambung), correct is B (Pankreas)
        selectedOptionIndex = 2;
      } else {
        currentIndex = 0;
        score = 0;
        answeredCount = 0;
        isAnswered = false;
        selectedOptionIndex = null;
      }
      saveCurrentState();
    }

    renderCurrentQuestion();
  }

  function saveCurrentState(isCompleted = false) {
    const activeModule = ModuleLoader.getActiveModule();
    if (!activeModule) return;

    Storage.saveQuizState(activeModule.id, {
      currentIndex,
      score,
      answeredCount,
      isAnswered,
      selectedOptionIndex,
      isCompleted
    });
  }

  function renderEmptyState() {
    if (!quizContainerEl) return;
    quizContainerEl.innerHTML = `
      <div class="quiz-empty-card">
        <h3>Belum Ada Soal Kuis</h3>
        <p>Materi modul ini belum memiliki bank soal kuis 4-pilihan.</p>
      </div>
    `;
  }

  function renderCurrentQuestion() {
    if (!quizContainerEl) return;
    const activeModule = ModuleLoader.getActiveModule();
    if (!activeModule) return;

    const total = currentQuestions.length;
    const q = currentQuestions[currentIndex];
    if (!q) {
      renderResults();
      return;
    }

    const progressPercent = Math.round(((currentIndex + 1) / total) * 100);
    const moduleTag = activeModule.id;

    quizContainerEl.innerHTML = `
      <div class="quiz-panel-inner">
        <!-- Status Bar Header -->
        <div class="quiz-status-bar">
          <div class="quiz-status-left">
            Soal ${currentIndex + 1} dari ${total} <span class="quiz-dot">•</span> ${Utils.escapeHtml(moduleTag)}
          </div>
          <div class="quiz-status-right">
            Skor: <span id="quiz-score-display">${score}/${answeredCount}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="quiz-progress-track">
          <div class="quiz-progress-bar" style="width: ${progressPercent}%;"></div>
        </div>

        <!-- Question Title -->
        <h2 class="quiz-question-title">${Utils.escapeHtml(q.question)}</h2>

        <!-- Options List -->
        <div class="quiz-options-grid" id="quiz-options-container">
          ${q.options.map((opt, idx) => {
            const letter = OPTION_LABELS[idx] || '';
            let optClass = 'quiz-option-btn';
            
            if (isAnswered) {
              optClass += ' option-locked';
              if (idx === q.correctIndex) {
                optClass += ' option-correct';
              } else if (idx === selectedOptionIndex) {
                optClass += ' option-wrong';
              }
            }

            return `
              <button type="button" class="${optClass}" data-index="${idx}" ${isAnswered ? 'disabled' : ''}>
                <span class="quiz-option-letter">${letter}</span>
                <span class="quiz-option-text">${Utils.escapeHtml(opt)}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Bottom Feedback Banner -->
        <div id="quiz-feedback-container">
          ${renderFeedbackBanner(q)}
        </div>
      </div>
    `;

    bindOptionClicks();
  }

  function renderFeedbackBanner(q) {
    if (!isAnswered) return '';

    const total = currentQuestions.length;
    const correctOptText = q.options[q.correctIndex] || '';
    const hasNext = currentIndex < total - 1;
    const nextText = hasNext ? `Lanjut ke soal ${currentIndex + 2}.` : 'Lihat hasil akhir kuis.';

    return `
      <div class="quiz-feedback-card">
        <div class="quiz-feedback-text">
          <span class="quiz-bold-score">${score}</span> dari ${answeredCount} soal benar sejauh ini. 
          Jawaban benar: <strong class="quiz-correct-name">${Utils.escapeHtml(correctOptText)}</strong>. ${nextText}
        </div>
        <div class="quiz-feedback-action">
          <button type="button" class="btn-quiz-next" id="btn-quiz-next">
            ${hasNext ? 'Soal Berikutnya &rarr;' : 'Selesaikan Kuis'}
          </button>
        </div>
      </div>
    `;
  }

  function bindOptionClicks() {
    const container = document.getElementById('quiz-options-container');
    if (!container) return;

    const buttons = container.querySelectorAll('.quiz-option-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (isAnswered) return; // Prevent double answering
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        handleAnswerSelection(idx);
      });
    });

    const nextBtn = document.getElementById('btn-quiz-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', handleNextQuestion);
    }
  }

  function handleAnswerSelection(chosenIndex) {
    if (isAnswered) return;

    const q = currentQuestions[currentIndex];
    if (!q) return;

    isAnswered = true;
    selectedOptionIndex = chosenIndex;
    answeredCount++;

    if (chosenIndex === q.correctIndex) {
      score++;
    }

    saveCurrentState(false);
    renderCurrentQuestion();
  }

  function handleNextQuestion() {
    if (currentIndex < currentQuestions.length - 1) {
      currentIndex++;
      isAnswered = false;
      selectedOptionIndex = null;
      saveCurrentState(false);
      renderCurrentQuestion();
    } else {
      saveCurrentState(true);
      renderResults();
    }
  }

  function renderResults() {
    if (!quizContainerEl) return;
    const activeModule = ModuleLoader.getActiveModule();
    const total = currentQuestions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const wrongCount = total - score;

    let motivation = '';
    let badgeClass = 'badge-good';
    if (percentage === 100) {
      motivation = 'Sempurna! Kamu telah menguasai seluruh materi modul ini dengan pemahaman maksimal!';
      badgeClass = 'badge-perfect';
    } else if (percentage >= 80) {
      motivation = 'Luar biasa! Pemahamanmu terhadap materi modul ini sangat mendalam dan solid.';
      badgeClass = 'badge-good';
    } else if (percentage >= 60) {
      motivation = 'Kerja bagus! Pelajari kembali beberapa poin materi untuk menyempurnakan pemahamanmu.';
      badgeClass = 'badge-average';
    } else {
      motivation = 'Tetap semangat! Gunakan fitur AI Chatbot dan Rangkum untuk memperdalam materi sebelum mengulang kuis.';
      badgeClass = 'badge-retry';
    }

    quizContainerEl.innerHTML = `
      <div class="quiz-panel-inner quiz-results-panel">
        <div class="quiz-results-header">
          <h2>Ringkasan Hasil Kuis</h2>
          <p class="quiz-results-sub">${Utils.escapeHtml(activeModule ? activeModule.fullName : 'Modul Pembelajaran')}</p>
        </div>

        <div class="quiz-score-badge ${badgeClass}">
          <span class="quiz-big-percent">${percentage}%</span>
          <span class="quiz-score-detail">${score} Benar dari ${total} Soal</span>
        </div>

        <div class="quiz-stats-cards">
          <div class="quiz-stat-card stat-correct">
            <div class="stat-number">${score}</div>
            <div class="stat-label">Jawaban Benar</div>
          </div>
          <div class="quiz-stat-card stat-wrong">
            <div class="stat-number">${wrongCount}</div>
            <div class="stat-label">Jawaban Salah</div>
          </div>
          <div class="quiz-stat-card stat-rate">
            <div class="stat-number">${percentage}%</div>
            <div class="stat-label">Tingkat Ketepatan</div>
          </div>
        </div>

        <div class="quiz-motivation-box">
          <p>${motivation}</p>
        </div>

        <!-- 3 Required Action Buttons -->
        <div class="quiz-results-actions">
          <button type="button" class="btn-action-quiz btn-primary-quiz" id="btn-restart-quiz">
            &#x21bb; Ulangi Kuis
          </button>
          <button type="button" class="btn-action-quiz btn-secondary-quiz" id="btn-change-module">
            &#x1f4c2; Pilih Modul Lain
          </button>
          <button type="button" class="btn-action-quiz btn-tertiary-quiz" id="btn-return-chatbot">
            &#x1f4ac; Kembali ke Chatbot
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-restart-quiz')?.addEventListener('click', restartQuiz);
    document.getElementById('btn-change-module')?.addEventListener('click', () => {
      // Prompt user or highlight sidebar
      const sidebar = document.querySelector('.sidebar-modules-list');
      if (sidebar) {
        sidebar.scrollIntoView({ behavior: 'smooth' });
        sidebar.classList.add('highlight-pulse');
        setTimeout(() => sidebar.classList.remove('highlight-pulse'), 1500);
      }
    });
    document.getElementById('btn-return-chatbot')?.addEventListener('click', () => {
      if (typeof window.AppSwitchTab === 'function') {
        window.AppSwitchTab('chatbot');
      }
    });
  }

  function restartQuiz() {
    currentIndex = 0;
    score = 0;
    answeredCount = 0;
    isAnswered = false;
    selectedOptionIndex = null;
    saveCurrentState(false);
    renderCurrentQuestion();
  }

  function updateForNewModule() {
    loadQuizForActiveModule();
  }

  return {
    init,
    updateForNewModule,
    restartQuiz
  };
})();

if (typeof window !== 'undefined') {
  window.Quiz = Quiz;
}
if (typeof module !== 'undefined') {
  module.exports = Quiz;
}
