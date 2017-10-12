var _engine, _depth = 10, _curmoves = [];
var _history = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"], _historyindex = 0;
var _dragElement = null, _dragActive = false, _startX, _startY, _dragCtrl;
var _dblClickTimer;

function command(text) {
  if (text.split("/").length == 8 && text.split(".").length == 1) {
    pos = parseFEN(text);
    document.getElementById('fen').innerHTML = generateFEN(pos);
    _history = [document.getElementById('fen').innerHTML]; _historyindex = 0;
    historyMove(0);
  } else if (text.split(".").length > 1) {
    text = " " + text.replace(/\./g," ").replace(/(\[FEN [^\]]+\])+?/g, function ($0, $1) { return $1.replace(/\[|\]|"/g,"").replace(/\s/g,"."); });
    text = text.replace(/\[Event /g, "* [Event ").replace(/\s(\[[^\]]+\])+?/g, "").replace(/(\{[^\}]+\})+?/g, "");
    var r = /(\([^\(\)]+\))+?/g; while (r.test(text)) text = text.replace(r, "");
    text = text.replace(/0-0-0/g, "O-O-O").replace(/0-0/g, "O-O").replace(/(1\-0|0\-1|1\/2\-1\/2)/g," * ")
               .replace(/\s\d+/g, " ").replace(/\$\d+/g, "").replace(/\?/g,"");
    var moves = text.replace(/\s/g, " ").replace(/ +/g, " ").trim().split(' ');
    var init = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    var pos = parseFEN(init);
    _history = [init]; _historyindex = 0; gm=0;
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].length == 0) continue;
      if ("*".indexOf(moves[i][0]) == 0) {
        if (i < moves.length - 1) {
          pos = parseFEN(init);
          historyAdd(generateFEN(pos));
          gm++;
        }
        continue;
      } else if (moves[i].indexOf("FEN.") == 0) {
        pos = parseFEN(moves[i].substring(4).replace(/\./g, " "));
        if (_history[_historyindex] == init) _historyindex--;
        historyAdd(generateFEN(pos));
        continue;
      }
      if (moves[i] == "--") { pos.w = !pos.w; historyAdd(generateFEN(pos)); continue; }
      var move = parseMove(pos, moves[i]);
      if (move == null) { alert("incorrect move: "+moves[i] + " "+ gm); break; }
      pos = doMove(pos, move.from, move.to, move.p);
      historyAdd(generateFEN(pos));
    }
    document.getElementById('fen').innerHTML = generateFEN(pos);
    historyMove(0);
  } else if (text.toLowerCase() == "reset") {
    document.getElementById('fen').innerHTML = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    _history = [document.getElementById('fen').innerHTML]; _historyindex = 0;
    historyMove(0);
  } else if (text.toLowerCase() == "colorflip") {
    document.getElementById('fen').innerHTML = generateFEN(colorflip(parseFEN(document.getElementById('fen').innerHTML)));
    showBoard();
    historySave();
  } else if (text.toLowerCase() == "sidetomove") {
    document.getElementById('fen').innerHTML = document.getElementById('fen').innerHTML.replace(" w ", " ! ").replace(" b ", " w ").replace(" ! ", " b ");
    showBoard();
    historySave();
  } else if (text.toLowerCase().indexOf("depth ") == 0) { 
    refreshMoves();
    _engine.depth = Math.min(128,Math.max(0,parseInt(text.toLowerCase().replace("depth ", ""))));
    if (isNaN(_engine.depth)) _engine.depth = 10;
    evalAll();
    historySave();

  }
}
function dosearch() {
  var text = document.getElementById('searchInput').value;
  document.getElementById('searchInput').value = document.getElementById('fen').innerHTML;
  command(text);
  document.getElementById('searchInput').value = document.getElementById('fen').innerHTML;
  document.getElementById('searchInput').blur();
}

function showHideButtonGo(state) {
  if (!document.getElementById('searchInput').focus) state = false;
  if (state && document.getElementById('searchInput').value == document.getElementById('fen').innerHTML) state = false;
  document.getElementById("buttonGo").style.display = state ? "" : "none";
}

function setupInput() {
  document.getElementById("buttonGo").onclick = function() { dosearch(); };
  document.getElementById("buttonGo").onmousedown = function(event) { event.preventDefault(); };
  var input = document.getElementById("searchInput");
  input.onfocus = function() { this.select(); showHideButtonGo(true); };
  input.onblur = function() { showHideButtonGo(false);  };
  input.onpaste = function() { window.setTimeout(function() {showHideButtonGo(true);}, 1) };
  input.onkeydown = function(e) { if (e.keyCode == 27) e.preventDefault(); window.setTimeout(function() {showHideButtonGo(true);}, 1); };
  input.onkeyup = function(e) { if (e.keyCode == 27) { input.value = document.getElementById('fen').innerHTML; this.select(); showHideButtonGo(true); }};
  document.getElementById("simpleSearch").onsubmit = function() { dosearch(); return false; };
}

function getEvalText(e, s) {
  if (e == null) return s ? "" : "?";
  var matein = Math.abs(Math.abs(e) - 1000000);
  if (Math.abs(e) > 900000) {
    if (s) return (e > 0 ? "+M" : "-M") + matein;
    else return (e > 0 ? "white mate in " : "black mate in ") + matein;
  }
  return (e / 100).toFixed(2);
}
function showStatus(text) {
  var state = text.length > 0;
  var status = document.getElementById("status");
  status.innerHTML = state ? text : "";
  status.style.display = state ? "" : "none";
}
function showLegalMoves(from) {
  var pos = parseFEN(document.getElementById('fen').innerHTML);
  var elem = document.getElementById('chessboard1');
  for (var i=0; i<elem.children.length; i++) {
    var div = elem.children[i];
    if (div.tagName != 'DIV') continue;
    if (div.style.zIndex > 0) continue;
    var x = parseInt(div.style.left.replace("px","")) / 40;
    var y = parseInt(div.style.top.replace("px","")) / 40;
    div.className = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
    if (from.x==x && from.y==y) div.className += " h0";
    else if (isLegal(pos, from, {x:x,y:y})) {
        var text = "", san = "";
        for (var j = 0; j < _curmoves.length; j++) {
          if (_curmoves[j].move.from.x == from.x && _curmoves[j].move.from.y == from.y
           && _curmoves[j].move.to.x == x && _curmoves[j].move.to.y == y) {
            text = getEvalText(_curmoves[j].eval, true);
            san = _curmoves[j].san;
            break;
          }
        }
        div.className += " h1";
        div.innerHTML = text;
        div.status = san + (text.length > 0 ? " " + text : "");
        div.onmouseover = function() {showStatus(this.status);};
        div.onmouseout = function() {showStatus("");};
    }
  }
}
function showBoard(noeval) {
  var pos = parseFEN(document.getElementById('fen').innerHTML);
  var elem = document.getElementById('chessboard1');
  while (elem.firstChild) elem.removeChild(elem.firstChild);
  for (var x = 0; x < 8; x++) for (var y = 0; y < 8; y++) {
    var div = document.createElement('div');
    div.style.left = x * 40 + "px";
    div.style.top = y * 40 + "px";
    div.className = ((x + y) % 2 ? "d" : "l");
    div.className += " " + pos.b[x][y];
    if (pos.b[x][y]=="K" && isWhiteCheck(pos)
     || pos.b[x][y]=="k" && isWhiteCheck(colorflip(pos))) div.className += " h2";
    elem.appendChild(div);
  }
  document.getElementById('searchInput').value = document.getElementById('fen').innerHTML;

  if (!noeval) {
    refreshMoves();
    evalAll();
  }
    document.getElementById('buttonStm').className = pos.w ? "white" : "black";
    var matecheck = _curmoves.length == 0, illegal = false;
    if (matecheck) illegal = checkPosition(pos).length > 0;
    if (matecheck && !illegal) matecheck = pos.w && isWhiteCheck(pos) || !pos.w && isWhiteCheck(colorflip(pos));
    document.getElementById('buttonStm').innerHTML = (pos.w ? "white" : "black")
      + " to move"
      + (_curmoves.length == 0 && illegal ? "" :
         _curmoves.length == 0 && matecheck ? " (checkmate)" :
         _curmoves.length == 0 && !matecheck ? " (stalemate)" :
         _curmoves.length == 1 ? " (1 legal move)" :
         " (" + _curmoves.length + " legal moves)");
}

function highlightMove(index, state) {
  if (_dragElement != null) return;
  var elem = document.getElementById('chessboard1');
  var x1 = _curmoves[index].move.from.x;
  var y1 = _curmoves[index].move.from.y;
  var x2 = _curmoves[index].move.to.x;
  var y2 = _curmoves[index].move.to.y;
  for (var i=0; i<elem.children.length; i++) {
    var div = elem.children[i];
    if (div.tagName != 'DIV') continue;
    if (div.style.zIndex > 0) continue;
    var x = parseInt(div.style.left.replace("px","")) / 40;
    var y = parseInt(div.style.top.replace("px","")) / 40;
    var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
    div.innerHTML = "";
    if (div.className.indexOf(" h2") >= 0) c += " h2";
    if (state && x1==x && y1==y) div.className = c + " h0";
    else if (state && x2==x && y2==y) { div.className = c + " h1"; div.innerHTML = getEvalText(_curmoves[index].eval,true);}
    else div.className = c;
  }
}
function doHighlightMove(index) {
  var oldfen = document.getElementById('fen').innerHTML;
  var pos = parseFEN(oldfen);
  pos = doMove(pos,_curmoves[index].move.from,_curmoves[index].move.to,_curmoves[index].move.p);
  historyAdd(oldfen);
  document.getElementById('fen').innerHTML = generateFEN(pos);
  historyAdd(document.getElementById('fen').innerHTML);
  showBoard(document.getElementById('fen').innerHTML == oldfen);
}
function showEvals() {
  document.getElementById("moves").innerHTML = "";
  if (_curmoves.length > 0) {
    var sortfunc = function(a,b) {
      var a0 = a.eval == null ? -2000000 : a.eval * (_curmoves[0].w ? -1 : 1);
      var b0 = b.eval == null ? -2000000 : b.eval * (_curmoves[0].w ? -1 : 1);
      
      var r = 0;
      if (a0 < b0 || (a0 == b0 && a.san < b.san)) r = 1;
      if (a0 > b0 || (a0 == b0 && a.san > b.san)) r = -1;
      return r;
    }
    _curmoves.sort(sortfunc); 
  }
  for (var i=0; i<_curmoves.length;i++) {
    var e = _curmoves[i].eval;
    
    var node1 = document.createElement("DIV");
    node1.className = "line";
    var node2 = document.createElement("SPAN");
    node2.appendChild(document.createTextNode(_curmoves[i].san));
    node2.className = "san";
    var node3 = document.createElement("SPAN");
    node3.className = "eval";
    if (_curmoves[i].depth > 0) node3.title = "depth = "+_curmoves[i].depth;
    
    var text = getEvalText(_curmoves[i].eval, false);
    if (text.indexOf(".") >= 0) {
      var node4 = document.createElement("SPAN");
      node4.className = "numleft";
      node4.appendChild(document.createTextNode(text.substring(0,text.indexOf(".")+1)));
      var node5 = document.createElement("SPAN");
      node5.className = "numright";
      node5.appendChild(document.createTextNode(text.substring(text.indexOf(".")+1)));
      node3.appendChild(node4);
      node3.appendChild(node5);
    } else {
      node3.appendChild(document.createTextNode(text));
    }
    node1.appendChild(node2);
    node1.appendChild(node3);
    node1.index = i;
    node1.onmouseover = function() { highlightMove(this.index, true); };
    node1.onmouseout = function() { highlightMove(this.index, false); };
    node1.onmousedown = function() { doHighlightMove(this.index); };
    document.getElementById("moves").appendChild(node1);
  }
}

function bounds(x, y) {
  return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}
function board(pos, x, y) {
  if (x >= 0 && x <= 7 && y >= 0 && y <= 7) return pos.b[x][y];
  return "x";
}
function colorflip(pos) {
  var board = new Array(8);
  for (var i = 0; i < 8; i++) board[i] = new Array(8);
  for (x = 0; x < 8; x++) for (y = 0; y < 8; y++) {
    board[x][y] = pos.b[x][7-y];
    var color = board[x][y].toUpperCase() == board[x][y];
    board[x][y] = color ? board[x][y].toLowerCase() : board[x][y].toUpperCase();
  }
  return {b:board, c:[pos.c[2],pos.c[3],pos.c[0],pos.c[1]], e:pos.e == null ? null : [pos.e[0],7-pos.e[1]], w:!pos.w, m:[pos.m[0],pos.m[1]]};
}

function parseFEN(fen) {
  var board = new Array(8);
  for (var i = 0; i < 8; i++) board[i] = new Array(8);
  var a = fen.replace(/^\s+/,'').split(' '), s = a[0], x, y;
  for (x = 0; x < 8; x++) for (y = 0; y < 8; y++) {
    board[x][y] = '-';
  }
  x = 0, y = 0;
  for (var i = 0; i < s.length; i++) {
    if (s[i] == ' ') break;
    if (s[i] == '/') {
      x = 0;
      y++;
    } else {
      if (!bounds(x, y)) continue;
      if ('KQRBNP'.indexOf(s[i].toUpperCase()) != -1) {
        board[x][y] = s[i];
        x++;
      } else if ('0123456789'.indexOf(s[i]) != -1) {
        x += parseInt(s[i]);
      } else x++;
    }
  }
  var castling, enpassant, whitemove = !(a.length > 1 && a[1] == 'b');  
  if (a.length > 2) {
    castling = [ a[2].indexOf('K') != -1, a[2].indexOf('Q') != -1,
                 a[2].indexOf('k') != -1, a[2].indexOf('q') != -1];
  } else {
    castling = [ true, true, true, true ];
  }
  if (a.length > 3 && a[3].length == 2) {
    var ex = 'abcdefgh'.indexOf(a[3][0]);
    var ey = '87654321'.indexOf(a[3][1]);
    enpassant = (ex >= 0 && ey >= 0) ? [ex, ey] : null;
  } else {
    enpassant = null;
  }
  var movecount = [(a.length > 4 && !isNaN(a[4]) && a[4] != '') ? parseInt(a[4]) : 0,
                   (a.length > 5 && !isNaN(a[5]) && a[5] != '') ? parseInt(a[5]) : 1];
  return {b:board, c:castling, e:enpassant, w:whitemove, m:movecount};
}

function generateFEN(pos) {
  var s = '', f = 0, castling = pos.c, enpassant = pos.e, board = pos.b;
  for (var y = 0; y < 8; y++) {
    for (var x = 0; x < 8; x++) {
      if (board[x][y] == '-') {
        f++;
      } else {
        if (f > 0) s += f, f = 0;
        s += board[x][y];
      }
    }
    if (f > 0) s += f, f = 0;
    if (y < 7) s += '/';
  }
  s += ' ' + (pos.w ? 'w' : 'b')
     + ' ' + ((castling[0] || castling[1] || castling[2] || castling[3])
           ? ((castling[0] ? 'K' : '') + (castling[1] ? 'Q' : '') +
             (castling[2] ? 'k' : '') + (castling[3] ? 'q' : ''))
           : '-')
     + ' ' + (enpassant == null ? '-' : ('abcdefgh'[enpassant[0]] + '87654321'[enpassant[1]]))
     + ' ' + pos.m[0] + ' ' + pos.m[1];
  return s;
}

function isWhiteCheck(pos) {
  var kx = null, ky = null;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (pos.b[x][y] == 'K') { kx = x; ky = y; }
    }
  }
  if (kx == null || ky == null) return false;
  if (  board(pos, kx + 1, ky - 1) == 'p'
     || board(pos, kx - 1, ky - 1) == 'p'
     || board(pos, kx + 2, ky + 1) == 'n'
     || board(pos, kx + 2, ky - 1) == 'n'
     || board(pos, kx + 1, ky + 2) == 'n'
     || board(pos, kx + 1, ky - 2) == 'n'
     || board(pos, kx - 2, ky + 1) == 'n'
     || board(pos, kx - 2, ky - 1) == 'n'
     || board(pos, kx - 1, ky + 2) == 'n'
     || board(pos, kx - 1, ky - 2) == 'n'
     || board(pos, kx - 1, ky - 1) == 'k'
     || board(pos, kx    , ky - 1) == 'k'
     || board(pos, kx + 1, ky - 1) == 'k'
     || board(pos, kx - 1, ky    ) == 'k'
     || board(pos, kx + 1, ky    ) == 'k'
     || board(pos, kx - 1, ky + 1) == 'k'
     || board(pos, kx    , ky + 1) == 'k'
     || board(pos, kx + 1, ky + 1) == 'k') return true; 
  for (var i = 0; i < 8; i++) {
    var ix = (i + (i > 3)) % 3 - 1;
    var iy = (((i + (i > 3)) / 3) << 0) - 1;
    for (var d = 1; d < 8; d++) {
      var b = board(pos, kx + d * ix, ky + d * iy);
      var line = ix == 0 || iy == 0;
      if (b == 'q' || b == 'r' && line || b == 'b' && !line) return true;
      if (b != "-") break;
    }
  }
  return false;
}
function doMove(pos, from, to, promotion) {
  if (pos.b[from.x][from.y].toUpperCase() != pos.b[from.x][from.y]) {
    var r = colorflip(doMove(colorflip(pos),{x:from.x,y:7-from.y}, {x:to.x,y:7-to.y}, promotion));
    r.m[1]++;
    return r;
  }
  var r = colorflip(colorflip(pos));
  r.w = !r.w;
  if (from.x == 7 && from.y == 7) r.c[0] = false;
  if (from.x == 0 && from.y == 7) r.c[1] = false;
  if (to.x == 7 && to.y == 0) r.c[2] = false;
  if (to.x == 0 && to.y == 0) r.c[3] = false;
  if (from.x == 4 && from.y == 7) r.c[0] = r.c[1] = false;
  r.e = pos.b[from.x][from.y] == 'P' && from.y == 6 && to.y == 4 ? [from.x, 5] : null;
  if (pos.b[from.x][from.y] == 'K') {
    if (Math.abs(from.x - to.x) > 1) {
      r.b[from.x][from.y] = '-';
      r.b[to.x][to.y] = 'K';
      r.b[to.x > 4 ? 5 : 3][to.y] = 'R';
      r.b[to.x > 4 ? 7 : 0][to.y] = '-';
      return r;
    }
  }
  if (pos.b[from.x][from.y] == 'P' && to.y == 0) {
    r.b[to.x][to.y] = promotion != null ? promotion : 'Q';
  } else if (pos.b[from.x][from.y] == 'P'
          && pos.e != null && to.x == pos.e[0] && to.y == pos.e[1]
          && Math.abs(from.x - to.x) == 1) {
    r.b[to.x][from.y] = '-';
    r.b[to.x][to.y] = pos.b[from.x][from.y];
    
  } else {
    r.b[to.x][to.y] = pos.b[from.x][from.y];
  }
  r.b[from.x][from.y] = '-';
  r.m[0] = (pos.b[from.x][from.y] == 'P' || pos.b[to.x][to.y] != '-') ? 0 : r.m[0] + 1;
  return r;
}
function isLegal(pos, from, to) {
  if (!bounds(from.x, from.y)) return false;
  if (!bounds(to.x, to.y)) return false;
  if (from.x == to.x && from.y == to.y) return false;
  if (pos.b[from.x][from.y] != pos.b[from.x][from.y].toUpperCase()) {
    return isLegal(colorflip(pos), {x:from.x,y:7-from.y}, {x:to.x,y:7-to.y})
  }
  if (!pos.w) return false;
  var pfrom = pos.b[from.x][from.y];
  var pto = pos.b[to.x][to.y];
  if (pto.toUpperCase() == pto && pto != '-') return false;
  if (pfrom == '-') {
    return false;
  } else if (pfrom == 'P') {
    var enpassant = pos.e != null && to.x == pos.e[0] && to.y == pos.e[1];
    if (!((from.x == to.x && from.y == to.y + 1 && pto == '-')
       || (from.x == to.x && from.y == 6 && to.y == 4 && pto== '-' && pos.b[to.x][5] == '-')
       || (Math.abs(from.x - to.x) == 1 && from.y == to.y + 1 && (pto != '-' || enpassant))
       )) return false;
  } else if (pfrom == 'N') {
    if (Math.abs(from.x - to.x) < 1 || Math.abs(from.x - to.x) > 2) return false;
    if (Math.abs(from.y - to.y) < 1 || Math.abs(from.y - to.y) > 2) return false;
    if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) != 3) return false;
  } else if (pfrom == 'K') {
    var castling = true;
    if (from.y != 7 || to.y != 7) castling = false;
    if (from.x != 4 || (to.x != 2 && to.x != 6)) castling = false;
    if (to.x == 6 && !pos.c[0] || to.x == 2 && !pos.c[1]) castling = false;
    if (to.x == 2 && pos.b[0][7]+pos.b[1][7]+pos.b[2][7]+pos.b[3][7] != 'R---') castling = false;
    if (to.x == 6 && pos.b[5][7]+pos.b[6][7]+pos.b[7][7] != '--R') castling = false;
    if ((Math.abs(from.x - to.x) > 1 || Math.abs(from.y - to.y) > 1) && !castling) return false;
    if (castling && isWhiteCheck(pos)) return false;
    if (castling && isWhiteCheck(doMove(pos,from,{x:to.x == 2 ? 3 : 5,y:7}))) return false;
  }
  if (pfrom == 'B' || pfrom == 'R' || pfrom == 'Q') {
    var a = from.x - to.x, b = from.y - to.y;
    var line = a == 0 || b == 0;
    var diag = Math.abs(a) == Math.abs(b);
    if (!line && !diag) return false;
    if (pfrom == 'R' && !line) return false;
    if (pfrom == 'B' && !diag) return false;
    var count = Math.max(Math.abs(a), Math.abs(b));
    var ix = a > 0 ? -1 : a < 0 ? 1 : 0, iy = b > 0 ? -1 : b < 0 ? 1 : 0;
    for (var i = 1; i < count; i++) {
      if (pos.b[from.x+ix*i][from.y+iy*i] != '-') return false;
    }
  }
  if (isWhiteCheck(doMove(pos, from, to))) return false;
  return true;
}
function parseMove(pos, s) {
  var promotion = null;
  s = s.replace(/[\+|#|\?|!|x]/g,"");
  if (s.length >= 2 && s[s.length - 2] == "=") {
    promotion = s[s.length - 1]
    s = s.substring(0, s.length - 2);
  }
  if (s == "O-O" || s == "O-O-O") {
    var from = {x:4,y:pos.w?7:0}, to = {x:s=="O-O"?6:2,y:pos.w?7:0};
    if (isLegal(pos, from, to)) return {from:from, to:to}; else return null;
  } else {
    var p;
    if ("PNBRQK".indexOf(s[0]) < 0) {
      p = "P";
    } else {
      p = s[0];
      s = s.substring(1);
    }
    if (s.length < 2 || s.length > 4) return null;
    var xto = "abcdefgh".indexOf(s[s.length-2]);
    var yto = "87654321".indexOf(s[s.length-1]);
    var xfrom = -1, yfrom = -1;
    if (s.length > 2) {
      xfrom = "abcdefgh".indexOf(s[0]);
      yfrom = "87654321".indexOf(s[s.length-3]);
    }
    for (var x = 0; x < 8; x++) {
      for (var y = 0; y < 8; y++) {
        if (xfrom != -1 && xfrom != x) continue;
        if (yfrom != -1 && yfrom != y) continue;
        if (pos.b[x][y] == (pos.w ? p : p.toLowerCase()) && isLegal(pos, {x:x,y:y}, {x:xto,y:yto})) {
          xfrom = x;
          yfrom = y;
        }
      }
    }
    if (xto < 0 || yto < 0 || xfrom < 0 || yfrom < 0) return null;
    return {from:{x:xfrom,y:yfrom},to:{x:xto,y:yto},p:promotion};
  }
}

function genMoves(pos) {
  var moves = [];
  for (var x1 = 0; x1 < 8; x1++) for (var y1 = 0; y1 < 8; y1++)
  for (var x2 = 0; x2 < 8; x2++) for (var y2 = 0; y2 < 8; y2++) {
    if (isLegal(pos,{x:x1,y:y1},{x:x2,y:y2})) {
       if ((y2==0 || y2==7) && pos.b[x1][y1].toUpperCase()=="P") {
         moves.push({from:{x:x1,y:y1},to:{x:x2,y:y2},p:"N"});
         moves.push({from:{x:x1,y:y1},to:{x:x2,y:y2},p:"B"});
         moves.push({from:{x:x1,y:y1},to:{x:x2,y:y2},p:"R"});
         moves.push({from:{x:x1,y:y1},to:{x:x2,y:y2},p:"Q"});
       } else moves.push({from:{x:x1,y:y1},to:{x:x2,y:y2}});
    }
  }
  return moves;
}

function sanMove(pos, move, moves) {
  var s = "";
  if (move.from.x==4 && move.to.x==6 && pos.b[move.from.x][move.from.y].toLowerCase() == "k") {
    s = 'O-O';
  } else if (move.from.x==4 && move.to.x==2 && pos.b[move.from.x][move.from.y].toLowerCase() == "k") {
    s = 'O-O-O';
  } else {
    var piece = pos.b[move.from.x][move.from.y].toUpperCase();    
    if (piece != "P") {
        var a=0, sx=0, sy=0;
        for (var i = 0; i < moves.length; i++) {
          if (pos.b[moves[i].from.x][moves[i].from.y] == pos.b[move.from.x][move.from.y] &&
             (moves[i].from.x != move.from.x || moves[i].from.y != move.from.y) &&
             (moves[i].to.x == move.to.x && moves[i].to.y == move.to.y)) {
              a++;
              if (moves[i].from.x == move.from.x) sx++;
              if (moves[i].from.y == move.from.y) sy++;
            }
        }
        s += piece;
        if (a>0) {
          if (sx>0 && sy>0) s += "abcdefgh"[move.from.x] + "87654321"[move.from.y];
          else if (sx>0) s += "87654321"[move.from.y];
          else s += "abcdefgh"[move.from.x];
        }
    }
    if (pos.b[move.to.x][move.to.y] != "-" || piece == "P" && move.to.x != move.from.x) {
      if (piece == "P") s += "abcdefgh"[move.from.x];
      s += 'x';
    }
    s += "abcdefgh"[move.to.x] + "87654321"[move.to.y];
    if (piece == "P" && (move.to.y == 0 || move.to.y == 7)) s += "=" + (move.p==null?"Q":move.p);
  }
  var pos2 = doMove(pos,move.from,move.to,move.p);
  if (isWhiteCheck(pos2) || isWhiteCheck(colorflip(pos2))) s += genMoves(pos2).length == 0 ? "#" : "+";
  return s;
}
function fixCastling(pos) {
    pos.c[0] &= !(pos.b[7][7]!='R' || pos.b[4][7]!='K');
    pos.c[1] &= !(pos.b[0][7]!='R' || pos.b[4][7]!='K');
    pos.c[2] &= !(pos.b[7][0]!='r' || pos.b[4][0]!='k');
    pos.c[3] &= !(pos.b[0][0]!='r' || pos.b[4][0]!='k');
}
function checkPosition(pos) {
  var errmsgs = [];
  var wk=bk=0, wp=bp=0, wpr=bpr=0, wn=wb1=wb2=wr=wq=0, bn=bb1=bb2=br=bq=0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      var c = ((x + y) % 2) == 0;
      if (pos.b[x][y] == 'K') wk++; if (pos.b[x][y] == 'k') bk++;
      if (pos.b[x][y] == 'P') wp++; if (pos.b[x][y] == 'p') bp++;
      if (pos.b[x][y] == 'N') wn++; if (pos.b[x][y] == 'n') bn++;
      if (c && pos.b[x][y] == 'B') wb1++; if (c && pos.b[x][y] == 'b') bb1++;
      if (!c && pos.b[x][y] == 'B') wb2++; if (!c && pos.b[x][y] == 'b') bb2++;
      if (pos.b[x][y] == 'R') wr++; if (pos.b[x][y] == 'r') br++;
      if (pos.b[x][y] == 'Q') wq++; if (pos.b[x][y] == 'q') bq++;
      if (pos.b[x][y] == 'P' && (y == 0 || y == 7)) wpr++;
      if (pos.b[x][y] == 'p' && (y == 0 || y == 7)) bpr++;
    }
  }
  if (wk == 0) errmsgs.push("Missing white king");
  if (bk == 0) errmsgs.push("Missing black king");
  if (wk > 1) errmsgs.push("Two white kings");
  if (bk > 1) errmsgs.push("Two black kings");
  var wcheck = isWhiteCheck(pos);
  var bcheck = isWhiteCheck(colorflip(pos));
  if (pos.w && bcheck || !pos.w && wcheck) errmsgs.push("Non-active color is in check");
  if (wp > 8) errmsgs.push("Too many white pawns");
  if (bp > 8) errmsgs.push("Too many black pawns");
  if (wpr > 0) errmsgs.push("White pawns in first or last rank");
  if (bpr > 0) errmsgs.push("Black pawns in first or last rank");
  var we = Math.max(0, wq-1) + Math.max(0, wr-2) + Math.max(0, wb1-1) + Math.max(0, wb2-1) + Math.max(0, wn-2);
  var be = Math.max(0, bq-1) + Math.max(0, br-2) + Math.max(0, bb1-1) + Math.max(0, bb2-1) + Math.max(0, bn-2);
  if (we > Math.max(0, 8-wp)) errmsgs.push("Too many extra white pieces");
  if (be > Math.max(0, 8-bp)) errmsgs.push("Too many extra black pieces");
  if ((pos.c[0] && (pos.b[7][7]!='R' || pos.b[4][7]!='K'))
   || (pos.c[1] && (pos.b[0][7]!='R' || pos.b[4][7]!='K'))) errmsgs.push("White has castling rights and king or rook not in their starting position");
  if ((pos.c[2] && (pos.b[7][0]!='r' || pos.b[4][0]!='k'))
   || (pos.c[3] && (pos.b[0][0]!='r' || pos.b[4][0]!='k'))) errmsgs.push("Black has castling rights and king or rook not in their starting position");
  return errmsgs;
}
function refreshMoves() {
  var pos = parseFEN(document.getElementById('fen').innerHTML);
  _curmoves = [];
  document.getElementById("moves").innerHTML = "";
  var errmsgs = checkPosition(pos);
  if (errmsgs.length == 0) {
    var moves = genMoves(pos);
    for (var i=0; i<moves.length;i++) {
      _curmoves.push({move:moves[i],san:sanMove(pos,moves[i],moves),fen:generateFEN(doMove(pos,moves[i].from,moves[i].to,moves[i].p)),w:!pos.w,eval:null,depth:0});
    }
    showEvals();
  } else {
    var s = "<div style='color:red'>Illegal position:</div><ul>";
    for (var i=0; i<errmsgs.length;i++) s += "<li>" + errmsgs[i] + "</li>";
    s += "</ul>";
    document.getElementById("moves").innerHTML = s;
  }
}

function historyButtons() {
  document.getElementById('buttonBack').className = _historyindex > 0 ? "on" : "off";
  document.getElementById('buttonForward').className = _historyindex < _history.length - 1 ? "on" : "off";
}
function historySave() {
  var data = { _historyindex : _historyindex, _history : _history, _fen : document.getElementById('fen').innerHTML, _depth : _engine.depth };
  if (typeof browser !== 'undefined' && typeof browser.storage !== 'undefined') browser.storage.local.set(data);
  if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') chrome.storage.local.set(data);
}
function historyLoad() {
  var loadHistory = null;
  var load =  function(res) {
    if (typeof res === 'undefined' || res == null ||
        typeof res._history === 'undefined' || res._history == null ||
        typeof res._historyindex === 'undefined' || res._historyindex == null ||
        typeof res._depth === 'undefined' || res._depth == null ||
        typeof res._fen === 'undefined' || res._fen == null) return;
    _history = res._history;
    _historyindex = res._historyindex;
    document.getElementById('fen').innerHTML = res._fen;
    _engine.depth = res._depth;
    historyButtons();
    showBoard();
  }
  if (typeof browser !== 'undefined' && typeof browser.storage !== 'undefined') loadHistory = browser.storage.local.get(null).then((res) => load(rec));
  if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') loadHistory = chrome.storage.local.get(null, load);
}
function historyAdd(fen) {
  if (_historyindex >= 0 && _history[_historyindex] == fen) return;
  _historyindex++;
  _history.length = _historyindex;
  _history.push(fen);
  historyButtons();
  historySave();
}
function historyMove(v, e) {
  if (e == null) e = window.event;
  var oldindex = _historyindex;
  if (_historyindex == _history.length - 1
   && _history[_historyindex] != document.getElementById('fen').innerHTML) historyAdd(document.getElementById('fen').innerHTML);
  if (_historyindex + v >= 0 && _historyindex + v < _history.length) _historyindex += v;
  if (e != null && e.ctrlKey && Math.abs(v) == 1) _historyindex = v == 1 ? _history.length - 1 : 0;
  if (v == 0 || (oldindex != _historyindex || document.getElementById('fen').innerHTML != _history[_historyindex])) {
    document.getElementById('fen').innerHTML = _history[_historyindex];
    historyButtons();
    historySave();
    showBoard();
  }
}

function onMouseDown(e, button) {
  if (_dragElement != null) return true;
  if (e == null) e = window.event;
  var elem = target = e.target != null ? e.target : e.srcElement;
  while (target != null && target.id != 'chessboard1' && target.tagName != 'BODY') {
    target = target.parentNode;
  }  
  if (target == null) return true;
  if (target.id != 'chessboard1') return true;
  if (elem.className[2] == '-') return true;
  document.onmousemove = onMouseMove;
  document.body.focus();
  document.onselectstart = function () { return false; };
  elem.ondragstart = function () { return false; };
  _dragActive = false;
  _dragCtrl = e.ctrlKey;
  _dragElement = elem;
  _startX = e.clientX;
  _startY = e.clientY;
  return false;

}
function getDragX(x, full) {
  var w = _dragElement.getBoundingClientRect().width;
  var offsetX = document.getElementById('chessboard1').getBoundingClientRect().left + w / 2;
  if (full) return (x - offsetX);
  else return Math.round((x - offsetX) / w);
}
function getDragY(y, full) {
  var h = _dragElement.getBoundingClientRect().height;
  var offsetY = document.getElementById('chessboard1').getBoundingClientRect().top + h / 2;
  if (full) return (y - offsetY);
  else return Math.round((y - offsetY) / h);
}
function dragActivate() {
    if (_dragElement == null) return;
    var clone = _dragElement.cloneNode(false);
    if (!_dragCtrl) _dragElement.className = _dragElement.className[0] + " -";
    _dragElement = clone;
    _dragElement.className = _dragElement.className.substring(0, 3);
    _dragElement.style.backgroundColor = "transparent";
    _dragElement.style.background = "none";
    _dragElement.style.zIndex = 10000;
    _dragElement.style.pointerEvents = "none";
    document.getElementById('chessboard1').appendChild(_dragElement);
    _dragActive = true;
    
    var x1 = getDragX(_startX);
    var y1 = getDragY(_startY);
    showLegalMoves({x:x1,y:y1});
}

function onMouseMove(e) {
  if (_dragElement == null) return;
  if (e == null) e = window.event;
  if (!_dragActive) {
    if (Math.abs(e.clientX - _startX) < 4 && Math.abs(e.clientY - _startY) < 4) return;
    dragActivate();
  }
  _dragElement.style.left = getDragX(e.clientX, true) + 'px';
  _dragElement.style.top = getDragY(e.clientY, true) + 'px';
  _dragElement.style.color = 'transparent'; _dragElement.innerHTML = '-'; // force browser to refresh pop-up
}
function onMouseUp(e) {
  onMouseMove(e);
  if (_dragElement != null) {
    if (_dragActive) {
      showStatus("");
      var x1 = getDragX(_startX);
      var y1 = getDragY(_startY);
      var x2 = getDragX(e.clientX);
      var y2 = getDragY(e.clientY);
      
      var oldfen = document.getElementById('fen').innerHTML;
      var pos = parseFEN(oldfen);
      var legal = !_dragCtrl && isLegal(pos,{x:x1,y:y1},{x:x2,y:y2});
      if (legal) {
        pos = doMove(pos,{x:x1,y:y1},{x:x2,y:y2});
      } else {
        if (bounds(x2, y2)) pos.b[x2][y2] = pos.b[x1][y1];
        if (!_dragCtrl && (x1 != x2 || y1 != y2)) pos.b[x1][y1] = '-';
        fixCastling(pos);
      }
      historyAdd(oldfen);
      document.getElementById('fen').innerHTML = generateFEN(pos);
      historyAdd(document.getElementById('fen').innerHTML);
      showBoard(document.getElementById('fen').innerHTML == oldfen);
    }

    document.onmousemove = null;
    document.onselectstart = null;
    _dragElement = null;
    return false;
  }
}

function chessboardOnDblClick(e) {
  if (e == null) e = window.event;
  var elem = target = e.target != null ? e.target : e.srcElement;

  var w = elem.getBoundingClientRect().width;
  var h = elem.getBoundingClientRect().height;
  var offsetX = document.getElementById('chessboard1').getBoundingClientRect().left + w / 2;
  var offsetY = document.getElementById('chessboard1').getBoundingClientRect().top + h / 2;
  var x1 = Math.round((e.clientX - offsetX) / w);
  var y1 = Math.round((e.clientY - offsetY) / h);  
  var pos = parseFEN(document.getElementById('fen').innerHTML);
  if (bounds(x1, y1)) {
    var s = '-PNBRQKpnbrqk-', index = s.indexOf(pos.b[x1][y1]);
    if (e.ctrlKey) index = index >= 1 && index <= 6 ? index + 6 : (index > 6 ? index - 6 : index); else index++;
    pos.b[x1][y1] = s[index];
    fixCastling(pos);
  }
  document.getElementById('fen').innerHTML = generateFEN(pos);
  historySave();
  showBoard();
  
  document.getElementById('chessboard1').onclick = chessboardOnDblClick;
  if (_dblClickTimer) window.clearTimeout(_dblClickTimer);
  _dblClickTimer = window.setTimeout(function() { document.getElementById('chessboard1').onclick = null; }, 1000);
}

function loadEngine() {
  var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
  var worker = new Worker(wasmSupported ? 'stockfish.wasm.js' : 'stockfish.js');
  var engine = {ready: false, depth: 10, lastnodes: 0};
  worker.onmessage = function (e) { if (engine.messagefunc) engine.messagefunc(e.data); }
  engine.send = function send(cmd, message) {
    cmd = String(cmd).trim();
    engine.messagefunc = message;
    worker.postMessage(cmd);
  };
  engine.eval = function eval(fen, done, info) {
    engine.send("position fen " + fen);
    engine.send("go depth "+ engine.depth, function message(str) {
      var matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+) .*nodes (\d+) .*pv (.+)/);
      if (!matches) matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+).*/);
      if (matches) {
        if (matches.length > 4) {
          var nodes = Number(matches[4]);
          if (nodes < engine.lastnodes || engine.lastnodes == 0)  engine.fen = fen;
          engine.lastnodes = nodes;
        }
        var depth = Number(matches[1]);
        var type = matches[2];
        var score = Number(matches[3]);
        if (type == "mate") score = (1000000 - Math.abs(score)) * (score <= 0 ? -1 : 1);
        engine.score = score;
        if (matches.length > 5) {
          var pv = matches[5].split(" ");
          if (info != null && depth > 10 && engine.fen == fen) info(depth, score, pv[0]);
        }
      }
      if (str.indexOf("bestmove") >= 0 || str.indexOf("mate 0") >= 0) {
        if (engine.fen == fen) done(str);
        engine.lastnodes = 0;
      }
    });
  };
  engine.send("uci", function onuci(str) {
    if (str === "uciok") {
      engine.send("isready", function onready(str) {
        if (str === "readyok") engine.ready = true;
      });
    }
  });
  return engine;
}
function evalNext() {
  for (var i=0; i<_curmoves.length; i++) {
    if (_curmoves[i].depth < _engine.depth) {
      var curpos = _curmoves[i].fen;
      _engine.score = null;
      _engine.eval(curpos, function done(str) {
        if (i >= _curmoves.length || _curmoves[i].fen != curpos) return;
        if (_engine.score != null) {
          _curmoves[i].eval = _curmoves[i].w ? _engine.score : -_engine.score;
          _curmoves[i].depth = _engine.depth;
          showEvals();
        }
        evalNext();
      });
      return;
    }
  }
}
function applyEval(m, s, d) {
  if (s == null || m.length < 4) return;
  for (var i=0; i<_curmoves.length; i++) {
    if (_curmoves[i].move.from.x == "abcdefgh".indexOf(m[0]) &&
        _curmoves[i].move.from.y == "87654321".indexOf(m[1]) &&
        _curmoves[i].move.to.x == "abcdefgh".indexOf(m[2]) &&
        _curmoves[i].move.to.y == "87654321".indexOf(m[3]))
    {
      if (d > _curmoves[i].depth) {
        _curmoves[i].eval = _curmoves[i].w ? -s : s;
        _curmoves[i].depth = d;
        showEvals();
      }
      break;
    }
 }
}
function evalAll() {
  if (_curmoves.length == 0) return;
  if (_engine == null || !_engine.ready) {
    window.setTimeout(evalAll, 500);
    return;
  }
  document.getElementById("moves").scrollTo(0, 0);
  var fen = document.getElementById('fen').innerHTML;
  _engine.send("stop");
  _engine.score = null;
  _engine.eval(fen, function done(str) {
    var matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
    if (matches && matches.length > 1) applyEval(matches[1], _engine.score, _engine.depth - 1);
    evalNext();
  }, function info(depth, score, pv0) {
    applyEval(pv0, score, depth - 1);
  });
}

window.onload = function() {
  document.onmousedown = onMouseDown;
  document.onmouseup = onMouseUp;
  document.getElementById('chessboard1').ondblclick = chessboardOnDblClick;
  document.getElementById("buttonStm").onclick = function() { command('sidetomove'); };
  document.getElementById("buttonBack").onclick = function(event) { historyMove(-1,event); };
  document.getElementById("buttonForward").onclick = function(event) { historyMove(+1,event); };
  document.getElementById("buttonRefresh").onclick = function() { showBoard(false); };
  setupInput();
  showBoard();
  _engine = loadEngine();
  historyLoad();
}
