function showPage(i) {
  for (var j = 1; j <= 3; j++) document.getElementById("page"+j).style.display = i==j ? "" : "none";
}
window.onload = function() {
  document.getElementById("button1").onclick = function() { showPage(1); };
  document.getElementById("button2").onclick = function() { showPage(2); };
  document.getElementById("button3").onclick = function() { showPage(3); };
}