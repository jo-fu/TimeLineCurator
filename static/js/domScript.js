var scaleFactor;
var itemHeight = 20;
var puffer = 60;

var sentTx = false;

var numberTimexes = 0;
var timexes = [];
var currId, dct;
var shifted = false;
var openedInput = false;
var docNr = -1;
var trackNr = 0;

var colorDate = [ "55,126,184","77,175,74","152,78,163","255,127,0","228,26,28","166,86,40" ];

// Shift allows selecting several elements --> no user select, when Shift pressed
$(document).on('keyup keydown', function(e){
  shifted = e.shiftKey;
  if(shifted){ $('#leftBox, #timeline').addClass("nouserselect") }
  else{ $('#leftBox, #timeline').removeClass("nouserselect") }
  });

$(document).ready( function(){ 
  $(".ctlBtns")
    .on("mouseover" , function(){ 
      var el = $(this).attr("id");
      if(el!="addDoc" && el!="prevDate" && el!="nextDate" && el!="tool_delete"){
        showTooltip($(this),"#tooltipbox")
      }
      
    })
    .on("mouseout" , function(){ $(".tt").css("display","none") })
})

function showTooltip(t,tt){
  $(tt)
      .css({ "display": "block" , "top" : t.position().top + 5 })
      .html(t.attr("title"))
  if(t.attr("id")=="addDoc"){ $(tt).css("left" , t.offset().left - 5) }
}

function showlabel(d){
  var ww = $("#topBox").width();
  var thisid = "#timelineItem_" + d.id;

  var labely = $("#topBox").height() - parseInt($(thisid).position().top)+2;
  var labelx = parseInt($(thisid).position().left);
  var toofarright = labelx>ww-200
  if(toofarright){ labelx = labelx-200 } // don't know yet width of label

  $("#eventlabel")
    .css({ left : labelx , bottom : labely , "display" : "block"})
    .html(d.sub)

  if(toofarright){ $("#eventlabel").css({ left : (labelx+200-$("#eventlabel").width()+itemHeight/2) })}
}

function getDCT(file){ return file.match(/<DATE_TIME>([^<]*)<\/DATE_TIME>/)[1] }

function setSentTx(id){ sentTx = id; }

// Check Date Input
function validate(event,el) {

  var key = window.event ? event.keyCode : event.which;
  if(event.key == "Enter" || key == 13){
    if(!el){ $("#check").trigger('click') }
    else{ el.blur() }
  }

  if(!el){
    if (key == 8 || key == 9 || key == 46 || key == 37 || key == 39 || key == 88) { return true; }
    else if ( key < 48 || key > 57 ) { return false; }
    else{ return true; }
  }
};


// Behaviour
function openInput(){
    $("#inputOverlay").fadeIn(300);
    $(".chooseTrack").removeClass("chosen")
    $("#chooseTrack_"+(trackNr)).addClass("chosen")
    var today = getToday()
    $("#todayInput").val(today)
    if(!openedInput){
      $(".chooseTrack").on( "click" , function(){
        $(".chooseTrack").removeClass("chosen")
        // CONTINUE HERE
        trackNr = $(this).attr("id").split("_")[1]
        $("#"+$(this).attr("id")).addClass("chosen")
      })
      openedInput = true;
    }
    $(document).on("keydown" , exitOverlay )
}

function showURL(){
    $("#url-form").toggle(0);
}

function exitOverlay(e){ if(e.keyCode == 27){ closeInput() } }

function closeInput(){
  $(document).off("keydown",exitOverlay)
  $("#inputOverlay").fadeOut(300);
  $('#inputOverlay input[name="title"]').val("")
  $('#inputOverlay input[name="date"]').val("")
  $('#inputOverlay textarea[name="content"]').val("")
  $('#inputOverlay input[name="source"]').val("")
}