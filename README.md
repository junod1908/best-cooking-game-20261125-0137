# Char & Chive

![best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)
![rank](https://make.fun/badge/best-cooking-game-20261125-0137/junod1908/best-cooking-game-20261125-0137/rank.svg)
![reward](https://make.fun/badge/best-cooking-game-20261125-0137/junod1908/best-cooking-game-20261125-0137/reward.svg)

A one-chef kitchen dash for the [best-cooking-game-20261125-0137 bounty](https://make.fun/bounty/best-cooking-game-20261125-0137).

You are the only cook in **Char & Chive**, a tiny kitchen with one chopping board
pair, two stoves, two plates and a serving window — and a board full of orders
that will not wait. Every dish is a chain of **timing windows**: chop on the
board and press E inside the green band for a PERFECT chop; cook on the stove
and grab the pan inside the golden band for a PERFECT flip. Perfect preps build
your combo, and the combo multiplies every tip. Serve 450 coins before the
3-minute shift ends. Rush hour strikes in the last minute: orders come faster,
patience runs shorter, and one burnt pan or one walked-out order can end the
shift.

## How to play

- **Move:** WASD / arrow keys, or click the floor to walk there (click a station to walk over and use it)
- **Interact:** `E` or Space — take an ingredient, place it, chop, flip a pan, add to a plate, serve
- **Chop:** drop tomato or lettuce on a board, press E when the needle is in the green band (perfect = double progress + combo)
- **Cook:** drop patty or pasta on a stove, press E inside the golden band on the ring (perfect = bonus + combo); leave it past the ring and it burns — bin it
- **Plate:** add prepared ingredients to a plate; the plate shows its fraction (2/3) and lights up READY TO SERVE when it matches an order
- **Serve:** carry a finished plate to the SERVE window and press E — early serves pay a patience bonus
- **Orders:** each ticket shows the recipe's steps (CHOP / PAN / FRESH) with a green tick as each ingredient is staged, plus a patience bar — an order that runs out costs a heart
- **Win:** bank 450 coins before the shift timer ends · **Lose:** 3 hearts lost, or the shift ends short of 450
- **Pause:** `P` or Esc · **Mute:** `M` · **Start / restart:** Space

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

Taken from the game's own code in headless Chrome (`shots.json` lists the
`?shot=` presets): the rush-hour cover, a perfect chop, the dinner rush, and
the end of a shift.
