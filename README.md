# SimpleChessBoard

**Simple chess FEN/PGN viewer with evaluation

## What it does ##

SimpleChessBoard is simple chess position and game analysis tool available as browser
extension for Mozilla Firefox, Google Chrome and as a web page at https://hxim.github.io/simplechessboard/popup/simplechessboard.html.

Features:

* Load your chess position or game using FEN or PGN.
* Setup pieces manually with your mouse in edit mode.
* You can browse game history and try out different variations. Arrow is showing last move and move recomennded by engine.
* List all legal moves and show them on chessboard
* Checkmate or stalemate is detected
* Analyze position and all legal moves with javascript version of Stockfish from https://github.com/niklasf/stockfish.js
* Show evaluation graph and visalize mistakes or blunders with different colors
* Open position or game in new window via URL. You can also share this URL with friends (in online version) and your position or entire game will be encoded in the link.
* You can also play chess against computer

Copy your FEN or PGN to clipboard and paste it in the input box at the top. You can also manually
edit and change FEN displayed there. This tool also supports entering games as list of moves in
simplified format like this: "1. e4 e5 2. Nf3 Nf6 3. d4". You have several options to make legal moves on board -
Click on move in list of all legal moves in the right or move piece with mouse using drag and drop or select piece and then
click on destination square. This is useful on touchscreen.

Note: To add, remove pieces or make illegal moves you need to use edit mode (see below). 

## Buttons and main menu ##

* Go back to previous position
* Go forward to next position
* Refresh engine evaluation for current position
* Revert changes to loaded or saved game (go back to original game after trying some variation)
* Keep changes so that next revert changes return to current state (also available with CTRL+Click on Revert)
* Open in new window where current game or position is encoded as part of URL (useful to save game for later or share with someone)
* Edit mode where you can setup position (add, remove pieces, illegal moves)
* Information about played moves
* Open main menu
* Start game against computer (use CTRL to play as black)
* Flip board (in main menu and also available as button in bottom right corner of chessboard)
* Change side to move (in main menu and also available as button in top right corner of chessboard)


## Download links and on-line URL ##

- <a href="https://addons.mozilla.org/cs/firefox/addon/simplechessboard/">Mozilla Firefox extension</a>
- <a href="https://chrome.google.com/webstore/detail/simplechessboard/hppnfmeaoiochhjdlojgflkfedncdokl">Google Chrome extension</a>
- <a href="https://hxim.github.io/simplechessboard/popup/simplechessboard.html">On-line version</a>
- <a href="https://github.com/hxim/simplechessboard">Source code</a>

### Thanks

- <a href="https://github.com/official-stockfish/Stockfish">The Stockfish team</a>
- <a href="https://github.com/exoticorn/stockfish-js">exoticorn</a>
- <a href="https://github.com/nmrugg/stockfish.js">nmrugg</a>
- <a href="https://github.com/niklasf/stockfish.js">niklasf</a>

### License

GPLv3 (see <a href="https://raw.githubusercontent.com/hxim/simplechessboard/master/license.txt">license.txt</a>)
