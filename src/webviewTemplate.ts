export function getEmptyWebviewHtml(message: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px; display: flex; align-items: center; justify-content: center; min-height: 200px; }
  .empty { text-align: center; opacity: 0.6; font-size: 12px; }
  .empty-icon { font-size: 32px; margin-bottom: 8px; }
</style></head>
<body><div class="empty"><div class="empty-icon">&#x1f50d;</div>${message}</div></body></html>`;
}


export function getWebviewHtml(sessionsHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
    padding: 0 5px 10px 5px;
    line-height: 1.4;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    padding: 6px 4px;
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--vscode-sideBar-background);
  }

  .toolbar-btn {
    background: none;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 11px;
    opacity: 0.6;
    transition: opacity 0.1s, background 0.1s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .toolbar-btn:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground);
  }
  .toolbar-btn svg { width: 14px; height: 14px; }
  .toolbar-btn.active {
    opacity: 1;
    background: var(--vscode-inputOption-activeBackground);
    color: var(--vscode-inputOption-activeForeground);
  }

  /* ── View Toggle ── */
  body.view-files .session-item[data-toggle-id="timeline"] { display: none; }
  body.view-timeline .session-item[data-toggle-id="all-changes"] { display: none; }

  /* ── Session Card ── */
  .session {
    margin-bottom: 14px;
    border-radius: 8px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border, transparent);
    overflow: hidden;
  }

  .session-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 12px 10px 12px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
  }
  .session-header:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .session-chevron {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-top: 2px;
    transition: transform 0.2s ease;
    opacity: 0.7;
  }
  .session.collapsed .session-chevron {
    transform: rotate(-90deg);
  }

  .session-info { flex: 1; min-width: 0; }

  .session-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    margin-top: 4px;
    border-radius: 50%;
    background: #e5e5e5;
  }

  .relative-time {
    font-weight: 500;
    color: var(--vscode-textLink-foreground);
  }

  .session-meta {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 4px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    flex-wrap: wrap;
  }

  .badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--vscode-foreground) 10%, transparent);
    color: color-mix(in srgb, var(--vscode-descriptionForeground) 92%, var(--vscode-foreground) 8%);
  }

  .session-body {
    max-height: 5000px;
    overflow: hidden;
    opacity: 1;
    background: color-mix(in srgb, var(--vscode-foreground) 4%, transparent);
  }
  .session.collapsed .session-body {
    max-height: 0;
    opacity: 0;
  }

  .session-item {
    margin: 6px 6px 7px 6px;
  }

  /* ── Checkpoint Items ── */
  .checkpoint {
    position: relative;
    padding: 6px 8px;
  }
  .checkpoint:last-child { padding-bottom: 0; }

  .checkpoint-header {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    padding: 5px 8px;
    margin-left: -8px;
    border-radius: 6px;
    transition: background 0.1s;
  }
  .checkpoint-header:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .checkpoint-time {
    font-size: 11px;
    font-weight: 500;
    color: var(--vscode-foreground);
    transition: color 0.15s;
  }
  .checkpoint-header:hover .checkpoint-time {
    color: var(--vscode-textLink-foreground);
  }

  .checkpoint-chevron {
    width: 12px;
    height: 12px;
    transition: transform 0.2s ease;
    opacity: 0.5;
  }
  .checkpoint.collapsed .checkpoint-chevron {
    transform: rotate(-90deg);
  }

  .checkpoint-files {
    max-height: 500px;
    overflow: hidden;
    transition: max-height 0.25s ease, opacity 0.15s ease 0.08s;
    opacity: 1;
    margin-top: 3px;
    margin-left: 3px;
    padding-left: 8px;
    border-left: 1px solid color-mix(in srgb, var(--vscode-foreground) 12%, transparent);
  }
  .checkpoint.collapsed .checkpoint-files {
    max-height: 0;
    opacity: 0;
    transition: max-height 0.25s ease 0.1s, opacity 0.15s ease;
  }

  /* ── File Items ── */
  .file-item {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s;
    font-size: 12px;
    margin-bottom: 1px;
  }
  .file-item:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .file-item.reverted {
    opacity: 0.45;
    pointer-events: none;
  }
  .file-item.reverted .file-name {
    text-decoration: line-through;
  }
  .file-item.reverted .file-actions {
    display: none;
  }
  .reverted-badge {
    font-size: 9px;
    padding: 0 5px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--vscode-gitDecoration-addedResourceForeground, #73c991) 20%, transparent);
    color: var(--vscode-gitDecoration-addedResourceForeground, #73c991);
    font-weight: 500;
  }

  .file-icon {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 650;
    border-radius: 3px;
    margin-top: 1px;
  }

  .file-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .file-icon.added {
    color: var(--vscode-gitDecoration-addedResourceForeground, #73c991);
  }
  .file-icon.modified {
    color: var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d);
  }
  .file-icon.deleted {
    color: var(--vscode-gitDecoration-deletedResourceForeground, #f14c4c);
  }

  .file-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--vscode-foreground);
    font-weight: 400;
    line-height: 1.25;
  }

  .file-side {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-self: end;
    min-width: 0;
  }

  .file-actions {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
    align-self: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;
  }
  .file-item:hover .file-actions,
  .file-item:focus-within .file-actions {
    opacity: 0.95;
    pointer-events: auto;
  }

  .action-btn {
    background: none;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 12px;
    opacity: 0.7;
    transition: opacity 0.1s, background 0.1s;
  }
  .action-btn:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground);
  }

  /* ── Revert All Button ── */
  .revert-all-btn {
    margin-left: auto;
    background: none;
    border: 1px solid color-mix(in srgb, var(--vscode-foreground) 20%, transparent);
    color: var(--vscode-foreground);
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-family: var(--vscode-font-family);
    opacity: 0.7;
    transition: opacity 0.1s, background 0.1s;
  }
  .revert-all-btn:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground);
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="toolbar-btn" id="collapseAll" title="Collapse All">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="16" stroke-width="1.5" aria-hidden="true"><path d="M13 4v3c0 1.886 0 2.828.586 3.414S15.114 11 17 11h3m-9 9v-3c0-1.886 0-2.828-.586-3.414S8.886 13 7 13H4"/></svg>
      <span>Collapse</span>
    </button>
    <button class="toolbar-btn" id="expandAll" title="Expand All">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="16" stroke-width="1.5" aria-hidden="true"><path d="M19 12V9c0-1.886 0-2.828-.586-3.414S16.886 5 15 5h-3m-7 7v3c0 1.886 0 2.828.586 3.414S7.114 19 9 19h3"/></svg>
      <span>Expand</span>
    </button>
    <button class="toolbar-btn" id="fileBtn" title="File">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15 11a3 3 0 0 1-3-3V4H8a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-8zm-2-3a2 2 0 0 0 2 2h3.59L13 4.41zM8 3h5l7 7v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3m0 21a5 5 0 0 1-5-5V7h1v12a4 4 0 0 0 4 4h8v1z"/></svg>
      <span>File</span>
    </button>
    <button class="toolbar-btn" id="checkpointBtn" title="Checkpoint">
      <svg viewBox="0 0 36 36" fill="currentColor" aria-hidden="true"><path d="M10 18c0-1.3-.8-2.4-2-2.8v-3.4c1.2-.4 2-1.5 2-2.8c0-1.7-1.3-3-3-3S4 7.3 4 9c0 1.3.8 2.4 2 2.8v3.4c-1.2.4-2 1.5-2 2.8s.8 2.4 2 2.8v3.4c-1.2.4-2 1.5-2 2.8c0 1.7 1.3 3 3 3s3-1.3 3-3c0-1.3-.8-2.4-2-2.8v-3.4c1.2-.4 2-1.5 2-2.8m21-8H15c-.6 0-1-.4-1-1s.4-1 1-1h16c.6 0 1 .4 1 1s-.4 1-1 1m0 9H15c-.6 0-1-.4-1-1s.4-1 1-1h16c.6 0 1 .4 1 1s-.4 1-1 1m0 9H15c-.6 0-1-.4-1-1s.4-1 1-1h16c.6 0 1 .4 1 1s-.4 1-1 1"/></svg>
      <span>Checkpoint</span>
    </button>
  </div>
  ${sessionsHtml}
  <script>
    const vscode = acquireVsCodeApi();
    const persistedState = vscode.getState() || {};
    const uiState = {
      sessions: persistedState.sessions || {},
      toggles: persistedState.toggles || {},
      checkpoints: persistedState.checkpoints || {},
      viewMode: persistedState.viewMode || 'files',
    };

    // Apply view mode
    function applyViewMode() {
      document.body.classList.remove('view-files', 'view-timeline');
      document.body.classList.add('view-' + uiState.viewMode);
      const fileBtn = document.getElementById('fileBtn');
      const checkpointBtn = document.getElementById('checkpointBtn');
      if (fileBtn) fileBtn.classList.toggle('active', uiState.viewMode === 'files');
      if (checkpointBtn) checkpointBtn.classList.toggle('active', uiState.viewMode === 'timeline');
    }
    applyViewMode();

    function toggleKey(el) {
      const sessionId = el.dataset.sessionId || '';
      const toggleId = el.dataset.toggleId || '';
      return sessionId && toggleId ? sessionId + '::' + toggleId : '';
    }

    function persistUiState() {
      vscode.setState(uiState);
    }

    function rememberSession(el) {
      const sessionId = el?.dataset?.sessionId;
      if (sessionId) {
        uiState.sessions[sessionId] = el.classList.contains('collapsed');
      }
    }

    function rememberToggle(el) {
      const key = toggleKey(el);
      if (key) {
        uiState.toggles[key] = el.classList.contains('collapsed');
      }
    }

    function rememberCheckpoint(el) {
      const checkpointId = el?.dataset?.checkpointId;
      if (checkpointId) {
        uiState.checkpoints[checkpointId] = el.classList.contains('collapsed');
      }
    }

    function applyUiState() {
      document.querySelectorAll('.session').forEach(el => {
        const sessionId = el.dataset.sessionId;
        if (!sessionId) return;
        const collapsed = uiState.sessions[sessionId];
        if (collapsed === true) el.classList.add('collapsed');
        if (collapsed === false) el.classList.remove('collapsed');
      });

      document.querySelectorAll('.session-item').forEach(el => {
        const key = toggleKey(el);
        if (!key) return;
        const collapsed = uiState.toggles[key];
        if (collapsed === true) el.classList.add('collapsed');
        if (collapsed === false) el.classList.remove('collapsed');
      });

      document.querySelectorAll('.checkpoint').forEach(el => {
        const checkpointId = el.dataset.checkpointId;
        if (!checkpointId) return;
        const collapsed = uiState.checkpoints[checkpointId];
        if (collapsed === true) el.classList.add('collapsed');
        if (collapsed === false) el.classList.remove('collapsed');
      });
    }

    applyUiState();

    // Session toggle
    document.querySelectorAll('.session-header').forEach(el => {
      el.addEventListener('click', () => {
        const session = el.closest('.session');
        session.classList.toggle('collapsed');
        rememberSession(session);
        persistUiState();
      });
    });

    // Checkpoint toggle
    document.querySelectorAll('.checkpoint-header').forEach(el => {
      el.addEventListener('click', () => {
        const checkpoint = el.closest('.checkpoint');
        checkpoint.classList.toggle('collapsed');
        rememberCheckpoint(checkpoint);
        persistUiState();
      });
    });

    // Expand all
    document.getElementById('expandAll').addEventListener('click', () => {
      document.querySelectorAll('.session.collapsed').forEach(el => {
        el.classList.remove('collapsed');
        rememberSession(el);
      });
      document.querySelectorAll('.session-item.collapsed').forEach(el => {
        el.classList.remove('collapsed');
        rememberToggle(el);
      });
      document.querySelectorAll('.checkpoint.collapsed').forEach(el => {
        el.classList.remove('collapsed');
        rememberCheckpoint(el);
      });
      persistUiState();
    });

    // Collapse all
    document.getElementById('collapseAll').addEventListener('click', () => {
      document.querySelectorAll('.session:not(.collapsed)').forEach(el => {
        el.classList.add('collapsed');
        rememberSession(el);
      });
      document.querySelectorAll('.session-item:not(.collapsed)').forEach(el => {
        el.classList.add('collapsed');
        rememberToggle(el);
      });
      document.querySelectorAll('.checkpoint:not(.collapsed)').forEach(el => {
        el.classList.add('collapsed');
        rememberCheckpoint(el);
      });
      persistUiState();
    });

    // View toggle: Files / Timeline
    document.getElementById('fileBtn').addEventListener('click', () => {
      uiState.viewMode = 'files';
      applyViewMode();
      persistUiState();
    });
    document.getElementById('checkpointBtn').addEventListener('click', () => {
      uiState.viewMode = 'timeline';
      applyViewMode();
      persistUiState();
    });

    // File click -> diff
    document.querySelectorAll('.file-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        vscode.postMessage({
          command: 'viewDiff',
          sessionId: el.dataset.sessionId,
          filePath: el.dataset.filePath,
          absolutePath: el.dataset.absolutePath,
          backupFileName: el.dataset.backupFileName || null,
          version: parseInt(el.dataset.version),
          backupTime: el.dataset.backupTime,
          mode: el.dataset.mode,
          nextBackupFileName: el.dataset.nextBackupFileName || null
        });
      });
    });

    // Restore button
    document.querySelectorAll('.restore-btn').forEach(el => {
      el.addEventListener('click', () => {
        const fi = el.closest('.file-item');
        vscode.postMessage({
          command: 'restoreFile',
          sessionId: fi.dataset.sessionId,
          absolutePath: fi.dataset.absolutePath,
          backupFileName: fi.dataset.backupFileName || null,
          version: parseInt(fi.dataset.version)
        });
      });
    });

    // Delete button (for created files)
    document.querySelectorAll('.delete-btn').forEach(el => {
      el.addEventListener('click', () => {
        const fi = el.closest('.file-item');
        vscode.postMessage({
          command: 'deleteFile',
          absolutePath: fi.dataset.absolutePath,
          sessionId: fi.dataset.sessionId
        });
      });
    });

    // Revert All button
    document.querySelectorAll('.revert-all-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        vscode.postMessage({
          command: 'revertAll',
          sessionId: el.dataset.sessionId
        });
      });
    });
    // Listen for messages from extension (mark reverted)
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.command === 'markReverted') {
        document.querySelectorAll('.file-item').forEach(el => {
          const sameSession = el.dataset.sessionId === msg.sessionId;
          const samePath = el.dataset.absolutePath === msg.absolutePath;
          if (sameSession && samePath && !el.classList.contains('reverted')) {
            el.classList.add('reverted');
            const actions = el.querySelector('.file-actions');
            if (actions) {
              actions.insertAdjacentHTML('beforebegin', '<span class="reverted-badge">reverted</span>');
            }
          }
        });
      }
      if (msg.command === 'markAllReverted') {
        const revertedPaths = new Set(msg.absolutePaths || []);
        document.querySelectorAll('.file-item').forEach(el => {
          const sameSession = el.dataset.sessionId === msg.sessionId;
          const samePath = revertedPaths.size === 0 || revertedPaths.has(el.dataset.absolutePath);
          if (sameSession && samePath && !el.classList.contains('reverted')) {
            el.classList.add('reverted');
            const actions = el.querySelector('.file-actions');
            if (actions) {
              actions.insertAdjacentHTML('beforebegin', '<span class="reverted-badge">reverted</span>');
            }
          }
        });
      }
    });
  </script>
</body></html>`;
}
