/**
 * utils.js
 * Utility functions for text processing, Indonesian keyword filtering,
 * similarity scoring, and DOM helpers.
 */

const Utils = (() => {
  // Common Indonesian stopwords to filter out in search
  const STOPWORDS = new Set([
    'ada', 'adalah', 'adanya', 'adapun', 'agak', 'agar', 'akan', 'akankah', 'akhir',
    'akhiri', 'akhirnya', 'aku', 'akulah', 'amat', 'amatlah', 'anda', 'andalah',
    'antar', 'antara', 'antaranya', 'apa', 'apaan', 'apabila', 'apakah', 'apalagi',
    'apatah', 'artinya', 'asal', 'asalkan', 'atas', 'atau', 'ataukah', 'ataupun',
    'awal', 'awalnya', 'bagai', 'bagaikan', 'bagaimana', 'bagaimanakah', 'bagaimanapun',
    'bagi', 'bagian', 'bahkan', 'bahwa', 'bahwasanya', 'baik', 'bakal', 'bakalan',
    'balik', 'banyak', 'bapak', 'beberapa', 'bedanya', 'begitu', 'begitupun', 'belum',
    'bila', 'bisa', 'boleh', 'buat', 'bukan', 'cukup', 'dan', 'dapat', 'dari',
    'daripada', 'dekat', 'demi', 'demikian', 'dengan', 'depan', 'di', 'dia',
    'dini', 'diri', 'dirinya', 'dulu', 'empat', 'guna', 'hal', 'hampir', 'hanya',
    'harus', 'ia', 'ialah', 'ibarat', 'ibu', 'ini', 'inikah', 'inilah', 'itu',
    'itukah', 'itulah', 'jadi', 'jangan', 'jauh', 'jelas', 'jelaskan', 'jika',
    'jikalau', 'juga', 'jumlah', 'kah', 'kala', 'kalau', 'kami', 'kamu', 'karena',
    'ke', 'kebetulan', 'kedua', 'kelima', 'kembali', 'kemudian', 'kenapa', 'kepada',
    'kepadanya', 'keseluruhan', 'ketika', 'khususnya', 'kini', 'kita', 'lagi',
    'lain', 'lalu', 'lama', 'langsung', 'lebih', 'lewat', 'luar', 'macam', 'maka',
    'malah', 'mampu', 'mana', 'manakah', 'masa', 'masih', 'masing', 'mau', 'maupun',
    'melalui', 'memang', 'mempunyai', 'mengapa', 'mengenai', 'menurut', 'merupakan',
    'meski', 'meskipun', 'mohon', 'namun', 'nanti', 'nyata', 'oleh', 'pada',
    'padahal', 'paling', 'para', 'pasti', 'per', 'pernah', 'persoalan', 'pertama',
    'pula', 'pun', 'rasa', 'saat', 'saatnya', 'saja', 'sajalah', 'saling', 'sama',
    'sambil', 'sampai', 'sana', 'sangat', 'sangatlah', 'satu', 'saya', 'se', 'sebab',
    'sebagai', 'sebagaimana', 'sebagian', 'sebaik', 'sebaliknya', 'sebanyak', 'sebelum',
    'sebelumnya', 'sebenarnya', 'secara', 'sedang', 'sedangkan', 'sedikit', 'segala',
    'sehingga', 'sejak', 'sekali', 'sekalian', 'sekaligus', 'sekarang', 'sekitar',
    'sela', 'selain', 'selalu', 'selama', 'seluruh', 'semacam', 'semakin', 'sementara',
    'sempat', 'semua', 'semula', 'sendiri', 'sendirinya', 'seolah', 'seorang',
    'sepanjang', 'seperti', 'sering', 'serta', 'sesi', 'sesuatu', 'sesudah', 'setelah',
    'setiap', 'siap', 'siapa', 'siapakah', 'sini', 'sinilah', 'suatu', 'sudah',
    'supaya', 'tadi', 'tadinya', 'tahu', 'tak', 'tanpa', 'tapi', 'telah', 'tentang',
    'tentu', 'tepat', 'terhadap', 'termasuk', 'ternyata', 'tetapi', 'tiap', 'tidak',
    'tiga', 'toh', 'waduh', 'wah', 'wahai', 'yaitu', 'yakni', 'yang',
    // Indonesian colloquial & particle words
    'tuh', 'sih', 'dong', 'nih', 'kan', 'kok', 'ya', 'deh', 'lho', 'kah', 'lah',
    'gimana', 'coba', 'tolong', 'jelasin', 'terangin', 'kasih', 'tau', 'taukah',
    'pengen', 'apaan', 'apanya', 'gitu', 'begini', 'begitu'
  ]);

  /**
   * Escape HTML entities to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Clean and normalize a string
   */
  function normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[^\w\s\u00C0-\u017F-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokenize string into keywords, filtering out stopwords
   */
  function extractKeywords(text) {
    if (!text) return [];
    const normalized = normalizeText(text);
    const tokens = normalized.split(/\s+/);
    return tokens.filter(t => t.length > 2 && !STOPWORDS.has(t));
  }

  /**
   * Truncate text with ellipsis
   */
  function truncate(str, maxLen = 18) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...';
  }

  /**
   * Calculate string similarity / dice coefficient for fuzzy matches
   */
  function getBigrams(str) {
    const s = str.toLowerCase();
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.slice(i, i + 2));
    }
    return bigrams;
  }

  function diceCoefficient(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    const bg1 = getBigrams(str1);
    const bg2 = getBigrams(str2);
    let intersection = 0;
    bg1.forEach(b => {
      if (bg2.has(b)) intersection++;
    });
    return (2 * intersection) / (bg1.size + bg2.size || 1);
  }

  /**
   * Simple DOM helper
   */
  function $(selector, context = document) {
    return context.querySelector(selector);
  }

  function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  return {
    STOPWORDS,
    escapeHtml,
    normalizeText,
    extractKeywords,
    truncate,
    diceCoefficient,
    $,
    $$
  };
})();

if (typeof window !== 'undefined') {
  window.Utils = Utils;
}
if (typeof module !== 'undefined') {
  module.exports = Utils;
}
