/** Canonical IPC channel names shared by main + preload. */
export const IPC = {
  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Vault
  VAULT_PICK_FOLDER: 'vault:pickFolder',
  VAULT_OPEN: 'vault:open',
  VAULT_CREATE: 'vault:create',
  VAULT_CURRENT: 'vault:current',
  VAULT_STRUCTURE: 'vault:structure',
  VAULT_SEED_DEMO: 'vault:seedDemo',
  VAULT_REVEAL: 'vault:reveal',

  // Content
  CONTENT_LIST: 'content:list',
  CONTENT_GET: 'content:get',
  CONTENT_SAVE: 'content:save',
  CONTENT_DELETE: 'content:delete',
  CONTENT_EXPORT: 'content:export',
  CONTENT_IMPORT: 'content:import',
  CONTENT_IMPORT_BUILD_JSON: 'content:importBuildJson',
  CONTENT_TOGGLE_FAVORITE: 'content:toggleFavorite',

  // Tags
  TAGS_ALL: 'tags:all',

  // Images
  IMAGE_PICK_AND_ADD: 'image:pickAndAdd',
  IMAGE_DATA_URL: 'image:dataUrl',
  IMAGE_LIST: 'image:list',
  IMAGE_DELETE: 'image:delete',

  // Git
  GIT_STATUS: 'git:status',
  GIT_INIT: 'git:init',
  GIT_SET_REMOTE: 'git:setRemote',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',
  GIT_SAVE_ALL: 'git:saveAll',
  GIT_LOG: 'git:log',
  GIT_SYNC_LOG: 'git:syncLog',

  // Skill tree
  TREE_RESOLVE: 'tree:resolve',
  TREE_AVAILABLE: 'tree:available',

  // Misc
  OPEN_EXTERNAL: 'shell:openExternal'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
