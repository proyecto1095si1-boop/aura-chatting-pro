const TRANSLATIONS = {
  es: {
    match_title: '¡Es un Match! 🔥',
    match_body: (name) => `Tuviste un match con ${name}`,
    photo: '📷 Foto',
    new_message: 'Nuevo mensaje',
    broadcast_title: 'Novedades en Aura',
    broadcast_body: '¡Tienes una novedad importante! Revisa la app para ver qué hay de nuevo.'
  },
  en: {
    match_title: "It's a Match! 🔥",
    match_body: (name) => `You matched with ${name}`,
    photo: '📷 Photo',
    new_message: 'New message',
    broadcast_title: 'Aura Updates',
    broadcast_body: 'You have an important update! Check the app to see what is new.'
  },
  pt: {
    match_title: 'É um Match! 🔥',
    match_body: (name) => `Você deu match com ${name}`,
    photo: '📷 Foto',
    new_message: 'Nova mensaje',
    broadcast_title: 'Novidades no Aura',
    broadcast_body: 'Você tem uma novidade importante! Verifique o app para ver o que há de novo.'
  },
  de: {
    match_title: 'Es ist ein Match! 🔥',
    match_body: (name) => `Du hast ein Match mit ${name}`,
    photo: '📷 Foto',
    new_message: 'Neue Nachricht',
    broadcast_title: 'Aura-Neuigkeiten',
    broadcast_body: 'Du hast ein wichtiges Update! Schau in der App nach, was es Neues gibt.'
  },
  it: {
    match_title: 'È un Match! 🔥',
    match_body: (name) => `Hai un match con ${name}`,
    photo: '📷 Foto',
    new_message: 'Nuovo messaggio',
    broadcast_title: 'Novità su Aura',
    broadcast_body: 'Hai una novità importante! Controlla l\'app para vedere le novità.'
  }
};

const DOUBLE_DATE_TRANSLATIONS = {
  es: {
    invite_title: '¡Invitación Cita Doble! 👥',
    invite_body: (name) => `${name} quiere buscar parejas con vos`,
    match_title: '¡Match Doble! 🎉👥',
    match_body: '¡Su equipo hizo match con otro equipo! Vayan al chat.'
  },
  en: {
    invite_title: 'Double Date Invite! 👥',
    invite_body: (name) => `${name} wants to look for couples with you`,
    match_title: 'Double Match! 🎉👥',
    match_body: 'Your team matched with another team! Check the chat.'
  },
  pt: {
    invite_title: 'Convite Cita Dupla! 👥',
    invite_body: (name) => `${name} quer procurar casais com você`,
    match_title: 'Match Duplo! 🎉👥',
    match_body: 'Sua equipe deu match com outra equipe! Confira o chat.'
  }
};

module.exports = { TRANSLATIONS, DOUBLE_DATE_TRANSLATIONS };
