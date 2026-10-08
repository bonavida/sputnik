/** Reference dictionary: every key here must exist in the other languages */
export const es = {
  appName: 'Sputnik',

  // Player
  play: 'Reproducir',
  pause: 'Pausar',
  next: 'Siguiente',
  previous: 'Anterior',
  shuffle: 'Aleatorio',
  repeatOff: 'Repetir: desactivado',
  repeatAll: 'Repetir: toda la lista',
  repeatOne: 'Repetir: esta canción',
  mute: 'Silenciar',
  unmute: 'Activar sonido',
  volume: 'Volumen',
  position: 'Posición',
  timeOf: '{current} de {total}',

  // Now playing
  nothingPlaying: 'Nada sonando',
  nothingPlayingHint: 'Elige una canción de la lista',
  unknownArtist: 'Artista desconocido',
  unknownAlbum: 'Álbum desconocido',

  // Queue
  playlist: 'Lista de reproducción',
  columnNumber: '#',
  columnTitle: 'Título',
  columnAlbum: 'Álbum',
  columnDuration: 'Duración',
  sortBy: 'Ordenar por {column}',
  sortAscending: 'ascendente',
  sortDescending: 'descendente',
  showInFolder: 'Mostrar en la carpeta',
  emptyTitle: 'Tu lista está vacía',
  emptyBody: 'Arrastra canciones o carpetas aquí, o añádelas desde tu equipo.',
  dropHere: 'Suelta para añadir',
  add: 'Añadir',
  addSongs: 'Añadir canciones',
  addFolder: 'Añadir carpeta',
  adding: 'Añadiendo…',
  remove: 'Quitar de la lista',
  unplayable: 'No se puede reproducir',
  nowPlaying: 'Sonando',
  nowPaused: 'En pausa',
  tracks_one: '{count} canción',
  tracks_other: '{count} canciones',
  failedFiles_one: 'No se pudo añadir {count} archivo',
  failedFiles_other: 'No se pudieron añadir {count} archivos',
  missingTracks_one: 'Falta {count} canción de esta lista',
  missingTracks_other: 'Faltan {count} canciones de esta lista',
  reasonUnsupported: 'formato no compatible',
  reasonUnreadable: 'archivo dañado o ilegible',
  reasonMissing: 'ya no existe',
  showDetails: 'Ver detalles',
  hideDetails: 'Ocultar detalles',
  dismiss: 'Cerrar',
  audioFiles: 'Archivos de audio',

  // Last.fm
  lastfm: 'Last.fm',
  lastfmConnect: 'Conectar con Last.fm',
  lastfmWaiting: 'Autoriza Sputnik en el navegador…',
  lastfmCancel: 'Cancelar conexión',
  lastfmConnectedAs: 'Conectado como {user}',
  lastfmScrobbling: 'Hacer scrobbling',
  lastfmPending_one: '{count} scrobble pendiente de enviar',
  lastfmPending_other: '{count} scrobbles pendientes de enviar',
  lastfmDisconnect: 'Desconectar',
  lastfmConnected: 'Conectado a Last.fm como {user}',
  lastfmTimedOut:
    'No se completó la autorización en Last.fm a tiempo. Vuelve a intentarlo.',
  lastfmFailed:
    'No se pudo conectar con Last.fm. Comprueba tu conexión a internet.',

  // Updates
  updates: 'Actualizaciones',
  currentVersion: 'Versión {version}',
  checkAutomatically: 'Buscar automáticamente',
  checkNow: 'Buscar actualizaciones ahora',
  checkingUpdates: 'Buscando actualizaciones…',
  updateAvailable: 'Sputnik {version} está disponible',
  updateDownloading: 'Descargando Sputnik {version} ({size})…',
  updateInstall: 'Descargar e instalar',
  updateDownload: 'Descargar',
  updateNotes: 'Novedades',
  updateSkip: 'Omitir esta versión',
  upToDate: 'Tienes la última versión ({version})',
  updateCheckFailed:
    'No se pudo comprobar si hay actualizaciones. Comprueba tu conexión a internet.',
  updateInstallFailed:
    'No se pudo descargar la actualización. Inténtalo de nuevo más tarde.',
  updateVerificationFailed:
    'La descarga no coincide con la publicada y se ha descartado por seguridad.',

  // Playlists
  untitled: 'Nueva lista',
  playlistName: 'Nombre de la lista',
  rename: 'Renombrar',
  save: 'Guardar',
  saveCopy: 'Guardar como copia',
  copyOf: '{name} (copia)',
  unsavedChanges: 'Cambios sin guardar',
  playlists: 'Listas',
  savedPlaylists: 'Listas guardadas',
  noSavedPlaylists: 'Aún no has guardado ninguna lista.',
  newPlaylist: 'Nueva lista',
  exportPlaylist: 'Exportar lista…',
  importPlaylist: 'Importar lista…',
  m3uFiles: 'Listas M3U',
  deletePlaylist: 'Borrar lista',
  discardTitle: '¿Descartar los cambios?',
  discardBody: '«{name}» tiene cambios sin guardar.',
  discard: 'Descartar',
  cancel: 'Cancelar',
  deleteTitle: '¿Borrar «{name}»?',
  deleteBody: 'Las canciones no se borran de tu equipo.',
  delete: 'Borrar',
  exported: 'Lista exportada',

  // Settings
  settings: 'Ajustes',
  theme: 'Tema',
  themeSystem: 'Sistema',
  themeLight: 'Claro',
  themeDark: 'Oscuro',
  coverColor: 'Color de la portada',
  language: 'Idioma',
  languageSystem: 'Sistema',
  languageEs: 'Español',
  languageEn: 'English',

  // Errors
  errorTitle: 'Algo ha fallado',
  errorBody:
    'Recarga la ventana para seguir escuchando. Tu lista está guardada.',
  reload: 'Recargar',
} as const;

export type MessageKey = keyof typeof es;
export type Messages = Record<MessageKey, string>;
