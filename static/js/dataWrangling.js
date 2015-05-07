/* PYTHON AJAX REQUEST */
function preprocessing(){

  var title = cleanUpInput($('#inputOverlay input[name="title"]').val());
  if(!title) title = "No title"
  dct = $('#inputOverlay input[name="date"]').val();
  if(!dct){ today = getToday(); dct = today; }

  var content = cleanUpInput($('#inputOverlay textarea[name="content"]').val())

  if(content.length==0){
    alert("You have to enter some text, otherwise we can't find any temporal expressions. If you don't have one handy, choose one from the example files below.");
    var jsonout = ""
  }
  else{
    var jsonout = "<?xml version=\"1.0\" ?>\n<DOC>\n<BODY>"+
    "\n<TITLE>"+title+"</TITLE>"+
    "\n<DATE_TIME>"+dct+"</DATE_TIME>"+
    "\n<TEXT>"+content+"</TEXT>\n"+
    "</BODY>\n</DOC>"
    }
    return jsonout
  }

function getToday(){
  var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();

    if(dd<10) { dd='0'+dd }
    if(mm<10) { mm='0'+mm }

    today = yyyy+'-'+mm+'-'+dd;
    return today;
}

function orderArray(t){
  // Order
  var sortedT = t.sort(function(a, b){
    var a = a.val, b = b.val;
    if(a < b) return -1;
    if(a > b) return 1;
    return 0;
  });

  return sortedT;
}

function orderArrayByIndex(t){

  var sortedByIndex = t.sort(function(a, b){
    var keyA = a.id, keyB = b.id;
    // Compare the 2 dates
    if(keyA < keyB) return -1;
    if(keyA > keyB) return 1;
    return 0;
  });
  return sortedByIndex;
}

function checkIfDate(val){
    var isDate = !isNaN(val) || val == "????"
    if(isDate){ var thisTitle = prettifyDate(val) }
    else{ var thisTitle = prettifyDate(val.split(" - ")[0])+" - "+prettifyDate(val.split(" - ")[1]) ; }
    return thisTitle;
}


function checkyIndizes(d,scaleFactor){
  
  var orderedD = orderArray(d)
  var newyIndex = 1;

  // Array that keeps track of occupation of one track
  var trackArray = [-1000000]

  orderedD.forEach(function(tx){
    var isDate = !isNaN(tx.times[0].starting_time);
    if(isDate && tx.visible){
      var newX = tx.times[0].starting_time * scaleFactor;
      // Occupy track with size of item + 2px Puffer
      newyIndex = 1
      for(var i=0; i<trackArray.length; i++){

        // If element doesn't fit in this track
        if(trackArray[i]>newX){
          newyIndex++;
        }
        else{
          tx.yIndex = newyIndex;
          if(tx.typ == "duration"){ trackArray[newyIndex-1] = (tx.times[0].ending_time  * scaleFactor ) + itemHeight + 32; }
          else{ trackArray[newyIndex-1] = (tx.times[0].ending_time  * scaleFactor ) + itemHeight + 2; }
          break;
        }
        // If it doesn't enter else loop, add new element to array
        if(i==trackArray.length-1){
            tx.yIndex = newyIndex;
            if(tx.typ == "duration"){ trackArray.push((tx.times[0].ending_time * scaleFactor) + itemHeight + 32); }
            else{ trackArray.push((tx.times[0].ending_time * scaleFactor) + itemHeight + 2); }
            
            break;
        }
      }
    }
  })

  var newArray = orderArrayByIndex(orderedD)
  return newArray
}

function checkDuplicates(t){
  // Check for duplicates and increase count if there are any
  var prevDate = 0;
  var prevCount = 1;
  var durCount = 0;

  for(var i = 0; i < t.length; i++){
    if(t[i].typ == "duration" && t[i].visible){ t[i].count = ++durCount; }
    if(prevDate == t[i].val){
      if(t[i-1].visible==true){ t[i].count = ++prevCount; }
      else{ t[i].count = prevCount; }
    }
    prevDate = t[i].val;
    prevCount= t[i].count;
  }
  return t;
}

function checkDuplicatesWithoutOrdering(t){
//called 2times - why?

  for(var i = 0; i < t.length; i++){
    var startCount = 1;
    t[i].count = startCount; 
  }

  var orderedArray = orderArray(t);
  var duplicateArray = checkDuplicates(orderedArray);
  var t = orderArrayByIndex(duplicateArray)
  
  return t;
}

function checkDateLength(d){
  var l = d.length;
  var date;
  // TODO Include Modality here
  if(l==12){ date = new Date(d.substr(0,4) , d.substr(4,2)-1 , d.substr(6,2) , d.substr(8,2) , d.substr(10,2)).getTime(); }
  else if(l==8){ date = new Date(d.substr(0,4) , d.substr(4,2)-1 , d.substr(6,2)).getTime(); }
  else if(l==6){ date = new Date(d.substr(0,4) , d.substr(4,2)-1).getTime() }
  else if(l==4){ date = new Date(d).getTime() }
  
  return date
}

function dateConversion(d,mod){
  var date;
  var newD;
  var isnum = /^\d+$/.test(d);
  // DATE
  if(isnum){
    date = checkDateLength(d)
    newD = { typ : "date" , startVal : date, endVal : date }
  }
  // SPECIAL CASES
  else if(d=="PRESENT_REF"){
    var present = new Date(dct).getTime();
    newD = { typ : "date" , startVal : present, endVal : present }
  }

  // DURATIONS
  else{
    var typ = "duration"
    // Duration with XXXX TO XXXX
    // TODO: what about XXXX,XX TO XXXX,XX,XX etc
    if(d.indexOf("TO")>0){
      var startDate = d.split("TO")[0]
      var endDate = d.split("TO")[1]
      // For the case XXXX - XX
      if(endDate.length==2){ endDate = startDate.substr(0,2) + endDate; }
      var start = checkDateLength(startDate)
      var end = checkDateLength(endDate)
    }
    // Duration e.g. 1980DECADE
    else if(d.indexOf("DECADE")>0){

      // CHECK FOR MOD (if "mid"/"late"/"early" etc)
      var startDate = d.substr(0,4);
      if(mod=="LATE"){ startDate = (parseInt(startDate)+5).toString(); var delta = 10 }
      else if(mod=="MID"){ startDate = (parseInt(startDate)+3).toString(); var delta = 7; }
      else if(mod=="EARLY"){ var delta = 2; }
      else{ var delta = 10 }

      var start = new Date(startDate).getTime();
      var endDate = (parseInt(d.substr(0,4))+delta).toString();
      var end = new Date(endDate).getTime();
      }
    // Duration e.g. 19CENTURY
    else if(d.indexOf("CENTURY")>0){
      var startDate = d.substr(0,2)+"00"

      if(mod=="LATE"){ startDate = (parseInt(startDate)+50).toString(); var delta = 100 }
      else if(mod=="MID"){ startDate = (parseInt(startDate)+30).toString(); var delta = 70; }
      else if(mod=="EARLY"){ var delta = 20; }
      else{ var delta = 100 }

      var start = new Date(startDate).getTime();
      var endDate = (parseInt(d.substr(0,2)+"00")+delta).toString()
      var end = new Date(endDate).getTime();
    }
    // Already transformed
    else if(d.indexOf(" - ")>0){
      var startDate = d.split(" - ")[0]
      var endDate = d.split(" - ")[1]
      var start = checkDateLength(startDate);
      var end = checkDateLength(endDate);
    }
    
    else{ var typ = "neither"; }
      newD = {
        typ : typ ,
        startVal : start,
        endVal : end,
        startDate : startDate,
        endDate : endDate }
    }
  return newD;
}

function prettifyDate(d){
  var l = d.length;
  MM = ["Jan", "Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov", "Dec"];
  var prettyD;

  if(l==12){ prettyD = d.substr(6,2) + " " + MM[parseInt(d.substr(4,2))-1] + " " + d.substr(0,4) + ", "+d.substr(8,2)+":"+d.substr(10,2); }
  else if(l==8){ prettyD = d.substr(6,2) + " " + MM[parseInt(d.substr(4,2))-1] + " " + d.substr(0,4); }
  else if(l==6){ prettyD = MM[parseInt(d.substr(4,2))-1] + " " + d.substr(0,4); }
  else if(l==4){ prettyD = d }
  return prettyD;
}


// Cleaning
function cleanSubtitle(val){

  var newval = val.replace(/<TIMEX2( [^>]*)>/g , "")
      .replace(/<TIMEX2>/g , "")
      .replace(/<\/TIMEX2>/g , "")
      .replace(/&quot;/g , "\"")
      .replace(/&#39;/g , "\'")
      .replace(/\<br\>/g , " ")
      .replace(/\[.*?\]/g, "")
      .replace(/&lt;/g,"<")
      .replace(/&gt;/g,">")
      .replace(/&uuml;/g, "ü").replace(/&Uuml;/g, "Ü")
      .replace(/&auml;/g, "ä").replace(/&Auml;/g, "Ä")
      .replace(/&ouml;/g, "ö").replace(/&Ouml;/g, "Ö")

  newval = newval.trim();

  return newval;
}

function cleanUpInput(input){
  
  // Added because "Jan. 29" broke everything (split into 2 sentences)
  var month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  month.forEach( function(el){
    var abbr = el+"."
    input = input.replace(abbr, el)
  })

  cleanedUp = input
              .replace(/[–—–]/g, "-")
              .replace(/[’']/g, "_APOSTROPHE_")
              .replace(/["“]|”/g, "_QUOTE_")
              .replace(/ü/g, "&uuml;").replace(/Ü/g, "&Uuml;")
              .replace(/ä/g, "&auml;").replace(/Ä/g, "&Auml;")
              .replace(/ö/g, "&ouml;").replace(/Ö/g, "&Ouml;")
              .replace(/ß/g, "&szlig")
              .replace(/€/g, "&euro;")
              .replace(/§/g, "&sect;")
              .replace(/[ÀÁÂÃÅ]/g,"A")
              .replace(/[âàáæãåā]/g,"a")
              .replace(/[ÈÉÊË]/g,"E")
              .replace(/[éèêëė]/g,"e")
              .replace(/[ÔÒÓÕŒØŌ]/g,"O")
              .replace(/[ôòóõœøō]/g,"o")
              .replace(/[ÛÙÚŪ]/g,"U")
              .replace(/[ûùúū]/g,"u")
              .replace(/[ç]/g,"c")
              // Add a full stop to end of paragraph if not there 
              .replace(/([\w\d])\s*\n/g,"$1.\n\n")
              .replace(/</g,"&lt;")
              .replace(/>/g,"&gt;")
              .replace(/&/g, "_AND_") // to also replace the HTML special chars
              // All the rest is replaced with ?
              .replace(/[^\x00-\x7F]/g, "")
  return cleanedUp;
}
