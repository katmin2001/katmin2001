// Everything the comic says about you lives here. Edit, then `npm run build` (or let the daily Action do it).
export default {
  login: 'katmin2001',
  name: 'Đức Anh Trần Nguyễn',
  alias: 'KATMIN',
  issue: '2001',
  bubble: ['DARK BRUH', 'LMAO :D'],
  role: 'Dev @ VTI',
  location: 'Vietnam',
  links: {
    facebook: { url: 'https://www.facebook.com/kenzy.mine/', handle: 'kenzy.mine' },
  },

  chapters: [
    { file: 'ch-01-origin', no: '01', title: 'Origin Story', vi: 'Nguồn gốc', sfx: 'WHOOSH!', color: 'cyan' },
    { file: 'ch-02-powers', no: '02', title: 'Super Powers', vi: 'Siêu năng lực', sfx: 'ZAP!', color: 'yellow' },
    { file: 'ch-03-missions', no: '03', title: 'Latest Missions', vi: 'Nhiệm vụ mới', sfx: 'BOOM!', color: 'red' },
    { file: 'ch-04-power-level', no: '04', title: 'Power Level', vi: 'Chỉ số sức mạnh', sfx: "IT'S OVER 9000?!", color: 'pink' },
    { file: 'ch-05-signal', no: '05', title: 'Send a Signal', vi: 'Liên lạc', sfx: 'PING!', color: 'green' },
  ],

  // Four panels of the origin strip.
  origin: {
    day: 'By day: dev @ VTI, slinging Java & Spring Boot.',
    night: 'After dark: AI voice tools, Chrome extensions & games.',
    mission: 'Ship cool stuff, one commit at a time.',
  },

  powers: [
    { label: 'Main weapons', items: [['Java', 'red'], ['Spring Boot', 'green'], ['JavaScript', 'yellow'], ['Vue.js', 'teal']] },
    { label: 'Sidekick skills', items: [['Python', 'blue'], ['Odoo', 'purple'], ['C++', 'navy'], ['HTML / CSS', 'orange'], ['Git', 'red']] },
    { label: 'Secret techniques', items: [['Chrome Extensions', 'yellow'], ['AI Agents', 'pink'], ['Canvas Games', 'cyan'], ['PowerShell', 'navy']] },
  ],

  missions: [
    {
      repo: 'Markstoria',
      title: 'Markstoria',
      color: 'yellow',
      sfx: 'SNAP!',
      desc: 'Chrome extension to search, filter, tag & organize bookmarks: fuzzy search, duplicate finder, broken-link checker, workspaces.',
      tags: ['JavaScript', 'Chrome MV3'],
    },
    {
      repo: 'omnivoice-studio',
      title: 'OmniVoice Studio',
      color: 'pink',
      sfx: 'VWOOM!',
      desc: 'Local web studio for OmniVoice TTS: clone a voice from 3–10 s of audio, Whisper proofreading. Runs on your GPU, nothing leaves home.',
      tags: ['Python', 'JavaScript', 'AI · TTS'],
    },
    {
      repo: 'flappy-bird',
      title: 'Flappy Bird',
      color: 'cyan',
      sfx: 'FLAP!',
      desc: 'Flappy Bird in pure HTML5 Canvas + JavaScript: parallax clouds, Web Audio sound effects, high scores. Zero frameworks.',
      tags: ['JavaScript', 'Canvas'],
    },
    {
      repo: 'kenzy_agent_ai_template',
      title: 'Agent AI Template',
      color: 'green',
      sfx: 'BEEP!',
      desc: 'Codex multi-agent template: project memory, role-based agents and short commands instead of long prompts. Fewer tokens, more done.',
      tags: ['Codex', 'AI Agents', 'PowerShell'],
    },
  ],

  // Languages left out of the "favorite weapons" chart (generated or vendored code).
  ignoreLanguages: [],
};
