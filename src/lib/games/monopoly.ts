import type { GameDefinition, GameState, GameStatus, Move } from './types'

// --- Board Definition ---

export type SpaceType = 'start' | 'property' | 'magic' | 'troll' | 'lucky' | 'rest'

export type BoardSpace = {
  index: number
  name: string
  type: SpaceType
  emoji: string
  // Property-specific
  group?: string
  price?: number
  rent?: number
  upgradedRent?: number
}

export const BOARD: BoardSpace[] = [
  // Bottom row L→R (7 spaces, corners at 0 and 6):
  { index: 0,  name: 'START',      type: 'start',    emoji: '🏁' },
  { index: 1,  name: 'Property',   type: 'property', emoji: '🏠', group: 'group1', price: 2, rent: 1, upgradedRent: 2 },
  { index: 2,  name: 'Property',   type: 'property', emoji: '🏠', group: 'group1', price: 2, rent: 1, upgradedRent: 2 },
  { index: 3,  name: 'Property',   type: 'property', emoji: '🏠', group: 'group1', price: 2, rent: 1, upgradedRent: 2 },
  { index: 4,  name: 'Magic Card', type: 'magic',    emoji: '✨' },
  { index: 5,  name: 'Troll',      type: 'troll',    emoji: '🧌' },
  { index: 6,  name: 'Lucky',      type: 'lucky',    emoji: '🍀' },
  // Right column B→T (5 spaces):
  { index: 7,  name: 'Property',   type: 'property', emoji: '🏠', group: 'group2', price: 3, rent: 1, upgradedRent: 3 },
  { index: 8,  name: 'Property',   type: 'property', emoji: '🏠', group: 'group2', price: 3, rent: 1, upgradedRent: 3 },
  { index: 9,  name: 'Property',   type: 'property', emoji: '🏠', group: 'group2', price: 3, rent: 2, upgradedRent: 4 },
  { index: 10, name: 'Magic Card', type: 'magic',    emoji: '✨' },
  { index: 11, name: 'Rest',       type: 'rest',     emoji: '😴' },
  // Top row R→L (7 spaces, corners at 12 and 18):
  { index: 12, name: 'Lucky',      type: 'lucky',    emoji: '🍀' },
  { index: 13, name: 'Property',   type: 'property', emoji: '🏠', group: 'group3', price: 4, rent: 2, upgradedRent: 4 },
  { index: 14, name: 'Property',   type: 'property', emoji: '🏠', group: 'group3', price: 4, rent: 2, upgradedRent: 4 },
  { index: 15, name: 'Property',   type: 'property', emoji: '🏠', group: 'group3', price: 4, rent: 2, upgradedRent: 5 },
  { index: 16, name: 'Magic Card', type: 'magic',    emoji: '✨' },
  { index: 17, name: 'Troll',      type: 'troll',    emoji: '🧌' },
  { index: 18, name: 'Rest',       type: 'rest',     emoji: '😴' },
  // Left column T→B (5 spaces):
  { index: 19, name: 'Property',   type: 'property', emoji: '🏠', group: 'group4', price: 5, rent: 2, upgradedRent: 5 },
  { index: 20, name: 'Property',   type: 'property', emoji: '🏠', group: 'group4', price: 5, rent: 3, upgradedRent: 6 },
  { index: 21, name: 'Property',   type: 'property', emoji: '🏠', group: 'group4', price: 5, rent: 3, upgradedRent: 6 },
  { index: 22, name: 'Lucky',      type: 'lucky',    emoji: '🍀' },
  { index: 23, name: 'Magic Card', type: 'magic',    emoji: '✨' },
]

// --- Magic Cards ---

export type MagicCard = {
  text: string
  effect: 'coins' | 'move_forward' | 'go_to_start'
  value: number // coins to add/subtract, or spaces to move
}

export const MAGIC_CARDS: MagicCard[] = [
  { text: 'A friendly bunny gives you 3 coins!', effect: 'coins', value: 3 },
  { text: 'You found a shiny coin!', effect: 'coins', value: 2 },
  { text: 'Oh no, a troll stole 2 coins!', effect: 'coins', value: -2 },
  { text: 'A unicorn grants a wish! +4 coins!', effect: 'coins', value: 4 },
  { text: 'A cat shows you a shortcut! Go to Start!', effect: 'go_to_start', value: 0 },
  { text: 'A witch zooms you forward 3 spaces!', effect: 'move_forward', value: 3 },
  { text: 'You help a lost kitten. +1 coin!', effect: 'coins', value: 1 },
  { text: 'Oops! You tripped. Pay 1 coin.', effect: 'coins', value: -1 },
]

// --- Game State ---

export type MonopolyState = GameState & {
  playerOrder: string[]
  currentTurnIndex: number
  currentTurn: string
  positions: Record<string, number>
  coins: Record<string, number>
  properties: Record<number, { owner: string; upgraded: boolean }>
  targetCoins: number
  diceRoll: number | null
  phase: 'roll' | 'buy' | 'upgrade' | 'finished'
  lastEvent: string | null
  magicCardIndex: number | null
  passedStart: boolean
  winner: string | null
}

// --- Helpers ---

const BOARD_SIZE = 24
const START_COINS = 10
const TARGET_COINS = 30
const PASS_START_BONUS = 5
const TROLL_FEE = 2
const LUCKY_COINS = 3

function rollDie(state: MonopolyState): number {
  // Seeded from a simple counter so game is replayable from state
  // In practice the client will override this with actual random
  return (state.diceRoll || 0) // placeholder, actual roll passed via move
}

function nextPlayer(state: MonopolyState): MonopolyState {
  const nextIndex = (state.currentTurnIndex + 1) % state.playerOrder.length
  return {
    ...state,
    currentTurnIndex: nextIndex,
    currentTurn: state.playerOrder[nextIndex],
    phase: 'roll',
    // Keep diceRoll/lastEvent/magicCardIndex for UI display until next roll
  }
}

function checkWinner(state: MonopolyState): MonopolyState {
  for (const pid of state.playerOrder) {
    if (state.coins[pid] >= state.targetCoins) {
      return { ...state, phase: 'finished', winner: pid }
    }
  }
  return state
}

function applySpaceEffect(state: MonopolyState, playerId: string, dieValue: number): MonopolyState {
  const pos = state.positions[playerId]
  const space = BOARD[pos]

  switch (space.type) {
    case 'start':
      // Already collected pass-start bonus if applicable
      return { ...state, lastEvent: 'You landed on START!', phase: 'roll' }

    case 'property': {
      const prop = state.properties[pos]
      if (!prop) {
        // Unowned — offer to buy
        if (state.coins[playerId] >= space.price!) {
          return { ...state, phase: 'buy', lastEvent: `${space.emoji} ${space.name} is available for ${space.price} coins!` }
        } else {
          return { ...state, lastEvent: `${space.emoji} ${space.name} costs ${space.price} coins — you can't afford it!` }
        }
      } else if (prop.owner === playerId) {
        // Own property — offer upgrade
        if (!prop.upgraded && state.coins[playerId] >= space.price!) {
          return { ...state, phase: 'upgrade', lastEvent: `Your ${space.emoji} ${space.name}! Upgrade for ${space.price} coins?` }
        }
        return { ...state, lastEvent: `Your ${space.emoji} ${space.name}! ${prop.upgraded ? '(Upgraded!)' : ''}` }
      } else {
        // Pay rent
        const rent = prop.upgraded ? space.upgradedRent! : space.rent!
        const actualRent = Math.min(rent, state.coins[playerId])
        const newCoins = { ...state.coins }
        newCoins[playerId] -= actualRent
        newCoins[prop.owner] += actualRent
        return {
          ...state,
          coins: newCoins,
          lastEvent: `${space.emoji} Pay ${actualRent} coin${actualRent !== 1 ? 's' : ''} rent!`,
        }
      }
    }

    case 'magic': {
      const cardIndex = dieValue % MAGIC_CARDS.length
      const card = MAGIC_CARDS[cardIndex]
      let s = { ...state, magicCardIndex: cardIndex, lastEvent: `✨ ${card.text}` }

      if (card.effect === 'coins') {
        const newCoins = { ...s.coins }
        newCoins[playerId] = Math.max(0, newCoins[playerId] + card.value)
        s = { ...s, coins: newCoins }
      } else if (card.effect === 'go_to_start') {
        const newPositions = { ...s.positions }
        newPositions[playerId] = 0
        const newCoins = { ...s.coins }
        newCoins[playerId] += PASS_START_BONUS
        s = { ...s, positions: newPositions, coins: newCoins, passedStart: true }
      } else if (card.effect === 'move_forward') {
        const newPositions = { ...s.positions }
        const oldPos = newPositions[playerId]
        const newPos = (oldPos + card.value) % BOARD_SIZE
        newPositions[playerId] = newPos
        // Check if passed start
        const newCoins = { ...s.coins }
        if (newPos < oldPos) {
          newCoins[playerId] += PASS_START_BONUS
          s = { ...s, passedStart: true }
        }
        s = { ...s, positions: newPositions, coins: newCoins }
        // Don't apply the new space effect (keep it simple for kids)
      }
      return s
    }

    case 'troll': {
      const fee = Math.min(TROLL_FEE, state.coins[playerId])
      const newCoins = { ...state.coins }
      newCoins[playerId] -= fee
      return { ...state, coins: newCoins, lastEvent: `🧌 Troll Bridge! Pay ${fee} coin${fee !== 1 ? 's' : ''}.` }
    }

    case 'lucky': {
      const newCoins = { ...state.coins }
      newCoins[playerId] += LUCKY_COINS
      return { ...state, coins: newCoins, lastEvent: `🍀 Lucky Find! You got ${LUCKY_COINS} coins!` }
    }

    case 'rest':
      return { ...state, lastEvent: '😴 Free Rest! Take a breather.' }

    default:
      return state
  }
}

// --- Game Definition ---

export const monopoly: GameDefinition = {
  id: 'monopoly',
  name: 'Magic Land',
  minPlayers: 2,
  maxPlayers: 4,
  adminOnly: true,

  initialState(playerIds: string[]): MonopolyState {
    const positions: Record<string, number> = {}
    const coins: Record<string, number> = {}
    for (const pid of playerIds) {
      positions[pid] = 0
      coins[pid] = START_COINS
    }
    return {
      playerOrder: playerIds,
      currentTurnIndex: 0,
      currentTurn: playerIds[0],
      positions,
      coins,
      properties: {},
      targetCoins: TARGET_COINS,
      diceRoll: null,
      phase: 'roll',
      lastEvent: null,
      magicCardIndex: null,
      passedStart: false,
      winner: null,
    }
  },

  validateMove(state: GameState, playerId: string, move: Move): boolean {
    const s = state as MonopolyState
    if (s.phase === 'finished') return false
    if (s.currentTurn !== playerId) return false

    switch (move.action) {
      case 'roll':
        if (s.phase !== 'roll') return false
        if (typeof move.die !== 'number' || move.die < 1 || move.die > 6) return false
        return true
      case 'buy':
        return s.phase === 'buy'
      case 'skip':
        return s.phase === 'buy' || s.phase === 'upgrade'
      case 'upgrade':
        return s.phase === 'upgrade'
      default:
        return false
    }
  },

  applyMove(state: GameState, playerId: string, move: Move): MonopolyState {
    let s = state as MonopolyState

    switch (move.action) {
      case 'roll': {
        const die = move.die as number
        const oldPos = s.positions[playerId]
        const newPos = (oldPos + die) % BOARD_SIZE
        const passedStart = newPos < oldPos && oldPos !== 0

        const newPositions = { ...s.positions }
        newPositions[playerId] = newPos
        const newCoins = { ...s.coins }
        if (passedStart) {
          newCoins[playerId] += PASS_START_BONUS
        }

        s = {
          ...s,
          positions: newPositions,
          coins: newCoins,
          diceRoll: die,
          passedStart,
        }

        // Apply space effect
        s = applySpaceEffect(s, playerId, die)
        s = checkWinner(s)

        // If phase is still 'roll' (no buy/upgrade prompt), advance turn
        if (s.phase === 'roll' && s.winner === null) {
          s = nextPlayer(s)
        }
        return s
      }

      case 'buy': {
        const pos = s.positions[playerId]
        const space = BOARD[pos]
        const newCoins = { ...s.coins }
        newCoins[playerId] -= space.price!
        const newProps = { ...s.properties }
        newProps[pos] = { owner: playerId, upgraded: false }

        s = { ...s, coins: newCoins, properties: newProps, lastEvent: `Bought ${space.emoji} ${space.name}!` }
        s = checkWinner(s)
        if (s.winner === null) s = nextPlayer(s)
        return s
      }

      case 'upgrade': {
        const pos = s.positions[playerId]
        const space = BOARD[pos]
        const newCoins = { ...s.coins }
        newCoins[playerId] -= space.price!
        const newProps = { ...s.properties }
        newProps[pos] = { ...newProps[pos], upgraded: true }

        s = { ...s, coins: newCoins, properties: newProps, lastEvent: `Upgraded ${space.emoji} ${space.name}!` }
        s = checkWinner(s)
        if (s.winner === null) s = nextPlayer(s)
        return s
      }

      case 'skip': {
        s = { ...s, lastEvent: 'Skipped.' }
        s = checkWinner(s)
        if (s.winner === null) s = nextPlayer(s)
        return s
      }

      default:
        return s
    }
  },

  getStatus(state: GameState): GameStatus {
    const s = state as MonopolyState
    const scores: Record<string, number> = {}
    for (const pid of s.playerOrder) {
      scores[pid] = s.coins[pid]
    }
    return {
      finished: s.phase === 'finished',
      winner: s.winner || undefined,
      scores,
    }
  },

  getNextPlayer(state: GameState): string {
    return (state as MonopolyState).currentTurn
  },
}
