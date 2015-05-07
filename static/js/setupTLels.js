function getCirclePath(datum,beginning,scaleFactor){
  var cx = parseInt(getXPos(datum,beginning,scaleFactor));

  if(isNaN(cx) && datum.val != "1970"){ cx = 150
    console.log("datum: "+datum.val+" beg: "+beginning+", sF: "+scaleFactor)
    }
  var cy = parseInt(getYPos(datum));
  //console.log(datum.id + ": " +cy)
  
  if(datum.visible){ var r = itemHeight/2; }
  else{ var r = 0; }
  var path = "M "+cx+" "+cy+" m -"+r+", 0 a "+r+","+r+" 0 1,0 "+(r*2)+",0 a "+r+","+r+" 0 1,0 -"+(r*2)+",0"
  return path
}

function getLinePath(datum,beginning,scaleFactor){

  var cxStart = parseInt(getXPos(datum,beginning,scaleFactor))+2;
  var cxEnd = puffer/2 + (datum.times[0].ending_time - beginning) * scaleFactor;
  var yPos = parseInt(getYPos(datum))
  var yBottom = yPos - 10
  var yTop = yPos + 10
  var lineTop = yPos-1
  var lineBottom = yPos +1
  
  if(datum.visible){
    var xStart = cxStart-10
    var xEnd = cxEnd+10

    var path =  "M" + xStart + " " + yTop + " L" + xStart + " " + yBottom + " L" + cxStart + " " + lineBottom +
                // Line + Back Triangle
                " L" + cxEnd + " " + lineBottom + " L" + xEnd + " " + yBottom + " L" + xEnd + " " + yTop + " L" + cxEnd + " " + lineTop +
                // Line closing path
                " L" + cxStart + " " + lineTop +" Z"
  }
  else{
    var c = cxStart + ((cxEnd-cxStart)/2)
    // invisible SVG path, deleting animation towards center of span 
    var path = "M"+c+" "+yTop+" L"+c+" "+yBottom+" L"+c+" "+lineBottom +
               " L"+c+" "+lineBottom+" L"+c+" "+yBottom+" L"+c+" "+yTop+" L"+c+" "+lineTop+
               " L"+c+" "+lineTop+" Z"
   }
  
  return path
}

function getSquarePath(datum,beginning,scaleFactor){
  var xLeft = parseInt(getXPos(datum,beginning,scaleFactor)) - 6;
  var xRight = xLeft + 12;
  var yTop = parseInt(getYPos(datum)) - 6
  var yBottom = yTop + 12;
  if(datum.visible){ var path = "M "+xLeft+" "+yTop+" L"+xRight+" "+yTop+" L"+xRight+" "+yBottom+" L"+xLeft+" "+yBottom+" L"+xLeft+" "+yTop+" Z"; }
  else{ var path = "M "+xLeft+" "+yBottom+" L"+xLeft+" "+yBottom+" L"+xLeft+" "+yBottom+" L"+xLeft+" "+yBottom+" L"+xLeft+" "+yBottom+" Z"}
  return path
}

function getXPos(d,beg,scale) {
  var isDate = !isNaN(d.times[0].starting_time);
  if(isDate) var newXPos = puffer/2 + (d.times[0].starting_time - beg) * scale;
  else{
    if(d.count % 3 === 0){ var newXPos = $("#topBox").width() - 56 } 
    else if(d.count % 3 == 1){ var newXPos = $("#topBox").width() - 42 } 
    else{ var newXPos = $("#topBox").width() - 28 }
    }
  return newXPos;
  }

function getYPos(d) {
    var isDate = !isNaN(d.times[0].starting_time);
    var pos = $("#timeline svg").height() - 45;
    var hasCount = (d.count != 1);
    var hasyIndex = (d.yIndex != 1);
    
    if(isDate){
      var newX = pos - (d.yIndex*itemHeight) + 8 // + ((d.count-1)*8)
      return newX
    }
    else{
      var vagueY = $("#timeline svg").height() - $("#topBox").height() + 40 + d.count*5
      return vagueY }
}

function getColor(d){
  var isDate = !isNaN(d.times[0].starting_time);
  var dN = d.trackNr
  var touched = d.touched;
  if(touched) var o = "1"
  else var o = "0.5"
  if(dN!=-1){
    
    return "rgba("+colorDate[dN]+"," + o + ")";
  }
  // Vague or undefined dates
  else{
    return "rgba(111,111,111," + o + ")";
    }
}