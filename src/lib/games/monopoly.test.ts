import { describe, it, expect } from 'vitest'
import { monopoly, BOARD, MAGIC_CARDS, type MonopolyState } from './monopoly'

describe('Magic Land (Junior Monopoly)', () => {
  const players = ['alice', 'bob']

  describe('board layout', () => {
    it('has 24 spaces', () => {
      expect(BOARD.length).toBe(24)
    })
    it('starts with START', () => {
      expect(BOARD[0].type).toBe('start')
    })
    it('has 12 properties in 4 groups', () => {
      const props = BOARD.filter(s => s.type === 'property')
      expect(props.length).toBe(12)
      const groups = new Set(props.map(p => p.group))
      expect(groups.size).toBe(4)
      expect(groups).toContain('group1')
      expect(groups).toContain('group2')
      expect(groups).toContain('group3')
      expect(groups).toContain('group4')
    })
    it('has 3 properties per group', () => {
      for (const group of ['group1', 'group2', 'group3', 'group4']) {
        const count = BOARD.filter(s => s.group === group).length
        expect(count).toBe(3)
      }
    })
  })

  describe('initialState', () => {
    it('creates state with all players at start with 10 coins', () => {
      const state = monopoly.initialState(players) as MonopolyState
      expect(state.playerOrder).toEqual(['alice', 'bob'])
      expect(state.currentTurn).toBe('alice')
      expect(state.positions).toEqual({ alice: 0, bob: 0 })
      expect(state.coins).toEqual({ alice: 10, bob: 10 })
      expect(state.properties).toEqual({})
      expect(state.phase).toBe('roll')
      expect(state.targetCoins).toBe(30)
    })

    it('supports 3-4 players', () => {
      const state = monopoly.initialState(['a', 'b', 'c', 'd']) as MonopolyState
      expect(state.playerOrder.length).toBe(4)
      expect(Object.keys(state.coins).length).toBe(4)
    })
  })

  describe('validateMove', () => {
    it('allows roll during roll phase', () => {
      const state = monopoly.initialState(players)
      expect(monopoly.validateMove(state, 'alice', { action: 'roll', die: 3 })).toBe(true)
    })

    it('rejects roll with invalid die value', () => {
      const state = monopoly.initialState(players)
      expect(monopoly.validateMove(state, 'alice', { action: 'roll', die: 0 })).toBe(false)
      expect(monopoly.validateMove(state, 'alice', { action: 'roll', die: 7 })).toBe(false)
    })

    it('rejects move from wrong player', () => {
      const state = monopoly.initialState(players)
      expect(monopoly.validateMove(state, 'bob', { action: 'roll', die: 3 })).toBe(false)
    })

    it('rejects buy during roll phase', () => {
      const state = monopoly.initialState(players)
      expect(monopoly.validateMove(state, 'alice', { action: 'buy' })).toBe(false)
    })
  })

  describe('rolling and movement', () => {
    it('moves player and switches turn for non-property spaces', () => {
      const state = monopoly.initialState(players) as MonopolyState
      // Roll 5 → lands on space 5 (Troll Bridge)
      const next = monopoly.applyMove(state, 'alice', { action: 'roll', die: 5 }) as MonopolyState
      expect(next.positions.alice).toBe(5)
      expect(next.diceRoll).toBe(5)
      // Troll bridge costs 2 coins
      expect(next.coins.alice).toBe(8)
      // Turn passed to bob
      expect(next.currentTurn).toBe('bob')
    })

    it('gives pass-start bonus when crossing start', () => {
      let state = monopoly.initialState(players) as MonopolyState
      // Place alice near end of board
      state = { ...state, positions: { ...state.positions, alice: 22 } }
      const next = monopoly.applyMove(state, 'alice', { action: 'roll', die: 4 }) as MonopolyState
      // 22 + 4 = 26 % 24 = 2, passed start
      expect(next.positions.alice).toBe(2)
      // Got 5 bonus coins from passing start
      expect(next.coins.alice).toBe(15) // 10 + 5 = 15 (then buy prompt on property)
      expect(next.passedStart).toBe(true)
    })
  })

  describe('property buying', () => {
    it('offers buy when landing on unowned property', () => {
      const state = monopoly.initialState(players) as MonopolyState
      // Roll 1 → space 1 (Bunny Burrow, price 2)
      const next = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      expect(next.positions.alice).toBe(1)
      expect(next.phase).toBe('buy')
      expect(next.currentTurn).toBe('alice') // still alice's turn
    })

    it('allows buying a property', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      expect(state.phase).toBe('buy')

      state = monopoly.applyMove(state, 'alice', { action: 'buy' }) as MonopolyState
      expect(state.properties[1]).toEqual({ owner: 'alice', upgraded: false })
      expect(state.coins.alice).toBe(8) // 10 - 2
      expect(state.currentTurn).toBe('bob') // turn passed
    })

    it('allows skipping a purchase', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      state = monopoly.applyMove(state, 'alice', { action: 'skip' }) as MonopolyState
      expect(state.properties[1]).toBeUndefined()
      expect(state.coins.alice).toBe(10) // unchanged
      expect(state.currentTurn).toBe('bob')
    })

    it('skips buy prompt when player cannot afford property', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = { ...state, coins: { ...state.coins, alice: 1 } }
      // Roll to property costing 2
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      // Can't afford → turn passes
      expect(state.phase).toBe('roll') // auto-skipped, next player's roll phase
      expect(state.currentTurn).toBe('bob')
    })
  })

  describe('rent', () => {
    it('charges rent when landing on another player\'s property', () => {
      let state = monopoly.initialState(players) as MonopolyState
      // Alice buys space 1 (Bunny Burrow, rent 1)
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      state = monopoly.applyMove(state, 'alice', { action: 'buy' }) as MonopolyState
      // Bob rolls 1 → lands on alice's property
      state = monopoly.applyMove(state, 'bob', { action: 'roll', die: 1 }) as MonopolyState
      expect(state.coins.bob).toBe(9) // 10 - 1 rent
      expect(state.coins.alice).toBe(9) // 8 + 1 rent
    })

    it('charges upgraded rent', () => {
      let state = monopoly.initialState(players) as MonopolyState
      // Alice owns and upgrades space 1
      state.properties[1] = { owner: 'alice', upgraded: true }
      state.coins.alice = 8
      // Bob lands on it
      state = monopoly.applyMove(state, 'bob', { action: 'roll', die: 1 }) as MonopolyState
      // Wait, bob isn't current player. Fix: alice needs to roll first, then bob
      // Let me redo this properly
      state = monopoly.initialState(players) as MonopolyState
      state = {
        ...state,
        properties: { 1: { owner: 'alice', upgraded: true } },
        currentTurnIndex: 1,
        currentTurn: 'bob',
      }
      state = monopoly.applyMove(state, 'bob', { action: 'roll', die: 1 }) as MonopolyState
      // Upgraded rent for Bunny Burrow = 2
      expect(state.coins.bob).toBe(8) // 10 - 2
      expect(state.coins.alice).toBe(12) // 10 + 2
    })
  })

  describe('property upgrade', () => {
    it('offers upgrade when landing on own non-upgraded property', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = {
        ...state,
        properties: { 1: { owner: 'alice', upgraded: false } },
      }
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      expect(state.phase).toBe('upgrade')
    })

    it('allows upgrading a property', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = {
        ...state,
        properties: { 1: { owner: 'alice', upgraded: false } },
      }
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      state = monopoly.applyMove(state, 'alice', { action: 'upgrade' }) as MonopolyState
      expect(state.properties[1].upgraded).toBe(true)
      expect(state.coins.alice).toBe(8) // 10 - 2 (Bunny Burrow price)
    })

    it('does not offer upgrade on already upgraded property', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = {
        ...state,
        properties: { 1: { owner: 'alice', upgraded: true } },
      }
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      // No upgrade prompt, turn passes
      expect(state.currentTurn).toBe('bob')
    })
  })

  describe('special spaces', () => {
    it('troll bridge costs 2 coins', () => {
      const state = monopoly.initialState(players) as MonopolyState
      // Space 5 is Troll Bridge
      const next = monopoly.applyMove(state, 'alice', { action: 'roll', die: 5 }) as MonopolyState
      expect(next.coins.alice).toBe(8)
    })

    it('lucky find gives 3 coins', () => {
      const state = monopoly.initialState(players) as MonopolyState
      // Space 6 is Lucky Find
      const next = monopoly.applyMove(state, 'alice', { action: 'roll', die: 6 }) as MonopolyState
      expect(next.coins.alice).toBe(13)
    })

    it('free rest does nothing', () => {
      let state = monopoly.initialState(players) as MonopolyState
      // Space 11 is Free Rest, need to get there
      state = { ...state, positions: { ...state.positions, alice: 5 } }
      const next = monopoly.applyMove(state, 'alice', { action: 'roll', die: 6 }) as MonopolyState
      expect(next.coins.alice).toBe(10) // unchanged
    })

    it('magic card applies effect', () => {
      const state = monopoly.initialState(players) as MonopolyState
      // Space 4 is Magic Card. Die=4, card index = 4%8 = 4 (go to start)
      const next = monopoly.applyMove(state, 'alice', { action: 'roll', die: 4 }) as MonopolyState
      expect(next.magicCardIndex).toBe(4)
      // Card 4 = "go to start" + 5 bonus
      expect(next.positions.alice).toBe(0)
      expect(next.coins.alice).toBe(15) // 10 + 5
    })
  })

  describe('winning', () => {
    it('first player to reach target coins wins', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = { ...state, coins: { alice: 27, bob: 10 } }
      // Lucky find gives 3 → alice reaches 30
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 6 }) as MonopolyState
      expect(state.phase).toBe('finished')
      expect(state.winner).toBe('alice')
      const status = monopoly.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBe('alice')
    })

    it('game not finished when below target', () => {
      const state = monopoly.initialState(players)
      const status = monopoly.getStatus(state)
      expect(status.finished).toBe(false)
      expect(status.scores).toEqual({ alice: 10, bob: 10 })
    })

    it('rejects moves after game is finished', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = { ...state, phase: 'finished', winner: 'alice' }
      expect(monopoly.validateMove(state, 'alice', { action: 'roll', die: 3 })).toBe(false)
    })
  })

  describe('turn rotation', () => {
    it('rotates through players', () => {
      const threePlayers = ['alice', 'bob', 'charlie']
      let state = monopoly.initialState(threePlayers) as MonopolyState
      expect(state.currentTurn).toBe('alice')

      // Alice rolls to troll bridge (auto-ends turn)
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 5 }) as MonopolyState
      expect(state.currentTurn).toBe('bob')

      state = monopoly.applyMove(state, 'bob', { action: 'roll', die: 5 }) as MonopolyState
      expect(state.currentTurn).toBe('charlie')

      state = monopoly.applyMove(state, 'charlie', { action: 'roll', die: 5 }) as MonopolyState
      expect(state.currentTurn).toBe('alice')
    })
  })

  describe('coins cannot go negative', () => {
    it('troll fee is capped at available coins', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = { ...state, coins: { ...state.coins, alice: 1 } }
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 5 }) as MonopolyState
      expect(state.coins.alice).toBe(0) // not negative
    })

    it('rent is capped at available coins', () => {
      let state = monopoly.initialState(players) as MonopolyState
      state = {
        ...state,
        coins: { alice: 0, bob: 10 },
        properties: { 1: { owner: 'bob', upgraded: true } }, // rent = 2
        currentTurnIndex: 0,
        currentTurn: 'alice',
      }
      state = monopoly.applyMove(state, 'alice', { action: 'roll', die: 1 }) as MonopolyState
      expect(state.coins.alice).toBe(0) // can't go below 0
    })
  })

  describe('getStatus', () => {
    it('returns scores for all players', () => {
      let state = monopoly.initialState(['a', 'b', 'c']) as MonopolyState
      state = { ...state, coins: { a: 15, b: 20, c: 5 } }
      const status = monopoly.getStatus(state)
      expect(status.scores).toEqual({ a: 15, b: 20, c: 5 })
    })
  })
})
