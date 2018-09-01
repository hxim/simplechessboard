var START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var _engine, _curmoves = [];
var _history = [[START]], _history2 = null, _historyindex = 0;
var _flip = false, _edit = false, _info = false, _graph = false, _play = null;
var _arrow = false, _menu = false;
var _dragElement = null, _dragActive = false, _startX, _startY, _dragCtrl, _clickFrom, _clickFromElem;

function setElemText(elem, value) {
  while(elem.firstChild) elem.removeChild(elem.firstChild);
  elem.appendChild(document.createTextNode(value));
}

function getElemText(elem) {
  return elem.innerText || elem.textContent;
}

function setCurFEN(fen) {
  setElemText(document.getElementById('fen'), fen);
}

function getCurFEN() {
  return getElemText(document.getElementById('fen'));
}

// Input box and commands

function command(text) {
  var mvdivs = ['<div class="moves">', '<div class="tview2 column">','<div class="extension-item Moves">'];
  for (var i = 0; i < mvdivs.length; i++) {
    if (text.indexOf(mvdivs[i]) >= 0) {
      text = text.substring(text.indexOf(mvdivs[i]));
      text = text.substring(mvdivs[i].length,text.indexOf('</div>'));
      if (i == 2) {
        text = text.replace(/<dt>\s*(<span[^>]*>)?\s*([^<\s]*)\s*(<\/span>)?\s*<\/dt>/g,"<index>$2</index>")
              .replace(/<span class="move">\s*([^<\s]*)\s*<\/span>/g,"<move>$1</move>")
      } else {
        text = text.replace(/<interrupt>((?!<\/interrupt>).)*<\/interrupt>/g,"")
              .replace(/<move[^<>"]*(("[^"]*")[^<>"]*)*>/g,"<move>")
              .replace(/<\/?san>|<eval>[^<]*<\/eval>|<glyph[^<]*<\/glyph>|<move>\.\.\.<\/move>/g,"")
              .replace(/\?/g,"x");
      }
      text = text
             .replace(/{|}/g,"")
             .replace(/(<index[^>]*>)/g,"{").replace(/<\/index>/g,".}")
             .replace(/<move>/g,"{").replace(/<\/move>/g," }")
             .replace(/(^|})[^{]*($|{)/g,"");
    }
  }
  if (text.split("/").length == 8 && text.split(".").length == 1) {
    pos = parseFEN(text);
    setCurFEN(generateFEN(pos));
    _history = [[getCurFEN()]]; _historyindex = 0;
    historyMove(0);
  } else if (text.split(".").length > 1) {
    text = text.replace(/\u2605/g, "");
    text = " " + text.replace(/\./g," ").replace(/(\[FEN [^\]]+\])+?/g, function ($0, $1) { return $1.replace(/\[|\]|"/g,"").replace(/\s/g,"."); });
    text = text.replace(/\[Event /g, "* [Event ").replace(/\s(\[[^\]]+\])+?/g, "").replace(/(\{[^\}]+\})+?/g, "");
    var r = /(\([^\(\)]+\))+?/g; while (r.test(text)) text = text.replace(r, "");
    text = text.replace(/0-0-0/g, "O-O-O").replace(/0-0/g, "O-O").replace(/(1\-0|0\-1|1\/2\-1\/2)/g," * ")
               .replace(/\s\d+/g, " ").replace(/\$\d+/g, "").replace(/\?/g,"");
    var moves = text.replace(/\s/g, " ").replace(/ +/g, " ").trim().split(' ');
    var pos = parseFEN(START);
    var oldhistory = JSON.parse(JSON.stringify(_history));
    _history = [[START]]; _historyindex = 0; gm=0;
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].length == 0) continue;
      if ("*".indexOf(moves[i][0]) == 0) {
        if (i < moves.length - 1) {
          pos = parseFEN(START);
          historyAdd(generateFEN(pos), oldhistory);
          gm++;
        }
        continue;
      } else if (moves[i].indexOf("FEN.") == 0) {
        pos = parseFEN(moves[i].substring(4).replace(/\./g, " "));
        if (_history[_historyindex][0] == START) _historyindex--;
        historyAdd(generateFEN(pos), oldhistory);
        continue;
      }
      if (moves[i] == "--") { pos.w = !pos.w; historyAdd(generateFEN(pos), oldhistory); continue; }
      var move = parseMove(pos, moves[i]);
      if (move == null) { alert("incorrect move: "+moves[i] + " "+ gm); break; }
      pos = doMove(pos, move.from, move.to, move.p);
      historyAdd(generateFEN(pos), oldhistory, move, moves[i]);
    }
    setCurFEN(generateFEN(pos));
    historyMove(0);
  } else if (text.toLowerCase() == "reset") {
    setCurFEN(START);
    _history = [[getCurFEN()]]; _historyindex = 0;
    _history2 = null;
    refreshButtonRevert();
    historyMove(0);
    _history2 = null;
  } else if (text.toLowerCase() == "colorflip") {
    setCurFEN(generateFEN(colorflip(parseFEN(getCurFEN()))));
    showBoard();
    historySave();
  } else if (text.toLowerCase() == "sidetomove") {
    setCurFEN(getCurFEN().replace(" w ", " ! ").replace(" b ", " w ").replace(" ! ", " b "));
    showBoard();
    historySave();
  } else if (text.toLowerCase().indexOf("depth ") == 0) { 
    if (_engine != null) {
      _engine.depth = Math.min(128,Math.max(0,parseInt(text.toLowerCase().replace("depth ", ""))));
      if (isNaN(_engine.depth)) _engine.depth = 10;
    }
    refreshMoves();
    evalAll();
    historySave();
  } else if (text.toLowerCase() == "flip") {
    doFlip();
  } else if (text.toLowerCase() == "window") {
  
    var encoded = "";
    if (_history[0][0] == START) {
      var gi = "";
      for (var i = 1; i < _history.length; i++) {
        var pos = parseFEN(_history[i-1][0]);
        var moves = genMoves(pos);
        var mindex = -1;
        for (var j = 0; j < moves.length; j++) {
          var move = moves[j];
          var pos2 = doMove(pos, move.from, move.to, move.p);
          if (generateFEN(pos2) == _history[i][0]) mindex = j;
        }
        if (mindex < 0) { gi = ""; break; }
        var symbols = (moves.length+1).toString(2).length, v="";
        for (var j = 0; j < symbols; j++) v+="0";
        var n = (mindex+1).toString(2);
        n = v.substr(n.length) + n;
        gi += n;
        if (i == _history.length-1) gi += v;
      }
      var cur = "";
      for (var i = 0; i < gi.length; i++) {
        cur += gi[i];
        if (i == gi.length-1) while (cur.length < 6) cur += "0";
        if (cur.length == 6) {
          encoded += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[parseInt(cur, 2)];
          cur = "";
        }
      }
    }
    var url = [location.protocol, '//', location.host, location.pathname].join('');
    if (encoded.length > 0) window.open(url + "?x=~" + encoded, "_blank");
    else if (getCurFEN() == START) window.open(url, "_blank");
    else window.open(url + "?x=" + getCurFEN(), "_blank");
  } else if (text[0] == "~") {
    var pos = parseFEN(START);
    var oldhistory = JSON.parse(JSON.stringify(_history));
    _history = [[START]]; _historyindex = 0;
    var gi = "";
    for (var i = 1; i < text.length; i++) {
      var n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".indexOf(text[i]).toString(2);
      gi += "000000".substr(n.length) + n;
    }
    var i = 0;
    while (i < gi.length) {
      var moves = genMoves(pos);
      var symbols = (moves.length+1).toString(2).length, cur = "";
      for (var j = 0; j < symbols; j++) { cur += (i < gi.length ? gi[i] : "0"); i++; }
      var n = parseInt(cur, 2);
      if (n == 0 || n >= moves.length + 1) break;
      var move = moves[n-1], san = sanMove(pos, move, moves);
      pos = doMove(pos, move.from, move.to, move.p);
      historyAdd(generateFEN(pos), oldhistory, move, san);
    }
    setCurFEN(generateFEN(pos));
    historyMove(0);
  } else if (text.toLowerCase() == "revert") {
    if (_history2 != null) {
      _historyindex = _history2[0];
      _history = _history2[1];
      _history2 = null;
      setCurFEN(_history[_historyindex][0]);
      refreshButtonRevert();
      historyMove(0);
    }
  } else if (text.toLowerCase() == "keep") {
    _history2 = null;
    refreshButtonRevert();
    historyMove(0);
  }
}

function dosearch() {
  var text = document.getElementById('searchInput').value;
  document.getElementById('searchInput').value = getCurFEN();
  command(text);
  document.getElementById('searchInput').value = getCurFEN();
  document.getElementById('searchInput').blur();
}

function showHideButtonGo(state) {
  if (!document.getElementById('searchInput').focus) state = false;
  if (state && document.getElementById('searchInput').value == getCurFEN()) state = false;
  document.getElementById("buttonGo").style.display = state ? "" : "none";
}

function setupInput() {
  document.getElementById("buttonGo").onclick = function() { dosearch(); };
  document.getElementById("buttonGo").onmousedown = function(event) { event.preventDefault(); };
  var input = document.getElementById("searchInput");
  input.onmousedown = function() { this.focuswithmouse=1; };
  input.onmouseup = function() { if (this.focuswithmouse==2 && input.selectionStart == input.selectionEnd) this.select(); this.focuswithmouse=0; }
  input.onfocus = function() {  if (this.focuswithmouse==1) this.focuswithmouse=2; else { input.select(); this.focuswithmouse=0; } showHideButtonGo(true); document.onkeydown = null;  };
  input.onblur = function() { input.selectionStart = input.selectionEnd; showHideButtonGo(false); document.onkeydown = onKeyDown; this.focuswithmouse=0; };
  input.onpaste = function() { window.setTimeout(function() {showHideButtonGo(true);}, 1); };
  input.onkeydown = function(e) { if (e.keyCode == 27) e.preventDefault(); window.setTimeout(function() {showHideButtonGo(true);}, 1); };
  input.onkeyup = function(e) { if (e.keyCode == 27) { input.value = getCurFEN(); this.select(); showHideButtonGo(true); }};
  document.getElementById("simpleSearch").onsubmit = function() { dosearch(); return false; };
}

// Status bar

function showStatus(text, answer) {
  var state = text.length > 0;
  var status = document.getElementById("status");
  setElemText(status, state ? text : "");
  status.style.display = state ? "" : "none";
  if (answer != null && answer.length == 4) {
    var move = {from:{x:"abcdefgh".indexOf(answer[0]),y:"87654321".indexOf(answer[1])},
                to:{x:"abcdefgh".indexOf(answer[2]),y:"87654321".indexOf(answer[3])}};
    showArrow1(move);
  } else setArrow(_arrow);
}

// Chessboard and arrows

function getEvalText(e, s) {
  if (e == null) return s ? "" : "?";
  var matein = Math.abs(Math.abs(e) - 1000000);
  if (Math.abs(e) > 900000) {
    if (s) return (e > 0 ? "+M" : "-M") + matein;
    else return (e > 0 ? "white mate in " : "black mate in ") + matein;
  }
  return (e / 100).toFixed(2);
}

function showLegalMoves(from) {
  setArrow(from == null);
  var pos = parseFEN(getCurFEN());
  var elem = document.getElementById('chessboard1');
  for (var i=0; i<elem.children.length; i++) {
    var div = elem.children[i];
    if (div.tagName != 'DIV') continue;
    if (div.style.zIndex > 0) continue;
    var x = parseInt(div.style.left.replace("px","")) / 40;
    var y = parseInt(div.style.top.replace("px","")) / 40;
    if (_flip) { x = 7-x; y = 7-y; }    
    var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
    if (div.className.indexOf(" h2") >= 0) c += " h2";    
    div.className = c;
    div.onmouseover = null;
    setElemText(div, "");
    if (from == null || from.x < 0 || from.y < 0) continue;
    if (from.x==x && from.y==y) { div.className += " h0"; _clickFromElem = div; }
    else if (isLegal(pos, from, {x:x,y:y})) {
        var text = "", san = "", answer = null;
        for (var j = 0; j < _curmoves.length; j++) {
          if (_curmoves[j].move.from.x == from.x && _curmoves[j].move.from.y == from.y
           && _curmoves[j].move.to.x == x && _curmoves[j].move.to.y == y) {
            text = getEvalText(_curmoves[j].eval, true);
            san = _curmoves[j].san;
            answer = _curmoves[j].answer;
            break;
          }
        }
        div.className += " h1";
        setElemText(div, text);
        div.status = san + (text.length > 0 ? " " + text : "");
        div.answer = answer == null ? "" : answer;
        div.onmouseover = function() {showStatus(this.status, this.answer);};
        div.onmouseout = function() {showStatus("");};
    }
  }
  
  elem = document.getElementById('editWrapper').children[0];
  for (var i=0; i<elem.children.length; i++) {
    var div = elem.children[i];
    if (div.tagName != 'DIV') continue;
    if (div.style.zIndex > 0) continue;
    var x = - parseInt(div.style.left.replace("px","")) / 30 - 1;
    var y = - parseInt(div.style.top.replace("px","")) / 30 - 1;
    var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
    div.className = c;
    setElemText(div, "");
    if (from == null || from.x >= 0 || from.y >= 0 || c[2] == 'S') continue;
    if (from.x==x && from.y==y) { div.className += " h0"; _clickFromElem = div; }
  }

  _clickFrom = from;
}
function setArrow(state) {
  _arrow = state;
  if (_arrow && _curmoves.length > 0 && _curmoves[0].eval != null) showArrow1(_curmoves[0].move); else showArrow1();
}
function repaintLastMoveArrow() {
  var lastmove = (getCurFEN() == _history[_historyindex][0] && _history[_historyindex].length > 2) ? _history[_historyindex][2] : null;
  if (lastmove != null) { 
    var elem = document.getElementById("arrowWrapper2");
    elem.children[0].children[0].children[0].children[0].style.fill
    = elem.children[0].children[1].style.stroke
    = getGraphPointColor(_historyindex);
  }
  showArrow2(lastmove);
}

function showBoard(noeval, refreshhistory) {
  var pos = parseFEN(getCurFEN());
  var elem = document.getElementById('chessboard1');
  while (elem.firstChild) elem.removeChild(elem.firstChild);
  for (var x = 0; x < 8; x++) for (var y = 0; y < 8; y++) {
    var div = document.createElement('div');
    div.style.left = (_flip ? 7-x : x) * 40 + "px";
    div.style.top = (_flip ? 7-y : y) * 40 + "px";
    div.className = ((x + y) % 2 ? "d" : "l");
    div.className += " " + pos.b[x][y];
    if (pos.b[x][y]=="K" && isWhiteCheck(pos)
     || pos.b[x][y]=="k" && isWhiteCheck(colorflip(pos))) div.className += " h2";
    elem.appendChild(div);
  }
  if (_clickFromElem != null && _clickFrom != null && _clickFrom.x >= 0 && _clickFrom.y >= 0) _clickFromElem = null;
  document.getElementById('searchInput').value = getCurFEN();

  if (!noeval) {
    refreshMoves();
    if (refreshhistory) for (var i = 0; i < _history.length; i++) if (_history[i].length > 1 && _history[i][1] != null) _history[i][1].depth = -1;
    evalAll();
  }
  document.getElementById('buttonStm').className = pos.w ? "white" : "black";

  setArrow(true);
  
  repaintLastMoveArrow();
  if (_menu) reloadMenu();
  if (_graph) repaintGraph();
  if (_info) updateInfo();
}

function highlightMove(index, state) {
  setArrow(!state);
  if (_dragElement != null) return;
  var elem = document.getElementById('chessboard1');
  var x1 = _curmoves[index].move.from.x;
  var y1 = _curmoves[index].move.from.y;
  var x2 = _curmoves[index].move.to.x;
  var y2 = _curmoves[index].move.to.y;
  var text = getEvalText(_curmoves[index].eval,true);
  for (var i=0; i<elem.children.length; i++) {
    var div = elem.children[i];
    if (div.tagName != 'DIV') continue;
    if (div.style.zIndex > 0) continue;
    var x = parseInt(div.style.left.replace("px","")) / 40;
    var y = parseInt(div.style.top.replace("px","")) / 40;
    if (_flip) { x = 7-x; y = 7-y; }
    var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
    setElemText(div, "");
    if (div.className.indexOf(" h2") >= 0) c += " h2";
    if (state && x1==x && y1==y) div.className = c + " h0";
    else if (state && x2==x && y2==y) { div.className = c + " h1"; setElemText(div, text);}
    else div.className = c;
    div.onmouseover = null;
  }
  if (state) showStatus("", _curmoves[index].answer);
  else showStatus("");
}
function doHighlightMove(index) {
  
  var oldfen = getCurFEN();
  var pos = parseFEN(oldfen), san = _curmoves[index].san;
  if (pos.w != _play) pos = doMove(pos,_curmoves[index].move.from,_curmoves[index].move.to,_curmoves[index].move.p);
  historyAdd(oldfen);
  setCurFEN(generateFEN(pos));
  historyAdd(getCurFEN(), null, _curmoves[index].move, san);
  showBoard(getCurFEN() == oldfen);
  doComputerMove();
}
function showArrowInternal(move, wrapperId) {
  var elem = document.getElementById(wrapperId);
  if (move == null) { elem.style.display = "none"; return; }
  elem.style.top = document.getElementById('chessboard1').getBoundingClientRect().top
                 - document.getElementById("container").getBoundingClientRect().top + "px";
  elem.style.left = document.getElementById('chessboard1').getBoundingClientRect().left
                  - document.getElementById("container").getBoundingClientRect().left + "px";
  elem.style.width = elem.style.height = (40 * 8) + "px";
  var line = elem.children[0].children[1];
  line.setAttribute('x1', 20+(_flip?7-move.from.x:move.from.x)*40);
  line.setAttribute('y1', 20+(_flip?7-move.from.y:move.from.y)*40);
  line.setAttribute('x2', 20+(_flip?7-move.to.x:move.to.x)*40);
  line.setAttribute('y2', 20+(_flip?7-move.to.y:move.to.y)*40);
  elem.style.display = "block";
}
function showArrow1(move) { showArrowInternal(move, "arrowWrapper1"); }
function showArrow2(move) { showArrowInternal(move, "arrowWrapper2"); }
function updateInfo() {
  var addline = function(e, label, value, color, right, className, underline) {
    var line = document.createElement('div');
    var span1 = document.createElement('span');
    var span2 = document.createElement('span');
    setElemText(span1, label + ": ");
    line.appendChild(span1);
    setElemText(span2, value);
    span2.style.color = color;
    line.appendChild(span2);
    if (right) line.style.float = "right";
    if (underline) line.style.borderBottom = "1px solid #bbbbbb";
    if (className != null) line.className = className;
    e.appendChild(line);
  }
 
  var elem = document.getElementById("infoContent");
  while (elem.firstChild) elem.removeChild(elem.firstChild);

  var btn1 = document.getElementById("infoBtn1");
  var btn2 = document.getElementById("infoBtn2");
  btn1.onclick = function() { btn1.className = "infoIcon selected"; btn2.className = "infoIcon"; updateInfo(); historySave(); }
  btn2.onclick = function() { btn1.className = "infoIcon"; btn2.className = "infoIcon selected"; updateInfo(); historySave(); }
  
  if (btn2.className.indexOf("selected") >= 0) {
    var div = document.createElement('div');
    var lastmn = null, mn = null;
    for (var i = 0; i < _history.length; i++) {
      if (mn != lastmn) {
        var span1 = document.createElement('span');
        setElemText(span1, mn + ". ");
        div.appendChild(span1);
        lastmn = mn;
      }
      var mn = parseMoveNumber(_history[i][0]);
      var san = '\u2605';
      if (_history[i].length > 3 && _history[i][3] != null) san = _history[i][3];
      var span2 = document.createElement('span');
      setElemText(span2, san);
      span2.className = "movelink" + (i == _historyindex ? " selected" : "");
      span2.targetindex = i;
      if (i == _historyindex) span2.style.backgroundColor = getGraphPointColor(i, true);
      else span2.style.color = getGraphPointColor(i, true);
      span2.onclick = function() {
        var i = this.targetindex;
        if (i < _history.length && i >= 0 && i != _historyindex) {
          historyMove(i-_historyindex);
        }
      }
      div.appendChild(span2);
      div.appendChild(document.createTextNode(" "));
    }
    elem.appendChild(div);
    return;
  }

  var pos = parseFEN(getCurFEN());
  var curpos = pos.m[1];
  var lastpos = parseFEN(_history[_history.length-1][0]).m[1];

  addline(elem, (pos.w ? "White" : "Black") + " moves", _curmoves.length, "#00ffff", true, "firstline");
  addline(elem, "Move", curpos + " / " + lastpos, "#00ffff", false, "firstline underline", true);

  var i;
  var movebest = null, evalbest = null;
  var evalplayed = null, moveplayed = null;
  var evallastbest = null, movelastbest = null;
  var evallastplayed = null, movelastplayed = null;

  i = _historyindex + 1;
  if (i < _history.length &&  _history[i].length > 3 && _history[i][3] != null) {
    moveplayed = _history[i][3];
    if (_history[i][1] != null) evalplayed = (_history[i][1].black ? -1 : 1) * _history[i][1].score;
  }

  i = _historyindex;
  if (_history[i].length > 3 && _history[i][3] != null) {
    movelastplayed = _history[i][3];
    if (_history[i][1] != null) {
      evallastplayed = (_history[i][1].black ? -1 : 1) * _history[i][1].score;
    }
  }
  if (_history[i].length > 1 && _history[i][1] != null) {
    var m = _history[i][1].move;
    if (m != null)
    for (var j = 0; j < _curmoves.length; j++) 
      if (_curmoves[j].move.from.x == m.from.x &&
          _curmoves[j].move.from.y == m.from.y &&
          _curmoves[j].move.to.x == m.to.x &&
          _curmoves[j].move.to.y == m.to.y) {
        movebest = _curmoves[j].san;
        evalbest = (_history[i][1].black ? -1 : 1) * _history[i][1].score;
      }
  }
  
  i = _historyindex - 1;
  var lastpos = null;
  if (i >= 0 && _history[i].length > 1 && _history[i][1] != null) {
    lastpos = parseFEN(_history[i][0]);
    var errmsgs = checkPosition(lastpos);
    var moves = [];
    if (errmsgs.length == 0) moves = genMoves(lastpos);
    if (_history[i][1] != null) {
      var m = _history[i][1].move;
      if (m != null)
      for (var j = 0; j < moves.length; j++) 
        if (moves[j].from.x == m.from.x &&
            moves[j].from.y == m.from.y &&
            moves[j].to.x == m.to.x &&
            moves[j].to.y == m.to.y) {
          movelastbest = sanMove(lastpos,moves[j],moves);
          evallastbest = (_history[i][1].black ? -1 : 1) * _history[i][1].score;
        }
    }
  }

  var text1 = evalbest == null ? (movebest||"-") : (movebest + " (" + getEvalText(evalbest, true) + ")");
  addline(elem, "Current best", text1, "#ffff00");

  line = document.createElement('div');
  var text2 = evalplayed == null ? (moveplayed||"-") : (moveplayed + " (" + getEvalText(evalplayed, true) + ")" );
  addline(elem, "Current played", text2, "#ffff00");

  if (Math.abs(evalbest) > 900000) evalbest = null;
  if (Math.abs(evalplayed) > 900000) evalplayed = null;
  var text3 = "-";
  if (!(evalbest == null || evalplayed == null || pos == null)) text3 = ((evalbest - evalplayed) * (pos.w ? 1 : -1) / 100).toFixed(2);
  var c = getGraphPointColor(_historyindex + 1);
  if (c == "#008800" || (moveplayed != null && movebest == moveplayed)) c = "#00bb00";
  addline(elem, "Difference", text3, c, false, "underline", true);

  var text4 = evallastbest == null ? (movelastbest||"-") : (movelastbest + " (" + getEvalText(evallastbest, true) + ")");
  addline(elem, "Last best", text4, "#ffff00");

  var text5 = evallastplayed == null ? (movelastplayed||"-") : (movelastplayed + " (" + getEvalText(evallastplayed, true) + ")" );
  addline(elem, "Last played", text5, "#ffff00");

  if (Math.abs(evallastbest) > 900000) evallastbest = null;
  if (Math.abs(evallastplayed) > 900000) evallastplayed = null;
  var text6 = "-";
  if (!(evallastbest == null || evallastplayed == null || lastpos == null)) text6 = ((evallastbest - evallastplayed) * (lastpos.w ? 1 : -1) / 100).toFixed(2);
  var c = getGraphPointColor(_historyindex, true);
  //if (movelastplayed != null && movelastbest == movelastplayed) c = "#00bb00";
  addline(elem, "Difference", text6, c);
}
function showEvals() {
  setElemText(document.getElementById("moves"), "");
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
    node1.onmousedown = function(e) { if (_menu) showHideMenu(false); doHighlightMove(this.index); };
    document.getElementById("moves").appendChild(node1);
  }
  if (_arrow) setArrow(true);
}

// Chess position

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
function parseMoveNumber(fen) {
  var a = fen.replace(/^\s+/,'').split(' ');
  return (a.length > 5 && !isNaN(a[5]) && a[5] != '') ? parseInt(a[5]) : 1;
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

// Move list

function refreshMoves() {
  var pos = parseFEN(getCurFEN());
  _curmoves = [];
  setElemText(document.getElementById("moves"), "");
  var errmsgs = checkPosition(pos);
  if (errmsgs.length == 0) {
    var moves = genMoves(pos);
    for (var i=0; i<moves.length;i++) {
      _curmoves.push({move:moves[i],san:sanMove(pos,moves[i],moves),fen:generateFEN(doMove(pos,moves[i].from,moves[i].to,moves[i].p)),w:!pos.w,eval:null,depth:0});
    }
    if (_curmoves.length == 0) {
      var matecheck = pos.w && isWhiteCheck(pos) || !pos.w && isWhiteCheck(colorflip(pos));
      var div = document.createElement('div');
      div.style.color = "magenta";
      setElemText(div, matecheck ? "Checkmate:" : "Stalemate:");
      document.getElementById("moves").appendChild(div);
      var ul = document.createElement('ul'), li = document.createElement('li');
      setElemText(li, matecheck && pos.w ? "Black wins" : matecheck ? "White wins" : "Draw");
      ul.appendChild(li);
      document.getElementById("moves").appendChild(ul);      
    } else {
      showEvals();
    }
  } else {
    var div = document.createElement('div');
    div.style.color = "red";
    setElemText(div, "Illegal position:");
    document.getElementById("moves").appendChild(div);

    var ul = document.createElement('ul');
    for (var i=0; i<errmsgs.length;i++) {
      var li = document.createElement('li');
      setElemText(li, errmsgs[i]);
      ul.appendChild(li);
    }
    document.getElementById("moves").appendChild(ul);
  }

}

// History

function historyButtons() {
  document.getElementById('buttonBack').className = _historyindex > 0 ? "on" : "off";
  document.getElementById('buttonForward').className = _historyindex < _history.length - 1 ? "on" : "off";
}
function historySave() {
  var data = { _historyindex : _historyindex, _history : _history, _history2 : _history2,
               _fen : getCurFEN(), _depth : _engine == null ? null : _engine.depth,
               _flip : _flip, _edit : _edit, _info : _info, _graph : _graph, _play : _play, _info2 : document.getElementById("infoBtn2").className.indexOf("selected") >= 0 };

  if (typeof browser !== 'undefined' && typeof browser.storage !== 'undefined') browser.storage.local.set(data);
  if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') chrome.storage.local.set(data);
}
function historyLoad() {
  var loadHistory = null;
  var load =  function(res) {
    if (typeof res === 'undefined' || res == null ||
        typeof res._historyindex === 'undefined' || res._historyindex == null ||
        typeof res._history === 'undefined' || res._history == null ||
        typeof res._history2 === 'undefined' ||
        typeof res._fen === 'undefined' || res._fen == null ||
        typeof res._depth === 'undefined' || res._depth == null ||
        typeof res._flip === 'undefined' || res._flip == null ||
        typeof res._edit === 'undefined' || res._edit == null ||
        typeof res._info === 'undefined' || res._info == null ||
        typeof res._info2 === 'undefined' || res._info2 == null ||
        typeof res._graph === 'undefined' || res._graph == null ||
        typeof res._play === 'undefined') return;
    _historyindex = res._historyindex;
    _history = res._history;
    _history2 = res._history2; refreshButtonRevert();
    setCurFEN(res._fen);
    if (_engine != null) _engine.depth = res._depth;
    _flip = res._flip; refreshFlip();
    _play = res._play;
    _edit = res._edit; _info = res._info; _graph = res._graph; refreshEditInfoGraph();
    document.getElementById("infoBtn1").className = "infoIcon" + (res._info2 ? "" : " selected");
    document.getElementById("infoBtn2").className = "infoIcon" + (res._info2 ? " selected" : "");
    historyButtons();
    showBoard();
  }
  if (typeof browser !== 'undefined' && typeof browser.storage !== 'undefined') loadHistory = browser.storage.local.get(null).then((res) => load(rec));
  if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') loadHistory = chrome.storage.local.get(null, load);
}
function historyAdd(fen, oldhistory, move, san) {
  if (_historyindex >= 0 && _history[_historyindex][0] == fen) return;
  var c = null;
  if (oldhistory != null) {
    for (var i = 0; i < oldhistory.length; i++) {
      if (oldhistory[i][0] == fen && oldhistory[i].length > 1) c = oldhistory[i][1];
    }
  } else {
    if (_history2 == null) {
      _history2 = [_historyindex,JSON.parse(JSON.stringify(_history))];
      refreshButtonRevert();
    }
  }
  _historyindex++;
  _history.length = _historyindex;
  _history.push([fen,c,move,san]);
  historyButtons();
  historySave();
}
function historyMove(v, e, ctrl) {
  if (e == null) e = window.event;
  var oldindex = _historyindex;
  if (_historyindex == _history.length - 1
   && _history[_historyindex][0] != getCurFEN()) historyAdd(getCurFEN());
  _historyindex += v
  if (_historyindex < 0) _historyindex = 0;
  if (_historyindex >= _history.length) _historyindex = _history.length - 1;
  if ((e != null && e.ctrlKey && Math.abs(v) == 1) || ctrl) _historyindex = v == 1 ? _history.length - 1 : 0;
  if (v == 0 || (oldindex != _historyindex || getCurFEN() != _history[_historyindex][0])) {
    setCurFEN(_history[_historyindex][0]);
    historyButtons();
    historySave();
    showBoard();
  }
}

// Mouse and keyboard events

function getDragX(x, full) {
  var w = _dragElement.getBoundingClientRect().width;
  var offsetX = document.getElementById('chessboard1').getBoundingClientRect().left + w / 2;
  if (full) return (x - offsetX);
  else if (_flip) return 7-Math.round((x - offsetX) / w);
  else return Math.round((x - offsetX) / w);
}
function getDragY(y, full) {
  var h = _dragElement.getBoundingClientRect().height;
  var offsetY = document.getElementById('chessboard1').getBoundingClientRect().top + h / 2;
  if (full) return (y - offsetY);
  else if (_flip) return 7-Math.round((y - offsetY) / h);
  else return Math.round((y - offsetY) / h);
}

function getCurSan(move) {
  for (var i = 0; i < _curmoves.length; i++)
    if (_curmoves[i].move.from.x==move.from.x && _curmoves[i].move.from.y==move.from.y &&
        _curmoves[i].move.to.x==move.to.x && _curmoves[i].move.to.y==move.to.y &&
        (_curmoves[i].move.p == 'Q' || _curmoves[i].move.p == null)) return _curmoves[i].san;
  return null;
}

function onMouseDown(e) {
  if (_menu) showHideMenu(false, e);
  if (document.onmousemove == graphMouseMove) {
    graphMouseDown(e);
    return;
  }
  if (_dragElement != null) return true;
  if (e == null) e = window.event;
  var elem = target = e.target != null ? e.target : e.srcElement;
  while (target != null && target.id != 'chessboard1' && target.id != 'editWrapper' && target.tagName != 'BODY') {
    target = target.parentNode;
  }  
  if (target == null) return true;
  if (target.id != 'editWrapper' && target.id != 'chessboard1') return true;
  
  if (_edit && target.id == 'chessboard1' && elem.className != null && (e.which === 2 || e.button === 4)) {
      if (getPaintPiece() == elem.className[2]) setPaintPiece('S'); else setPaintPiece(elem.className[2]);
      return;
    } 
      
  if (target.id == 'chessboard1' && ((e.which === 3 || e.button === 2) && _edit ||
     (_clickFrom != null &&  _clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 && _clickFrom.x < 0 && _clickFrom.y < 0))) {
    e.preventDefault();
    paintMouse(e);
    return;
  }
  if (elem.className[2] == '-' && target.id == 'chessboard1') return true;
  document.onmousemove = onMouseMove;
  document.body.focus();
  document.onselectstart = function () { return false; };
  elem.ondragstart = function () { return false; };
  _dragActive = false;
  _dragElement = elem;
  _startX = e.clientX;
  _startY = e.clientY;  
  _dragCtrl = target.id == 'editWrapper' ? true : e.ctrlKey;
  return false;

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
  if (!_dragCtrl) showLegalMoves({x:getDragX(_startX),y:getDragY(_startY)});
}

function onMouseMove(e) {
  if (_dragElement == null) return;
  if (e == null) e = window.event;
  if (!_dragActive) {
    if (Math.abs(e.clientX - _startX) < 8 && Math.abs(e.clientY - _startY) < 8) return;
    if (getDragX(_startX) > 7 && 'PNBRQK'.indexOf(_dragElement.className[2].toUpperCase()) < 0) return;
    dragActivate();
  }
  _dragElement.style.left = getDragX(e.clientX, true) + 'px';
  _dragElement.style.top = getDragY(e.clientY, true) + 'px';
  _dragElement.style.color = 'transparent'; setElemText(_dragElement, '-'); // force browser to refresh pop-up
}

function onMouseUp(e) {
  if (document.onmousemove == graphMouseMove) return;
  onMouseMove(e);
  if (!_dragActive && _clickFrom != null &&  _clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 ) {
    var old = _dragElement;
    _dragElement = _clickFromElem;
    var x2 = getDragX(e.clientX);
    var y2 = getDragY(e.clientY);
    _dragElement = old;
    var oldfen = getCurFEN();
    var pos = parseFEN(oldfen);
    var legal = isLegal(pos,_clickFrom,{x:x2,y:y2});
    if (legal) {
      var move = {from:_clickFrom,to:{x:x2,y:y2}};
      var san = getCurSan(move);
      if (pos.w != _play) pos = doMove(pos,_clickFrom,{x:x2,y:y2});
      historyAdd(oldfen);
      setCurFEN(generateFEN(pos));
      historyAdd(getCurFEN(), null, move, san);
      showStatus("");
      showBoard(getCurFEN() == oldfen);
      _dragElement = null;
      doComputerMove();
    } else if (_edit && bounds(_clickFrom.x, _clickFrom.y)) {
       if (bounds(x2, y2) && _clickFrom.x != x2 || _clickFrom.y != y2) {
         pos.b[x2][y2] = pos.b[_clickFrom.x][_clickFrom.y];
         pos.b[_clickFrom.x][_clickFrom.y] = '-';
         fixCastling(pos);
         historyAdd(oldfen);
         setCurFEN(generateFEN(pos));
         historyAdd(getCurFEN());
         showBoard(getCurFEN() == oldfen);
         _dragElement = null;
       }
    }
  }
  if (_dragElement != null) {
    var x2 = getDragX(e.clientX);
    var y2 = getDragY(e.clientY);  
    if (_dragActive) {
      showStatus("");

      var oldfen = getCurFEN();
      var pos = parseFEN(oldfen);
      var x1 = getDragX(_startX);
      var y1 = getDragY(_startY);
      var move = {from:{x:x1,y:y1},to:{x:x2,y:y2}};
      var san = getCurSan(move);
      var legal = !_dragCtrl && isLegal(pos,{x:x1,y:y1},{x:x2,y:y2});
      if (legal) {
        if (pos.w != _play) pos = doMove(pos,{x:x1,y:y1},{x:x2,y:y2});
      } else if (_edit) {
        if (!_dragCtrl) {
          if (bounds(x2, y2)) pos.b[x2][y2] = pos.b[x1][y1];
          if (x1 != x2 || y1 != y2) pos.b[x1][y1] = '-';
        } else {
          if (bounds(x2, y2)) pos.b[x2][y2] = _dragElement.className[2];
        }
        fixCastling(pos);
      }
      historyAdd(oldfen);
      setCurFEN(generateFEN(pos));
      if (!legal) historyAdd(getCurFEN());
      else historyAdd(getCurFEN(), null, move, san);
      showBoard(getCurFEN() == oldfen);
      if (legal) doComputerMove(); 
    } else {
      if (x2 > 7 || x2 < 0) {
        x2 = - Math.round((getDragX(e.clientX, true)
             - document.getElementById('editWrapper').getBoundingClientRect().left
             + document.getElementById('chessboard1').getBoundingClientRect().left) / 30) - 1;
        y2 = - Math.round((getDragY(e.clientY, true)
             - document.getElementById('editWrapper').getBoundingClientRect().top
             + document.getElementById('chessboard1').getBoundingClientRect().top) / 30) - 1;
      }
      if (e.which === 3 || e.button === 2) {
        var list = document.getElementById('editWrapper').children[0].children, p = null;
        for (var i = 0; i < list.length; i++) {
          var x2c = - Math.round((list[i].getBoundingClientRect().left - document.getElementById('editWrapper').getBoundingClientRect().left) / 30) - 1;
          var y2c = - Math.round((list[i].getBoundingClientRect().top - document.getElementById('editWrapper').getBoundingClientRect().top) / 30) - 1;
          if (list[i].className != null && x2c == x2 && y2c == y2) p = list[i].className[2];
        }
        if (p != null) {
          if (p == 'S') setCurFEN(START);
          else if (p == '-') setCurFEN("8/8/8/8/8/8/8/8 w - - 0 0");
          else {
            var pos = parseFEN(getCurFEN());
            for (var x = 0; x < 8; x++) for (var y = 0; y < 8; y++) if (pos.b[x][y] == p) pos.b[x][y] = '-';
            fixCastling(pos);
            setCurFEN(generateFEN(pos));
          }
          historySave();
          showBoard();
        }
      } else if (_clickFrom != null &&  _clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 && _clickFrom.x == x2 && _clickFrom.y == y2) {
        showLegalMoves(null);
      } else {
        showLegalMoves({x:x2,y:y2});
      }
    }
  } else {
    if (_clickFrom == null || _clickFrom.x > 0 && _clickFrom.y > 0) showLegalMoves(null);
  }
  document.onmousemove = null;
  document.onselectstart = null;
  _dragElement = null;

}

function onWheel(e) {
  if (_menu) showHideMenu(false);
  if (e.ctrlKey) return;
  if (_edit) {
    var p = getPaintPiece();
    var str = 'pPnNbBrRqQkK-S';
    var index = str.indexOf(p);
    if (index >= 0) {
      if (e.deltaY < 0) index--;
      if (e.deltaY > 0) index++;
      if (index < 0) index = str.length - 1;
      if (index == str.length) index = 0;
      setPaintPiece(str[index]);
    }
    
  } else {
    if (e.deltaY < 0) historyMove(-1);
    if (e.deltaY > 0) historyMove(+1);
  }
  e.preventDefault();
}

function setPaintPiece(newp) {
  var list = document.getElementById('editWrapper').children[0].children, newe = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].className != null && list[i].className[2] == newp) newe = list[i];
  }
  if (newe != null) {
    var x2 = - Math.round((newe.getBoundingClientRect().left - document.getElementById('editWrapper').getBoundingClientRect().left) / 30) - 1;
    var y2 = - Math.round((newe.getBoundingClientRect().top - document.getElementById('editWrapper').getBoundingClientRect().top) / 30) - 1;
    showLegalMoves({x:x2,y:y2});
  }
}
function getPaintPiece() {
  var list = document.getElementById('editWrapper').children[0].children;
  for (var i = 0; i < list.length; i++) {
    if (list[i].className != null && list[i].className.indexOf(" h0") > 0) return list[i].className[2];
  }
  return 'S';
}
function paintMouse(e, p) {
  if (e == null) e = window.event;
  var elem = target = e.target != null ? e.target : e.srcElement;
  var w = elem.getBoundingClientRect().width;
  var h = elem.getBoundingClientRect().height;
  var offsetX = document.getElementById('chessboard1').getBoundingClientRect().left + w / 2;
  var offsetY = document.getElementById('chessboard1').getBoundingClientRect().top + h / 2;
  var x1 = Math.round((e.clientX - offsetX) / w);
  var y1 = Math.round((e.clientY - offsetY) / h);  
  if (_flip) { x1 = 7-x1; y1 = 7-y1; }
  if (bounds(x1, y1) && (_clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 || (e.which === 3 || e.button === 2))) {
    var pos = parseFEN(getCurFEN());
    var newp = null;
    if (e.ctrlKey || (e.which === 3 || e.button === 2)) newp = '-';
    else newp = p != null ? p : _clickFromElem.className[2];
    pos.b[x1][y1] = newp;
    fixCastling(pos);
    setCurFEN(generateFEN(pos));
    historySave();
    showBoard();
    if (p == null) document.onmousemove = function(event) { paintMouse(event, newp); };
  } else document.onmousemove = null;
}

function onKeyDown(e) {
  var k = e.keyCode || e.which;
  var c = String.fromCharCode(e.keyCode || e.which).replace(" ","-");
  if (k == 96) { if (_engine != null) command("depth 0"); showBoard(false, true); }
  else if (k == 106) { if (_engine != null) command("depth 10"); showBoard(false, true); }
  else if (k == 107) { if (_engine != null) command("depth " + Math.min(128, _engine.depth+1)); showBoard(false, true); }
  else if (k == 109) { if (_engine != null) command("depth " + Math.max(0, _engine.depth-1)); showBoard(false, true); }
  else if (k == 38 || k == 37) historyMove(-1);
  else if (k == 33) historyMove(-10);
  else if (k == 36) historyMove(-1,null,true);
  else if (k == 40 || k == 39) historyMove(+1);
  else if (k == 34) historyMove(+10);
  else if (k == 35) historyMove(+1,null,true);
  else if (c == 'R') showBoard(false, true);
  else if (k == 27) command("revert");
  else if (c == 'F') command("flip");
  else if (c == 'S') command("sidetomove");
  else if (c == 'E') doEditInfoGraph(true,false,false);
  else if (c == 'I') doEditInfoGraph(false,true,false);
  else if (c == 'G') doEditInfoGraph(false,false,true);
}

// Evaluation engine

function loadEngine() {
  var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
  try { var worker = new Worker(wasmSupported ? 'stockfish.wasm.js' : 'stockfish.js'); }
  catch(err) { return null; }
  var engine = {ready: false, kill: false, depth: 10, lastnodes: 0};
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
        if (engine.lastnodes == 0) engine.fen = fen;
        if (matches.length > 4) {
          var nodes = Number(matches[4]);
          if (nodes < engine.lastnodes) engine.fen = fen;
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
      if (str.indexOf("bestmove") >= 0 || str.indexOf("mate 0") >= 0 || str == "info depth 0 score cp 0") {
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
function addHistoryEval(index, score, depth, move) {
  if (_history[index].length < 2 || _history[index][1] == null || (_history[index][1] != null && _history[index][1].depth < depth)) {
    var black = _history[index][0].indexOf(" b ") > 0;
    var ei = {score: score, depth: depth, black: black, move: move};
    if (_history[index].length >= 2) _history[index][1] = ei;
    else { _history[index].push(ei); _history[index].push(null); }
    repaintGraph();
    updateInfo();
  }
}
function evalNext() {
  for (var i=0; i<_curmoves.length; i++) {
    if (_curmoves[i].depth < _engine.depth) {
      var curpos = _curmoves[i].fen;
      _engine.score = null;
      if (!_engine.ready) return;
      _engine.ready = false;
      _engine.eval(curpos, function done(str) {
        _engine.ready = true;
        if (i >= _curmoves.length || _curmoves[i].fen != curpos) return;
        if (_engine.score != null) {
          _curmoves[i].eval = _curmoves[i].w ? _engine.score : -_engine.score;
          _curmoves[i].depth = _engine.depth;

          var m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
          _curmoves[i].answer = (m && m.length > 1 && m[1].length == 4) ? m[1] : null;
          showEvals();
        }
        if (!_engine.kill) evalNext();
      });
      return;
    }
  }
  if (_curmoves.length > 0 && _history[_historyindex][0] == getCurFEN()) addHistoryEval(_historyindex, _curmoves[0].w ? -_curmoves[0].eval : _curmoves[0].eval, _engine.depth, _curmoves[0].move);
  for (var i=_history.length-1; i>=0; i--) {
    if (_history[i].length < 2 || _history[i][1] == null || (_history[i][1] != null && _history[i][1].depth < _engine.depth-1)) {
      var curpos = _history[i][0];
      _engine.score = null;
      if (!_engine.ready) return;
      if (checkPosition(parseFEN(curpos)).length > 0) {
        addHistoryEval(i, null, _engine.depth-1);
        if (!_engine.kill) evalNext();
      } else {
        _engine.ready = false;
        _engine.eval(curpos, function done(str) {
          _engine.ready = true;
          if (i >= _history.length || _history[i][0] != curpos) return;
          if (_engine.score != null) {
            var m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
            var answer = (m && m.length > 1 && m[1].length == 4) ? m[1] : null;
            addHistoryEval(i, _engine.score, _engine.depth-1, parseBestMove(answer));
          }
          if (!_engine.kill) evalNext();
        });
      }
      return;
    }
  }
  historySave();
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
function parseBestMove(m) {
  if (m == null || m.length < 4) return null;
  return {from:{x:"abcdefgh".indexOf(m[0]),y:"87654321".indexOf(m[1])},
          to:{x:"abcdefgh".indexOf(m[2]),y:"87654321".indexOf(m[3])}};
}
function evalAll() {
  if (_play != null) return;
  if (_engine == null || !_engine.ready) {
    if (_engine) _engine.kill = true;
    window.setTimeout(evalAll, 50);
    return;
  }
  _engine.kill = false;
  _engine.ready = false;
  for (var i=0; i<_curmoves.length; i++) {
    _curmoves[i].eval = null;
    _curmoves[i].depth = null;
  }
  document.getElementById("moves").scrollTo(0, 0);
  if (_engine.depth == 0) { _engine.ready = true; return; }
  var fen = getCurFEN();
  _engine.send("stop");
  _engine.send("ucinewgame");
  _engine.score = null;
  if (_curmoves.length == 0) {
    _engine.ready = true;
    if (!_engine.kill) evalNext();
    return;
  }
  _engine.eval(fen, function done(str) {
    _engine.ready = true;
    if (fen != getCurFEN()) return;
    var matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
    if (matches && matches.length > 1) {
      applyEval(matches[1], _engine.score, _engine.depth - 1);
      if (_history[_historyindex][0] == fen) addHistoryEval(_historyindex, _engine.score, _engine.depth - 1, parseBestMove(matches[1]));
    }
    if (!_engine.kill) evalNext();
  }, function info(depth, score, pv0) {
    if (fen != getCurFEN()) return;
    applyEval(pv0, score, depth - 1);
    if (_history[_historyindex][0] == fen) addHistoryEval(_historyindex, score, depth - 1, parseBestMove(pv0));
  });
}

function doComputerMove() {
  if (_play == null) return;
  var fen = getCurFEN();
  if (_play == (fen.indexOf(" b ") > 0)) return;
  if (_engine == null || !_engine.ready) {
    if (_engine) _engine.kill = true;
    window.setTimeout(function() { doComputerMove(); }, 50);
    return;
  }
  if (_engine.depth == 0) {
    if (_curmoves.length == 0) return;
    var move = _curmoves[Math.floor(Math.random()*_curmoves.length)].move;
    var san = getCurSan(move);
    var pos = doMove(parseFEN(fen),move.from,move.to,move.p);
    historyAdd(fen);
    setCurFEN(generateFEN(pos));
    historyAdd(getCurFEN(), null, move, san);
    showStatus("");
    showBoard(false);
  } else {
    _engine.kill = false;
    _engine.ready = false;
    _engine.send("stop");
    _engine.send("ucinewgame");
    _engine.score = null;
    _engine.eval(fen, function done(str) {
      _engine.ready = true;
      if (fen != getCurFEN()) return;
      var matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
      if (matches && matches.length > 1) {
        var move = parseBestMove(matches[1]);
        var san = getCurSan(move);
        var pos = doMove(parseFEN(fen),move.from,move.to,move.p);
        historyAdd(fen);
        setCurFEN(generateFEN(pos));
        historyAdd(getCurFEN(), null, move, san);
        showStatus("");
        showBoard(false);
      }
    });
  }
 
}

// Evaluation graph

var _lastMouseDataPos = null;
function getGraphPointData(i) {
  var e = null, black = false;
  if (i >= 0 && i < _history.length && _history[i].length >= 2 && _history[i][1] != null && _history[i][1].score != null) {
    black = _history[i][1].black;
    e = _history[i][1].score / 100;
    if (black) e = -e;
    if ((e || 0) > 6) e = 6;
    else if ((e || 0) < -6) e = -6;
  }
  return e;
}
function getGraphPointColor(i, light) {
  var e = getGraphPointData(i), laste = getGraphPointData(i-1);
  black = i >= 0 && i < _history.length && _history[i].length >= 2 && _history[i][1] != null && _history[i][1].score != null && _history[i][1].black;
  var lost = laste == null || e == null ? 0 : black ? (laste - e) : (e - laste);
  return lost <= 0.5 && (light != true) ? "#008800" : lost <= 1.0 ? "#00bb00" : lost <= 3.0 ? "#bb8800" : "#bb0000";
}
function showGraphStatus(i) {
  if (i >= 0 && i < _history.length && _history[i] != null && _history[i].length > 3 && _history[i][3] != null) {
    var pos = parseFEN(_history[i][0]);
    var text = (pos.w ? (pos.m[1]-1) + "... " : pos.m[1] + ". ") + _history[i][3];
    showStatus(text);
  } else showStatus("");
}
function repaintGraph(event) {
  var data = [];
  var color = [];
  var laste = null;
  for (var i = 0; i < _history.length; i++) {
    data.push(getGraphPointData(i));
    color.push(getGraphPointColor(i));
  }
  var border1 = 8.5, border2 = 18.5;
  var xMax = 100, yMax = 2, xStep = 10, yStep = 1;
  for (var i = 0; i < data.length; i++) if (Math.ceil(Math.abs(data[i])) > yMax) yMax = Math.ceil(Math.abs(data[i]));
  if (data.length > xMax) xMax = data.length;
  
  if (event != null) {
    var rect = document.getElementById("graph").getBoundingClientRect();
    var mx = event.clientX - rect.left;
    var my = event.clientY - rect.top;
    var mouseDataPos = null;
    var mUnit = (rect.width - border1 - border2) / xMax;
    if (mx > border2 + mUnit / 2 && mx < rect.width - border1 + mUnit / 2 && my > border1 && my < rect.height - border2) {
      mouseDataPos = Math.round((mx - border2) / mUnit) - 1;
    }
    if (mouseDataPos == _lastMouseDataPos) return;
    _lastMouseDataPos = mouseDataPos;
  } else _lastMouseDataPos = mouseDataPos;

  var canvas = document.getElementById("graph");
  var ctx = canvas.getContext("2d");
  canvas.width = document.getElementById("graphWrapper").clientWidth;
  canvas.height = document.getElementById("graphWrapper").clientHeight;
  var yTotal = canvas.height - border1 - border2, xTotal = canvas.width - border1 - border2;
  var xUnit = xTotal / (xMax / xStep), yUnit = yTotal / (yMax * 2 / yStep);
  if (yUnit > 0)  while (yUnit < 12) { yUnit *= 2; yStep *= 2; }
  if (xUnit > 0)  while (xUnit < 18) { xUnit *= 2; xStep *= 2; }
  
  ctx.font = "9px Segoe UI";
  ctx.textAlign = "right";
  ctx.textBaseline="middle"; 
  ctx.lineWidth = 1;
  ctx.fillText("0", border2 - 4, border1 + yTotal / 2);
  ctx.beginPath();   
  ctx.strokeStyle="#d5d5d5";
  for (var i = yStep; i <= yMax; i += yStep) {
    if (i == 0) continue;
    var y = Math.round(i * yUnit / yStep);
    ctx.fillText("+" + i, border2 - 4, border1 + yTotal / 2 - y);
    ctx.fillText("-" + i, border2 - 4, border1 + yTotal / 2 + y);
    if (i < yMax) {
      ctx.moveTo(border2,border1 + yTotal / 2 - y);
      ctx.lineTo(border2 + xTotal,border1 + yTotal / 2 - y);
      ctx.moveTo(border2,border1 + yTotal / 2 + y);
      ctx.lineTo(border2 + xTotal,border1 + yTotal / 2 + y);
    }
  }
  ctx.textAlign = "center";
  for (var i = 0; i <= xMax; i += xStep) {
    var x = Math.round(i * xUnit / xStep);
    ctx.fillText(i / 2, border2 + x, border1 + yTotal + border2 / 2);
    if (x > 0) {
      ctx.moveTo(border2 + x,border1);
      ctx.lineTo(border2 + x,border1 + yTotal);
    }
  }
  ctx.stroke();

  ctx.beginPath(); 
  ctx.strokeStyle="#b5b5b5";
  ctx.strokeRect(border2,border1,xTotal,yTotal);
  ctx.moveTo(border2,border1 + yTotal / 2);
  ctx.lineTo(border2 + xTotal,border1 + yTotal / 2);
  ctx.stroke();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i] != null && data[i-1] != null) {
      ctx.beginPath();
      ctx.strokeStyle = color[i];
      ctx.lineWidth = 2;
      ctx.moveTo(border2 + i * (xUnit / xStep), border1 + yTotal / 2 - data[i - 1] * (yUnit / yStep));
      ctx.lineTo(border2 + (i+1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep));
      ctx.stroke();
    }
  }
  
  for (var i = 0; i < data.length; i++) {
      if (i == mouseDataPos) {
        ctx.beginPath();
        ctx.arc(border2 + (i+1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 4, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'black';
        ctx.fill();
      } else
      if (i == _historyindex) {
        ctx.beginPath();
        ctx.arc(border2 + (i+1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 4, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(border2 + (i+1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();        
      } else {
        ctx.beginPath();
        ctx.arc(border2 + (i+1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 1.5, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'black';
        ctx.fill();
      }
  }
  showGraphStatus(mouseDataPos);
  repaintLastMoveArrow();
}

function graphMouseMove(event) {
  if (document.getElementById("graph").getBoundingClientRect().width == 412) repaintGraph(event);
}

function graphMouseDown(event) {
  if (document.getElementById("graph").getBoundingClientRect().width != 412) return;
  if (_lastMouseDataPos != null) {
    var i = _lastMouseDataPos;
    if (i < _history.length && i >= 0 && i != _historyindex) {
      historyMove(i-_historyindex);
    }
  }
}

// Buttons and menu

function refreshButtonRevert() {
  if (_history2 == null) {
    document.getElementById('buttonRevert').className = "off";
    document.getElementById('buttonRevert').onclick = null;
  } else {
    document.getElementById('buttonRevert').className = "on";
    document.getElementById('buttonRevert').onclick = function(e) {
      command(e.ctrlKey ? "keep" : "revert");
    };
  }
}

function refreshFlip() {
  var elem = document.getElementById('cbTable');
  for (var i = 0; i < 8; i++) {
    elem.children[0].children[0].children[1+i].innerText =
    elem.children[0].children[9].children[1+i].innerText = 'abcdefgh'[_flip ? 7-i : i];
    elem.children[0].children[1+i].children[0].innerText =
    elem.children[0].children[1+i].children[i==0?2:1].innerText = '12345678'[_flip ? i : 7-i];
  }
  showBoard(true);
}
function doFlip() {
  _flip = !_flip;
  refreshFlip();
  historySave();
}
function refreshEditInfoGraph() {
  document.getElementById("buttonEdit").className = _edit ? "on down" : "on";
  document.getElementById("buttonInfo").className = _info ? "on down" : "on";
  document.getElementById("buttonGraph").className = _graph ? "on down" : "on";
  document.getElementById("container").className = _edit ? "edit" : _info ? "info" : _graph ? "graph" : "";
  if (_graph) repaintGraph();
  if (_info) updateInfo();
  if (!_edit) setPaintPiece('S');
}
function doEditInfoGraph(edit, info, graph) {
  _edit = edit ? !_edit : false;
  _info = info ? !_info : false;
  _graph = graph ? !_graph : false;
  refreshEditInfoGraph();
  historySave();
}

function showHideMenu(state, e) {
  if (e != null) {
    var target = e.target != null ? e.target : e.srcElement;
    while (target != null && target.id != 'buttonMenu' && target.id != 'menu' && target.tagName != 'BODY') target = target.parentNode;
    if (target == null) return;
    if (!state && (target.id == 'buttonMenu' || target.id == 'menu')) return;
  }
  if (state) _menu = !_menu; else _menu = false;
  document.getElementById("buttonMenu").className = _menu ? "on down" : "on";
  document.getElementById("menu").style.display = _menu ? "" : "none";
  if (_menu) reloadMenu();
}

function reloadMenu() {

  var parent = document.getElementById("menu");
  while(parent.firstChild) parent.removeChild(parent.firstChild);
  var addMenuLine= function() {
    var div = document.createElement('div');
    div.className = "menuLine";
    parent.appendChild(div);    
  }  
  var addMenuItem = function(className, text, key, enabled, func) {
    var div = document.createElement('div');
    div.className = "menuItem " + className;
    if (!enabled) div.className += " disabled";
    var span1 = document.createElement('span');
    setElemText(span1, text);
    div.appendChild(span1);
    var span2 = document.createElement('span');
    span2.className = "key";
    if (key != null) setElemText(span2, key);
    div.appendChild(span2);
    if (enabled) div.onclick = func;
    parent.appendChild(div);
  }
  var addMenuItemEngine = function(className, text) {
    var div = document.createElement('div');
    div.className = "menuItem " + className;
    var span1 = document.createElement('span');
    setElemText(span1, text);
    div.appendChild(span1);
    var span2= document.createElement('span');
    span2.id = "buttonEnginePlus";
    span2.onclick = function() { 
      if (_engine != null) command("depth " + Math.min(128, _engine.depth+1));
      showBoard(false, true);
      if (_engine != null) setElemText(document.getElementById("buttonEngineValue"), _engine.depth);
    }
    div.appendChild(span2);
    var span3= document.createElement('span');
    span3.id = "buttonEngineValue";
    span3.onclick = function() { 
      if (_engine != null) command("depth 10");
      showBoard(false, true);
      if (_engine != null) setElemText(document.getElementById("buttonEngineValue"), _engine.depth);
    }
    if (_engine != null) setElemText(span3, _engine.depth);
    div.appendChild(span3);
    var span4= document.createElement('span');
    span4.id = "buttonEngineMinus";
    span4.onclick = function() { 
      if (_engine != null) command("depth " + Math.max(0, _engine.depth-1));
      showBoard(false, true);
      if (_engine != null) setElemText(document.getElementById("buttonEngineValue"), _engine.depth);
    }
    div.appendChild(span4);
    parent.appendChild(div);
  }    

  if (_play != null)
    addMenuItem("menuPlay", "Stop playing against computer", null, true, function() { _play = null; showBoard(false); showHideMenu(false); historySave(); });
  else
    addMenuItem("menuPlay", "Play against computer", null, true, function(e) { _play = e.ctrlKey; showBoard(false); doComputerMove(); showHideMenu(false); historySave(); });
  addMenuItemEngine("menuEngine", "Engine depth");
  addMenuLine();
  addMenuItem("menuKeep", "Keep changes", null, document.getElementById("buttonRevert").className == "on", function() { command("keep"); showHideMenu(false); });
  addMenuItem("menuRevert", "Revert changes", "ESC", document.getElementById("buttonRevert").className == "on", function() { command("revert"); showHideMenu(false); });
  addMenuLine();
  addMenuItem("menuFlip", "Flip board", "F", true, function() { command("flip"); showHideMenu(false); });
  addMenuItem("menuStm", "Change side to move", "S", true, function() { command("sidetomove"); showHideMenu(false); });
  addMenuLine();
  addMenuItem("menuStart", "Go to game start", "Home", document.getElementById("buttonBack").className == "on", function() { historyMove(-1,null,true); showHideMenu(false); });
  addMenuItem("menuEnd", "Go to game end", "End", document.getElementById("buttonForward").className == "on", function() { historyMove(+1,null,true); showHideMenu(false); });
  addMenuItem("menuReset", "Reset game/position", null, true, function() { command("reset"); showHideMenu(false); });
  addMenuLine();
  addMenuItem("menuAbout", "About...", null, true, function() {
    window.open([location.protocol, '//', location.host, location.pathname].join('').replace("simplechessboard.html","about.html"), "_blank");
    showHideMenu(false); });
}

// URL paramenters

function getParameterByName(name, url) {
  if (!url) {
    url = window.location.href;
  }
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results || !results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// Initialization

window.onload = function() {
  document.onmousedown = onMouseDown;
  document.onmouseup = onMouseUp;
  document.onkeydown = onKeyDown;
  document.getElementById("chessboard1").oncontextmenu = function() { return false; };
  document.getElementById("chessboard1").onwheel = onWheel;
  document.getElementById("editWrapper").onwheel = onWheel;
  document.getElementById("editWrapper").oncontextmenu = function() { return false; };
  document.getElementById("buttonStm").onclick = function() { command("sidetomove"); };
  document.getElementById("buttonBack").onclick = function(event) { historyMove(-1,event); };
  document.getElementById("buttonForward").onclick = function(event) { historyMove(+1,event); };
  document.getElementById("buttonRefresh").onclick = function() { showBoard(false); };
  document.getElementById("buttonFlip").onclick = function() { doFlip(); };
  document.getElementById("buttonWindow").onclick = function() { command("window"); };
  document.getElementById("buttonEdit").onclick = function() { doEditInfoGraph(true,false,false); };
  document.getElementById("buttonInfo").onclick = function() { doEditInfoGraph(false,true,false); };
  document.getElementById("buttonGraph").onclick = function() { doEditInfoGraph(false,false,true); };
  document.getElementById("buttonMenu").onclick = function(event) { showHideMenu(true,event); };
  document.getElementById("graph").onmouseover = function() { document.onmousemove = graphMouseMove; };
  document.getElementById("graph").onmouseout = function() { if (document.onmousemove == graphMouseMove) document.onmousemove = null; repaintGraph(); };
  document.getElementById("graph").onwheel = function(event) { onWheel(event); showGraphStatus(_historyindex); };

  setupInput();
  showBoard();
  _engine = loadEngine();
  historyLoad();
  command(getParameterByName("x"));
}
