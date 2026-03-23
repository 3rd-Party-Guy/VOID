import { ShortcutsRegistry } from '../core/shortcuts-registry.js';

export class ShortcutsPanel {
  constructor() {
    this.registry = new ShortcutsRegistry();
    this.isExpanded = true;
    this.container = document.getElementById('shortcuts-panel');
    this.content = document.getElementById('shortcuts-content');
    this.toggleBtn = document.getElementById('shortcuts-toggle');
    this.bindEvents();
  }

  bindEvents() {
    this.toggleBtn.addEventListener('click', () => this.toggle());
  }

  update(mode, context = {}) {
    const { hasFaceSelected = false, hasUvSelected = false } = context;
    const shortcuts = this.registry.getShortcuts(mode, { hasFaceSelected, hasUvSelected });
    this.render(shortcuts);
  }

  render(shortcuts) {
    if (!shortcuts || shortcuts.length === 0) {
      this.content.innerHTML = '<div class="empty-state">No shortcuts available</div>';
      return;
    }

    this.content.innerHTML = shortcuts
      .map(
        (group) => `
      <div class="shortcut-group">
        <div class="shortcut-category">${group.category}</div>
        ${group.items
          .map(
            (item) => `
          <div class="shortcut-item">
            <span class="shortcut-key">${this.escapeHtml(item.key)}</span>
            <span class="shortcut-desc">${this.escapeHtml(item.desc)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `
      )
      .join('');
  }

  expand() {
    this.isExpanded = true;
    this.container.classList.remove('minimized');
    this.toggleBtn.textContent = '−';
  }

  collapse() {
    this.isExpanded = false;
    this.container.classList.add('minimized');
    this.toggleBtn.textContent = '+';
  }

  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
