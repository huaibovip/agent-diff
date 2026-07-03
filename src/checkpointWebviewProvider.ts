import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  SessionInfo,
  Snapshot,
  FileBackup,
  findSessionsForWorkspace,
  getCumulativeChanges,
  readBackupFile,
  findNextBackup,
} from "./checkpointService";
import { getEmptyWebviewHtml, getWebviewHtml } from "./webviewTemplate";

export class CheckpointWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "AgentDiff";
  private _view?: vscode.WebviewView;
  private _revertedFiles = new Set<string>();

  constructor(
    private workspacePath: string | undefined,
    private log?: (msg: string) => void
  ) { }

  refresh(): void {
    if (this._revertedFiles.size > 500) {
      this._revertedFiles.clear();
    }
    if (this._view) {
      this._updateContent(this._view.webview);
    }
  }

  markFileReverted(sessionId: string, absolutePath: string): void {
    this._revertedFiles.add(this._revertedKey(sessionId, absolutePath));
    this._view?.webview.postMessage({
      command: "markReverted",
      sessionId,
      absolutePath,
    });
  }

  markAllReverted(sessionId: string, absolutePaths: string[]): void {
    for (const p of absolutePaths) {
      this._revertedFiles.add(this._revertedKey(sessionId, p));
    }
    this._view?.webview.postMessage({
      command: "markAllReverted",
      sessionId,
      absolutePaths,
    });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "viewDiff":
          vscode.commands.executeCommand(
            "AgentDiff.viewDiffData",
            message.sessionId,
            message.filePath,
            message.absolutePath,
            message.backupFileName,
            message.version,
            message.backupTime,
            message.mode,
            message.nextBackupFileName
          );
          break;
        case "restoreFile":
          vscode.commands.executeCommand(
            "AgentDiff.restoreFileData",
            message.sessionId,
            message.absolutePath,
            message.backupFileName,
            message.version
          );
          break;
        case "revertAll":
          vscode.commands.executeCommand(
            "AgentDiff.revertAllData",
            message.sessionId
          );
          break;
        case "deleteFile":
          vscode.commands.executeCommand(
            "AgentDiff.deleteFileData",
            message.absolutePath,
            message.sessionId
          );
          break;
      }
    });

    this._updateContent(webviewView.webview).catch((err) => {
      this.log?.(`Error updating webview content: ${err.message}`);
      webviewView.webview.html = getEmptyWebviewHtml(
        `Failed to load checkpoints: ${err.message}`
      );
    });
  }

  private async _updateContent(webview: vscode.Webview): Promise<void> {
    if (!this.workspacePath) {
      webview.html = this._getEmptyHtml("No workspace folder open");
      return;
    }

    const sessions = await findSessionsForWorkspace(this.workspacePath, this.log);

    if (sessions.length === 0) {
      webview.html = this._getEmptyHtml("No Claude checkpoints found for this workspace");
      return;
    }

    webview.html = this._getHtml(sessions);
  }

  private _getEmptyHtml(message: string): string {
    return getEmptyWebviewHtml(message);
  }

  private _getHtml(sessions: SessionInfo[]): string {
    const sessionsHtml = sessions.map((s, si) => this._renderSession(s, si)).join("");
    return getWebviewHtml(sessionsHtml);
  }

  private _renderSession(session: SessionInfo, index: number): string {
    const date = session.lastActivity;
    const dateStr = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const title = this._escapeHtml(session.title);
    const fullTitle = session.title;
    const collapsed = index > 0 ? " collapsed" : "";

    // Cumulative changes: all unique files, first backup per file.
    // Hide entries that would produce an empty diff.
    const cumulativeFiles = getCumulativeChanges(session).filter((f) =>
      this._hasCumulativeDiff(session, f)
    );
    const netChangedCount = cumulativeFiles.length;
    const cumulativeHtml = cumulativeFiles
      .map((f) => this._renderFileItem(session, f, "cumulative"))
      .join("");

    // Timeline checkpoints: hide files/checkpoints that would produce empty diffs.
    const timelineCheckpoints = session.snapshots
      .map((snap, originalIndex) => ({
        snap,
        originalIndex,
        files: snap.files.filter((f) => this._hasTimelineDiff(session, snap, f)),
      }))
      .filter((entry) => entry.files.length > 0);
    const totalCheckpointCount = session.snapshots.length;
    const timelineCheckpointCount = timelineCheckpoints.length;
    const hiddenCheckpointCount = totalCheckpointCount - timelineCheckpointCount;
    const timelineCountLabel =
      timelineCheckpointCount === totalCheckpointCount
        ? `${timelineCheckpointCount} checkpoint${timelineCheckpointCount !== 1 ? "s" : ""}`
        : `${timelineCheckpointCount} shown / ${totalCheckpointCount} total`;
    const hiddenCheckpointTooltip =
      hiddenCheckpointCount > 0
        ? ` title="${this._escapeAttr(
          `${hiddenCheckpointCount} checkpoint${hiddenCheckpointCount !== 1 ? "s are" : " is"} hidden because they have no actual diff`
        )}"`
        : "";
    const checkpointsHtml = [...timelineCheckpoints]
      .reverse()
      .map((entry) =>
        this._renderCheckpoint(
          session,
          entry.snap,
          entry.originalIndex,
          entry.files
        )
      )
      .join("");

    return `
      <div class="session${collapsed}" data-session-id="${this._escapeAttr(session.sessionId)}">
        <div class="session-header">
          <div class="session-dot"></div>
          <div class="session-info">
            <div class="session-title" title="${this._escapeAttr(fullTitle)}">
              ${title}
            </div>
            <div class="session-meta">
              <span>${dateStr}, ${timeStr}</span>
              <span class="badge"${hiddenCheckpointTooltip}>${timelineCountLabel}</span>
              <span class="badge">${netChangedCount} file${netChangedCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        <div class="session-body">
          <div class="session-item collapsed" data-session-id="${this._escapeAttr(session.sessionId)}" data-toggle-id="all-changes">
            ${cumulativeHtml}
          </div>
          <div class="session-item" data-session-id="${this._escapeAttr(session.sessionId)}" data-toggle-id="timeline">
            ${checkpointsHtml}
          </div>
        </div>
      </div>`;
  }

  private _renderCheckpoint(
    session: SessionInfo,
    snapshot: Snapshot,
    index: number,
    files: FileBackup[]
  ): string {
    const date = new Date(snapshot.timestamp);
    const checkpointId = `${session.sessionId}::${snapshot.messageId}`;
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const filesHtml = files
      .map((f) => this._renderFileItem(session, f, "checkpoint", snapshot))
      .join("");

    return `
      <div class="checkpoint collapsed" data-checkpoint-id="${this._escapeAttr(checkpointId)}">
        <div class="checkpoint-header">
          <span class="checkpoint-time">#${index + 1} &middot; ${timeStr}</span>
        </div>
        <div class="checkpoint-files">
          ${filesHtml}
        </div>
      </div>`;
  }

  private _hasCumulativeDiff(session: SessionInfo, file: FileBackup): boolean {
    if (file.backupFileName === null) {
      // New file: compare empty -> current.
      if (!fs.existsSync(file.absolutePath)) {
        return false;
      }
      try {
        return fs.readFileSync(file.absolutePath, "utf-8") !== "";
      } catch {
        return true;
      }
    }

    try {
      const backup = readBackupFile(session.sessionId, file.backupFileName);
      if (backup === null) {
        return true;
      }
      if (!fs.existsSync(file.absolutePath)) {
        // Diff is backup -> empty
        return backup !== "";
      }
      const current = fs.readFileSync(file.absolutePath, "utf-8");
      return backup !== current;
    } catch {
      return true;
    }
  }

  private _hasTimelineDiff(
    session: SessionInfo,
    snapshot: Snapshot,
    file: FileBackup
  ): boolean {
    const nextBackup = findNextBackup(session, snapshot.messageId, file.filePath);

    if (file.backupFileName === null) {
      // Created file:
      // - with next backup: empty -> next backup
      // - otherwise: empty -> current (or empty if missing)
      if (nextBackup) {
        const nextContent = readBackupFile(session.sessionId, nextBackup);
        return nextContent === null ? true : nextContent !== "";
      }
      if (!fs.existsSync(file.absolutePath)) {
        return false;
      }
      try {
        return fs.readFileSync(file.absolutePath, "utf-8") !== "";
      } catch {
        return true;
      }
    }

    const backup = readBackupFile(session.sessionId, file.backupFileName);
    if (backup === null) {
      return true;
    }

    if (nextBackup) {
      // Checkpoint mode: backup -> next backup
      const nextContent = readBackupFile(session.sessionId, nextBackup);
      return nextContent === null ? true : backup !== nextContent;
    }

    // Last occurrence: backup -> current (or empty if missing)
    if (!fs.existsSync(file.absolutePath)) {
      return backup !== "";
    }
    try {
      const current = fs.readFileSync(file.absolutePath, "utf-8");
      return backup !== current;
    } catch {
      return true;
    }
  }

  private _renderFileItem(
    session: SessionInfo,
    f: FileBackup,
    mode: "cumulative" | "checkpoint",
    snapshot?: Snapshot
  ): string {
    const fileName = path.basename(f.absolutePath);
    const nextBackup = mode === "checkpoint" && snapshot
      ? findNextBackup(session, snapshot.messageId, f.filePath)
      : null;
    const dirName = path.dirname(f.filePath);
    const displayPath = dirName && dirName !== "."
      ? this._truncateMiddle(dirName, 42)
      : "";
    const fileExists = fs.existsSync(f.absolutePath);
    const isNew = f.backupFileName === null;
    const isDeleted = !isNew && !fileExists;
    const iconClass = isNew ? "added" : isDeleted ? "deleted" : "modified";
    const iconChar = isNew ? "A" : isDeleted ? "D" : "M";
    const revertedKey = this._revertedKey(session.sessionId, f.absolutePath);

    // Only show reverted if user explicitly clicked revert, validated against current state
    let isReverted = false;
    if (this._revertedFiles.has(revertedKey)) {
      if (isNew) {
        isReverted = !fileExists;
      } else {
        try {
          const backup = readBackupFile(session.sessionId, f.backupFileName!);
          const current = fileExists
            ? fs.readFileSync(f.absolutePath, "utf-8")
            : null;
          isReverted = backup !== null && backup === current;
        } catch {
          isReverted = false;
        }
      }
    }

    const revertedBadge = isReverted
      ? `<span class="reverted-badge">reverted</span>`
      : "";
    const actionBtn = isNew
      ? `<button class="action-btn delete-btn" title="Delete (file created by Claude)">&#x1F5D1;</button>`
      : `<button class="action-btn restore-btn" title="Restore">&#x21A9;</button>`;
    const revertedClass = isReverted ? " reverted" : "";

    return `
      <div class="file-item${revertedClass}"
        data-session-id="${this._escapeAttr(session.sessionId)}"
        data-file-path="${this._escapeAttr(f.filePath)}"
        data-absolute-path="${this._escapeAttr(f.absolutePath)}"
        data-backup-file-name="${this._escapeAttr(f.backupFileName ?? "")}"
        data-version="${f.version}"
        data-backup-time="${this._escapeAttr(f.backupTime ?? "")}"
        data-mode="${mode}"
        data-next-backup-file-name="${this._escapeAttr(nextBackup ?? "")}">
        <span class="file-icon ${iconClass}">${iconChar}</span>
        <div class="file-main">
          <span class="file-name">${this._escapeHtml(fileName)}</span>
        </div>
        <div class="file-side">
          ${revertedBadge}
          <div class="file-actions">
            ${isReverted ? "" : actionBtn}
          </div>
        </div>
      </div>`;
  }

  private _relativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) { return "Today"; }
    if (isYesterday) { return "Yesterday"; }
    if (diffDays < 7) { return `${diffDays}d ago`; }
    if (diffDays < 30) { return `${Math.floor(diffDays / 7)}w ago`; }
    return `${Math.floor(diffDays / 30)}mo ago`;
  }

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private _escapeAttr(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  private _truncateMiddle(text: string, maxLength: number): string {
    if (text.length <= maxLength || maxLength < 8) {
      return text;
    }

    const visible = maxLength - 3;
    const left = Math.ceil(visible / 2);
    const right = Math.floor(visible / 2);
    return `${text.slice(0, left)}...${text.slice(-right)}`;
  }

  private _revertedKey(sessionId: string, absolutePath: string): string {
    return `${sessionId}::${absolutePath}`;
  }
}
