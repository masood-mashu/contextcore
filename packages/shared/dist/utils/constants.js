"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_WATCH_INTERVAL_MS = exports.ENGINE_INTERVAL_MS = exports.COMMUNICATION_APPS = exports.DISTRACTION_APPS = exports.DEEP_WORK_APPS = exports.API_BASE_URL = exports.API_PORT = void 0;
exports.API_PORT = 7337;
exports.API_BASE_URL = `http://127.0.0.1:${exports.API_PORT}`;
exports.DEEP_WORK_APPS = [
    'code', 'vscode', 'cursor', 'vim', 'nvim',
    'intellij', 'pycharm', 'webstorm', 'xcode',
    'terminal', 'iterm', 'warp', 'figma',
    'notion', 'obsidian', 'jupyter'
];
exports.DISTRACTION_APPS = [
    'twitter', 'instagram', 'facebook', 'reddit',
    'youtube', 'netflix', 'tiktok'
];
exports.COMMUNICATION_APPS = [
    'slack', 'teams', 'zoom', 'meet',
    'gmail', 'outlook', 'mail', 'discord'
];
exports.ENGINE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
exports.APP_WATCH_INTERVAL_MS = 30 * 1000; // 30 seconds
//# sourceMappingURL=constants.js.map