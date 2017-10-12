# SimpleChessBoard

**Simple chess FEN/PGN viewer with evaluation

## What it does ##

Open and analyze any chess position using FEN or PGN directly in your browser.

Features:

* setup position setup using FEN or PGN
* setup pieces manually with your mouse
* browse game history
* detect and visualize all legal moves
* detect checkmate or stalemate
* analyze position with javascript version of Stockfish ([stockfish.js](https://github.com/niklasf/stockfish.js))

When the user inserts position quick evaluation for all legal moves is calculated.
The user can setup position manually or by loading from FEN or PGN.
When moving pieces on board legal moves and calculated evaluation is shown in a
list next to the chessboard and directly on the chessboard.

## Commands ##

* [FEN of chess position] - load individual chess position
* [PGN of chess game] - load chess game
* "reset" - load initial chess position
* "sidetomove" - swap side to move (black/white)
* "colorflip" - flip chessboard and colors
* "depth [N]" - set engine analysis depth to [N] (default [N]=10)

### Thanks

- <a href="https://github.com/official-stockfish/Stockfish">The Stockfish team</a>
- <a href="https://github.com/exoticorn/stockfish-js">exoticorn</a>
- <a href="https://github.com/nmrugg/stockfish.js">nmrugg</a>
- <a href="https://github.com/niklasf/stockfish.js">niklasf</a>

### License

GPLv3 (see <a href="https://raw.githubusercontent.com/hxim/simplechessboard/master/license.txt">license.txt</a>)