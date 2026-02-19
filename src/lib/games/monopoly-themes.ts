// Theme definitions for Monopoly board
// Each theme provides visual overrides (names, emojis, colors) on top of the mechanical BOARD data.

export type PropertyGroupTheme = {
  name: string
  bg: string
  bar: string
  text: string
}

export type SpaceTheme = {
  name: string
  emoji: string
}

export type MonopolyTheme = {
  id: string
  label: string
  emoji: string
  centerLabel: string
  groups: Record<string, PropertyGroupTheme>
  spaces: Record<number, SpaceTheme>
  specialEmojis: {
    start: string
    magic: string
    troll: string
    lucky: string
    rest: string
  }
}

export const THEMES: Record<string, MonopolyTheme> = {
  park: {
    id: 'park',
    label: 'Park',
    emoji: '🌳',
    centerLabel: 'Animal\nPark',
    groups: {
      group1: { name: 'Bunny',    bg: '#fce4ec', bar: '#e91e63', text: '#880e4f' },
      group2: { name: 'Duckling', bg: '#fff8e1', bar: '#f9a825', text: '#e65100' },
      group3: { name: 'Puppy',    bg: '#e3f2fd', bar: '#2196f3', text: '#0d47a1' },
      group4: { name: 'Kitten',   bg: '#e8f5e9', bar: '#2e7d32', text: '#1b5e20' },
    },
    spaces: {
      1:  { name: 'Bunny Burrow',     emoji: '🐰' },
      2:  { name: 'Bunny Garden',     emoji: '🐇' },
      3:  { name: 'Bunny Meadow',     emoji: '🌸' },
      7:  { name: 'Duck Pond',        emoji: '🦆' },
      8:  { name: 'Duck Nest',        emoji: '🐥' },
      9:  { name: 'Duck Lake',        emoji: '💧' },
      13: { name: 'Puppy Park',       emoji: '🐶' },
      14: { name: 'Puppy Trail',      emoji: '🐕' },
      15: { name: 'Puppy Field',      emoji: '🦴' },
      19: { name: 'Kitten Garden',    emoji: '🐱' },
      20: { name: 'Kitten Treehouse', emoji: '🐈' },
      21: { name: 'Kitten Alley',     emoji: '🧶' },
    },
    specialEmojis: {
      start: '🏁',
      magic: '✨',
      troll: '🧌',
      lucky: '🍀',
      rest: '😴',
    },
  },
  magic: {
    id: 'magic',
    label: 'Magic',
    emoji: '🔮',
    centerLabel: 'Magic\nSchool',
    groups: {
      group1: { name: 'Potion',  bg: '#fce4ec', bar: '#e91e63', text: '#880e4f' },
      group2: { name: 'Spell',   bg: '#ede7f6', bar: '#7c3aed', text: '#4a148c' },
      group3: { name: 'Wand',    bg: '#e3f2fd', bar: '#2196f3', text: '#0d47a1' },
      group4: { name: 'Crystal', bg: '#f3e5f5', bar: '#8e24aa', text: '#4a148c' },
    },
    spaces: {
      1:  { name: 'Potion Lab',      emoji: '🧪' },
      2:  { name: 'Potion Cellar',   emoji: '⚗️' },
      3:  { name: 'Potion Garden',   emoji: '🫧' },
      7:  { name: 'Spell Library',   emoji: '📚' },
      8:  { name: 'Spell Tower',     emoji: '🔮' },
      9:  { name: 'Spell Hall',      emoji: '✨' },
      13: { name: 'Wand Workshop',   emoji: '🪄' },
      14: { name: 'Wand Forest',     emoji: '⚡' },
      15: { name: 'Wand Academy',    emoji: '🌟' },
      19: { name: 'Crystal Cave',    emoji: '💎' },
      20: { name: 'Crystal Mine',    emoji: '🔮' },
      21: { name: 'Crystal Peak',    emoji: '💜' },
    },
    specialEmojis: {
      start: '🏰',
      magic: '🃏',
      troll: '👻',
      lucky: '🌙',
      rest: '💤',
    },
  },
}

export const DEFAULT_THEME = 'park'
export const THEME_IDS = Object.keys(THEMES)
