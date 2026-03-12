/**
 * Keyboard Shortcuts Module
 *
 * Adds global keyboard shortcuts for power users.
 */

(function() {
  const shortcuts = {
    'f': () => document.getElementById('btn-fetch')?.click(),
    'd': () => document.getElementById('btn-demo')?.click(),
    'a': () => {
      const btn = document.getElementById('btn-ai');
      if (btn && !btn.classList.contains('hidden')) btn.click();
    },
    's': () => document.getElementById('btn-scripts')?.click(),
    'e': () => {
      const btn = document.getElementById('btn-export-csv');
      if (btn && !btn.classList.contains('hidden')) btn.click();
    },
    '?': () => toggleShortcutsModal(),
    '1': () => switchTabByIndex(0),
    '2': () => switchTabByIndex(1),
    '3': () => switchTabByIndex(2),
    '4': () => switchTabByIndex(3),
    '5': () => switchTabByIndex(4),
  };

  function switchTabByIndex(index) {
    const tabs = document.querySelectorAll('.tab-btn');
    if (tabs[index]) tabs[index].click();
  }

  function toggleShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) modal.classList.toggle('hidden');
  }

  function isInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (isInputFocused()) return;

    // Escape closes any open modal
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
        modal.classList.add('hidden');
      });
      return;
    }

    const key = e.key.toLowerCase();
    const handler = shortcuts[key] || shortcuts[e.key]; // handle '?' which needs shift
    if (handler && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      handler();
    }
  });

  // Wire up shortcuts modal close
  document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('shortcuts-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('shortcuts-modal')?.classList.add('hidden');
      });
    }

    const modal = document.getElementById('shortcuts-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }

    const btnShortcuts = document.getElementById('btn-shortcuts');
    if (btnShortcuts) {
      btnShortcuts.addEventListener('click', toggleShortcutsModal);
    }
  });
})();
