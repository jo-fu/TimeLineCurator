var app = angular.module('tlApp', []);

app
.controller('MainCtrl', function($scope, $http, $sce, CreateArray, CreateTimeline, DateHandling, DateExporting) {
	
	$scope.docNr = -1;
	$scope.orderByVal = "id"
	$scope.orderReverse = false
	$scope.editTrack = [false,false,false,false,false,false];
	$scope.tlDescr = ["TimeLineCurator", "Insert a short description for your timeline here"]
	$scope.tempFiles = ["iceland", "journalism", "nasa", "newspapers", "ubc"]
	
	$scope.sortBy = [
		{ title : "Order inside document" , val : "id" },
		{ title : "All dates chronologically" , val : "val" },
		{ title : "Type of event" , val : "typ"},
		{ title : "State of curation" , val : "touched"},
		{ title : "Single documents" , val : "document" },
		{ title : "Single tracks" , val : "trackNr" }
	]
	$scope.fileNames = []
	$scope.trackNames = ["1","2","3","4","5","6"]

	$scope.files = [];
	$scope.dcts = [];
	$scope.timexes = [];
	$scope.currIndex = -1;
	$scope.severalSelected = false;
	$scope.editDate = false;
	$scope.singleSents = []
	$scope.dateInfo = []
	$scope.colorDate = colorDate;

	// If there is a saved session in Local Storage - load it in
	if (localStorage.getItem("savedData") === null) { $scope.prevData = false }
	else{ $scope.prevData = localStorage.getItem("savedData") }

	// Building TL without any dates on it
	CreateTimeline.buildTl($scope)

	// PYTHON CALL
	$scope.getTimexes = function(){
		var myData = preprocessing()
		if(myData!=""){
			thisData = { 'myData' : myData }
			$(".loading").fadeIn(300)
			$.ajax({
			    type: "POST",
			    data: JSON.stringify(thisData, null, '\t'),
			    url: "/dothenlp",
			    contentType: 'application/json;charset=UTF-8',
			    success: function(data){
			    	closeInput()
			    	$(".loading").fadeOut(300)
			    	if(data.result=="something wrong"){ alert("Sorry, something went wrong. Something inside your input...") }
			    	else{ $scope.addDocument(data.result,"fromInput") }
			    }
			})	
		}
	}

	$scope.showDateInfo = function(txObject){ return CreateTimeline.showDateInfo(txObject) }

	// Linked highlighting
	$scope.makeSelection = function(sentNr,d,origin){ $scope = DateHandling.makeSelection($scope, sentNr, d, origin) }

      $scope.clickList = function(d){ var sentNr = d.sentNr; $scope.makeSelection(sentNr,d,"fromList") }
      $scope.clickingCircle = function(d){ var sentNr = d.sentNr; $scope.makeSelection(sentNr,d,"fromCircle"); }
      $scope.clickingSent = function(s){ DateHandling.clickingSent(s, $scope) }

      $scope.highlightSent = function(d,docNr){ CreateTimeline.highlightSent(d,docNr) }
      $scope.scrollToSent = function(id,sent,docNr){ CreateTimeline.scrollToSent(id,sent,docNr) }

      $scope.updateD3Tl = function(tx,dcts,m,fct,nr){ CreateTimeline.updateD3Tl(tx,dcts,m,fct,nr); }
      $scope.markAsTouched = function(d,i){ CreateTimeline.markAsTouched(d,i) }
	$scope.checkThisDate = function(){ DateHandling.checkThisDate($scope); }

	$scope.addTime = function(dir){ DateHandling.addTime($scope.dateInfo[0], dir) }
	$scope.addDay = function(dir){ DateHandling.addDay($scope.dateInfo[0], dir) }
	$scope.addMonth = function(dir){ DateHandling.addMonth($scope.dateInfo[0], dir) }

	$scope.enableEdit = function(el) { DateHandling.enableEdit($scope, el) }
	$scope.disableEdit = function(el) { $scope = DateHandling.disableEdit($scope, el) }

	$scope.highlightTimex = function(text, search) {
		if (!search) { return $sce.trustAsHtml(text); }
		// It's called 3 times... WHY?
    		return $sce.trustAsHtml(text.replace(new RegExp(search, 'gi'), '<span class="hltx">$&</span>'));
	};
	$scope.countTxs = function(docNr,date){ return DateHandling.countTxs($scope.timexes,docNr,date) }

	// TOOLS
	$scope.gohome = function(){
		$scope.dateSelected = false;
		$scope.currIndex = -1;
		d3.selectAll(".timelineItem").classed("selected", false).classed("selectedSec", false);
		$(".tx").removeClass("activeTx")
		$(".timex, .listEl").removeClass("highlighted");
		$scope.dateInfo = []
	}
	$scope.deleteDate = function(){ $scope.timexes = DateHandling.deleteDate($scope) }
	$scope.recoverDate = function(){ $scope.timexes = DateHandling.recoverDate($scope) }
	$scope.addDate = function(){ $scope = DateHandling.addDate($scope,CreateTimeline) }
	$scope.mergeDates = function(){ $scope = DateHandling.mergeDates($scope) }
	$scope.changeUnit = function(unit){ $scope = DateHandling.changeUnit($scope,unit) }
	$scope.switchView = function(v){ DateHandling.switchView(v) }
	$scope.hideDoc = function(v){ $scope.timexes = DateHandling.hideDoc(v,$scope.timexes); $scope.updateD3Tl($scope.timexes,$scope.dcts, "delete") }
	$scope.changeTrack = function(nr){ DateHandling.changeTrack($scope.timexes, $scope.currIndex, nr) }
	$scope.addDocument = function(val,source){ DateHandling.addDocument($scope,$sce,$http,val,source,CreateArray) }
	$scope.arrowKey = function(dir){ DateHandling.arrowKey($scope,dir) }

	$scope.loadData = function(source){ $scope = DateExporting.loadData(source,$scope,$sce,CreateArray,CreateTimeline) }
	$scope.saveState = function(state){ DateExporting.saveState($scope, state) }
	$scope.downloadJson = function(){ $scope.downloadData = false; $scope.exportAsJson(); downloadJson($scope.dataAsJson) }
	$scope.downloadZip = function(){ $scope.downloadData = false; $scope.exportAsJson(); downloadZip($scope.dataAsJson) }
	$scope.exportAsJson = function(){ $scope.downloadData = false; $scope.dataAsJson = DateExporting.exportAsJson($scope.timexes,$scope.fileNames,$scope.tlDescr,$scope.trackNames) }

	$(window).bind( "resize" , function() {
		if(this.id) clearTimeout(this.id);
		this.id = setTimeout($scope.updateD3Tl($scope.timexes, $scope.dcts, "resize"), 500);
	});

	// AUTOSAVE 
	window.setInterval(function(){
  		// TODO: Only autosave when there were changes??
  		// Or when window is in focus
  		$scope.saveState($scope, "autosave")
	}, 60000);
})

// DIRECTIVES
.directive ('unfocus', function() {
	return {
		restrict: 'A',
		link: function (scope, element, attribs) {

			element[0].focus()
			//setTimeout( function(){ element.select() },100)
			//console.log(element[0])
			element.bind("blur", function() { scope.$apply(attribs["unfocus"]);});
			
		} 
    
} })


// SERVICES
.service('SplitSents' , function(){

	this.splitthem = function(d){
		var sents = d.split("<SENTENCES>")[1]
		sents = sents.split("</SENTENCES>")[0]
		//sents = sents.split("', '");
		sents = sents.split(/[\"\'],.?[\"\']/);
		return sents;
	}
})
app.service('CreateTimeline' , function(){

this.buildTl = function($scope){

  	d3.select("body").on("keydown", function() {
	  	var key = d3.event.keyCode
	  	if (!$("input, textarea").is(":focus")) {
	      	if(key == 39 || key == 40){ $scope.arrowKey("next") }
	      	else if(key == 37 || key == 38){ $scope.arrowKey("prev") }
	      	// Delete Element
	      	else if(key == 8 || key == 46){
	      		event.preventDefault();
	      		$scope.deleteDate();
	      		// Editor doesn't hide event when deleted over key
	      		// ??
	      	}
	  	}
	});

  	var chart = d3.timeline();
  	chart
	.itemHeight(itemHeight)
	.margin({ left: puffer/2, right:puffer*2, top: $("#topBox").height()-70, bottom:puffer })
	.tickFormat({ tickTime: d3.time.years, tickInterval: 5, tickSize: 10 })
	.click(function (d, i, datum) { $scope.clickingCircle(datum) })

	var myTl = d3.select("#timeline").html("").append("svg")
			.attr("width", $("#topBox").width() - 20)
			.attr("height", $("#topBox").height() - 20)
			.attr("fill" , "none")
			//.attr("viewBox","0,0,"+$("#topBox").width()+","+$("#topBox").height())
	
	myTl.append("g").attr("class", "ref") // Add group for reference lines
	myTl.datum($scope.timexes).call(chart)
	$scope.scaleFactor = scaleFactor;		
	$scope.chart = chart;
	return $scope;
  }


this.showDateInfo = function(datum){
	
  	var dateInfo = {}

  	if(datum.typ=="date"){
	  	dateInfo.val = datum.val;
	  	dateInfo.title = checkIfDate(datum.val);
  	}
  	else{
  		dateInfo.val = datum.title;
  		dateInfo.title = datum.title;	
	}

	dateInfo.subtitle = datum.sub;
	dateInfo.sent = datum.sent;
	dateInfo.typ = datum.typ;
	dateInfo.timex = datum.timex;	
	dateInfo.trackNr = datum.trackNr;	

	dateInfo.medium = []
	dateInfo.medium["source"] = datum.mediaSource;
	dateInfo.medium["credit"] = datum.mediaCredit;
	dateInfo.medium["caption"] = datum.mediaCaption;
	dateInfo.medium["hasMedia"] = datum.hasMedia;

	// Save current values
	dateInfo.currId = datum.id;
	dateInfo.currSent = datum.sentNr;
  	
  	return dateInfo
  }

this.markAsTouched = function(d,i){
	d[i].touched = true
	var paths = d3.select("svg").selectAll(".timelineItem").data(d).transition();
	paths.attr("fill" , function(d){ return getColor(d) })
}

this.highlightSent = function(arr,docNr){
  	$(".timex").removeClass("highlighted");
  	
  	if(arr.length>0){
  		arr.forEach(function(datum){
  			var s = datum.currSent;
  			$("#timeSent_"+s).addClass("highlighted");
  		})
  	}
  }

this.scrollToSent = function(thisid,sent,thisDocNr,view){

	// List View
  	var thisListEl = "#listEl_"+thisid
    	var topListPos = $("#listData").scrollTop() + $(thisListEl).position().top
    		- $("#listData").height()/2 + $(thisListEl).height()/2;
    	$("#listData").animate({ scrollTop: topListPos }, 300);

	// Text View
	if(thisDocNr!=-1){
	  	var thisTextEl = "#timeSent_"+sent
	    	var topTextPos = $("#centerBox").scrollTop() + $(thisTextEl).position().top
	    		- $("#centerBox").height()/2 + $(thisTextEl).height()/2;
	    	$("#centerBox").animate({ scrollTop: topTextPos }, 300);
    	}
  }

this.updateD3Tl = function(tx, dcts, action, clickFct, nr){
	// Check for duplicates, but don't reorder, because that would mess up D3 elements
	var d = checkDuplicatesWithoutOrdering(tx);

	// RESCALING AXIS
	var minTime = 1420070400000;  // 2015
	var maxTime = -62135596800000; // year 1

	d.forEach(function (time, i) {
		if(time.visible){
			var sT = time.times[0].starting_time;
			if (!isNaN(sT) && sT < minTime){ minTime = time.times[0].starting_time; }
			var eT = time.times[0].ending_time;
			if (!isNaN(eT) && eT > maxTime) maxTime = time.times[0].ending_time;
            }
	});
	
	var beginning = minTime;
	var ending = maxTime;

	// If only one date on TL, readjust beginning and ending
	if(beginning == ending){
		beginning = beginning - 157784630000
		ending = ending + 157784630000
	}

	// If no date on timeline, show 2000 till today
	if((beginning == "????" || beginning == 1420070400000) && ending == -62135596800000 ){
		beginning = 946684800000  // 2000
		ending = 1420070400000	  // 2015
	}

	
	var width = $("#topBox").width();
	
	var xScale = d3.time.scale()
			.domain([beginning, ending])
			.range([puffer/2, width - puffer*2]);	
	
      var xAxis = d3.svg.axis().scale(xScale).ticks(15).tickSize(15)
	
      // READJUSTING PATHS
      if(beginning == 0) beginning = 1
      if(ending == 0) ending = 1

      scaleFactor = (1/(ending - beginning)) * (width - (puffer*2.5));
      
      // Check height of SVG
      if(d.length!=0){
      	d = checkyIndizes(d,scaleFactor);
     		var newHeight = $("#topBox").height()
     		
     		d.forEach( function(tx){
     			var elTop = tx.yIndex*itemHeight + 100
     			if(tx.visible && newHeight<elTop){ newHeight = elTop }
     		})
     		
     		d3.select("svg").attr("height",newHeight-10)
     		d3.select("svg").selectAll("g.axis").attr("transform","translate(0,"+ (parseInt(newHeight)-55) +")").call(xAxis);
     		$("#timeline").scrollTop(newHeight);
      }
      

	if(action == "loadData"){ d3.select("svg").select("g").selectAll(".timelineItem").remove() }

	if(action=="add" || action == "merge" || action=="newDoc" || action=="loadData"){
		
		var x = $("#timeline").width();

		var timexElements = d3.select("svg").select("g.allthedates").selectAll(".timelineItem").data(d).enter();
		timexElements
		.append('path')
		.attr("d", function(d){
			if(action=="merge"){ var newpath = $("#timelineItem_"+nr).attr("d"); }
			else{
				if(d.typ=="date") return "M 300 -10 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0"
				else if(d.typ=="duration") return "M100 -10 L100 -5 L100 -6 L120 -5 L120 -5 L120 -10 L120 -7 L100-6 Z"
				else return "M "+x+" 40 L"+x+" 20 L"+x+" 40 L"+x+" 40 L"+x+" 20 Z"
			}
			
		})
		.attr("class" , function(d){
			if(action=="newDoc" || action=="loadData"){ var classes = "timelineItem_sent_"+d.sentNr }
			else{ var classes = ""}
			return "timelineItem " + d.typ + " " + classes
			
		})
		.attr("id", function(d){ return "timelineItem_"+ d.id })
		.attr("fill" , function(d){ return getColor(d) })
		.on("click", function (d) { clickFct(d); })

	}
	
		
	// Add Reference Lines
	if(action=="newDoc"){
		var reflines = d3.select("svg").select("g.ref").selectAll("line").data(dcts).enter();
		reflines.append("svg:line")
		.attr("x1", function(t){
			var dctstamp = new Date(t.substr(0,4)+","+t.substr(5,2)+","+t.substr(8,2)).getTime();
			return puffer/2 + (dctstamp - beginning) * scaleFactor;
			})
		.attr("y1", 0)
		.attr("x2", function(t){
			var dctstamp = new Date(t.substr(0,4)+","+t.substr(5,2)+","+t.substr(8,2)).getTime();
			return puffer/2 + (dctstamp - beginning) * scaleFactor;
			})
		.attr("y2", $("#timeline svg").height())
		.attr("class", "refline")
		.style("stroke-dasharray", "3,5")
		
		reflines
		.append("text")      // text label for the x axis
	      .attr("x", function(t){
			var dctstamp = new Date(t.substr(0,4)+","+t.substr(5,2)+","+t.substr(8,2)).getTime();
			return puffer/2 + (dctstamp - beginning) * scaleFactor + 3;
			})
	      .attr("y",  $("#timeline svg").height()-3 )
	      .style("text-anchor", "left")
	      .attr("class","todaytag")
	      .text("today");
	}


	// Update all paths - without transition, if shape changes from circle to span-shape
	if(action == "move"){
		var paths = d3.select("svg").selectAll(".timelineItem").data(d).transition();
	}
	else{ var paths = d3.select("svg").selectAll(".timelineItem").data(d); }
	
	// Update all refs
	var refs = d3.select("svg").select("g.ref").selectAll("line").data(dcts).transition()
		.attr("x1", function(t){
			var dctstamp = new Date(t.substr(0,4)+","+t.substr(5,2)+","+t.substr(8,2)).getTime();
			return puffer/2 + (dctstamp - beginning) * scaleFactor;
			})
		.attr("x2", function(t){
			var dctstamp = new Date(t.substr(0,4)+","+t.substr(5,2)+","+t.substr(8,2)).getTime();
			return puffer/2 + (dctstamp - beginning) * scaleFactor;
			})
		.attr("y2", $("#timeline svg").height());
		d3.select("svg").select("g.ref").selectAll("text").data(dcts).transition()
			.attr("x", function(t){
			var dctstamp = new Date(t.substr(0,4)+","+t.substr(5,2)+","+t.substr(8,2)).getTime();
			return puffer/2 + (dctstamp - beginning) * scaleFactor + 3;
			});

	paths
	.attr("d", function(d){
		// line
		if(d.typ=="duration"){ return getLinePath(d,beginning,scaleFactor) }
		// date
		else if(d.typ=="date"){ return getCirclePath(d,beginning,scaleFactor) }
		//circle
		else{ return getSquarePath(d,beginning,scaleFactor) }
		})
	.attr("fill" , function(d){ return getColor(d) })
		/*.attr("stroke-width" , function(d){
			if(d.visible){
				if(d.typ=="duration"){ return 0 }
				else{  return 2 }
			}
			else{ return 0 }
		})*/
		

	/* In case there will be any difference between move and delete */
	if(action=="resize"){
		var newHeight = parseInt($("#topBox").height())
		console.log(newHeight)

		var newWidth = $("#topBox").width()

		d3.select("#timeline").select("svg")
			.attr("width", newWidth)
			.attr("height", newHeight-30)

		d3.select("#timeline").select("g.axis")
			.attr("transform", "translate(0,"+(newHeight-55)+")")
	}

	
	else if(action=="recover"){ }

	return d;
  }

})

app.service('CreateArray', function(SplitSents){
  
  this.makeArray = function(timexes,file,nrIds,nrSents){
  	var sents = SplitSents.splitthem(file)
  	var number = nrIds;

	// Look into each sentence to see if there are TIMEX2s
	for(var s = 0; s<sents.length; s++){
		var thisS = sents[s];
		

		if(s==0){ thisS = thisS.split("['")[1] }
		if(s==(sents.length-1)){ thisS = thisS.split("']")[0] }
		
		

		// If there is a timex in the sentence:
		if(thisS.indexOf("TIMEX2") >= 0){
	      	// How many Timexes?
	      	var nTimexes = thisS.split("</TIMEX2>");

	        	// CREATE DATA OBJECT
	        	var txsCount = nTimexes.length;
	        	
			// For all timexes inside one sentence
	        	for(var n=0; n<txsCount-1; n++){

	            	// Get: ID, Timex, Surrounding Sentence, Value, Mod, Count (=1)
	            	var x = nTimexes[n]
	            	var thistempex = x.split(/\<TIMEX2.*?\>/)[1].replace("&#039;","'");
	            	// Check if VAL
	            	if(x.indexOf("VAL") >= 0){ var thisVal = x.match(/VAL=\"([^<]*)\"/)[1] }
	            	else{ var thisVal = x.split(">")[1]; }

	            	// Check if MOD
	            	if(x.indexOf("MOD") >= 0){ var thisMod = x.match(/MOD=\"([^\"]*)\"/)[1] }
	            	else{ var thisMod = ""; }

	            	
				// Check if Time is transformable
				var d = dateConversion(thisVal,thisMod)

				// Sentence withough TIMEX2 Tags
				thisS = cleanSubtitle(thisS)
				
				var sub = thisS.split(' ').slice(0,5).join(' ');

				var sentNr = s + nrSents;
				// Only add when transformable
				if(d.typ=="date"){
					if(thisVal=="PRESENT_REF"){ thisVal = dct.substr(0,4)+dct.substr(5,2)+dct.substr(8,2) }

					timexes[number] = {
					id : number , docNr : docNr ,  trackNr : trackNr, timex : thistempex , typ : "date", touched : false ,
					sent : thisS , sub : sub, sentNr : sentNr , val : thisVal ,
					title : prettifyDate(thisVal), mod : thisMod , count : 1 , yIndex : 1 ,
					times : [{starting_time : d.startVal , ending_time : d.startVal}],
					mediaSource : "Enter URL" , mediaCredit : "Credit" , mediaCaption : "Caption" , hasMedia : false ,
					visible : true
					};
				
				}
				// If Value is DURATION
				else if(d.typ=="duration"){
					var durTitle = prettifyDate(d.startDate) +" - " + prettifyDate(d.endDate);
					timexes[number] = {
					id : number , docNr : docNr , trackNr : trackNr, timex : thistempex , typ : "duration", touched : false ,
					sent : thisS , sub : sub , sentNr : sentNr , val : d.startDate+" - "+d.endDate ,
					title : durTitle , mod : thisMod , count : 1 , yIndex : 1 ,
					times : [{starting_time : d.startVal , ending_time : d.endVal}],
					mediaSource : "Enter URL" , mediaCredit : "Credit" , mediaCaption : "Caption" , hasMedia : false ,
					visible : true
					};
				}
				// If Value is no date
				else{
					var temporarySolution = "????"
					//var subt = "I am not properly defined yet"
					timexes[number] = {
					id : number , docNr : docNr , trackNr : trackNr, timex : thistempex , typ : "neither", touched : false ,
					sent : thisS , sub : sub, sentNr : sentNr , val : temporarySolution ,
					title : "????" , mod : thisMod , count : 1 , yIndex : 1 ,
					times : [{starting_time : temporarySolution , ending_time : temporarySolution}],
					mediaSource : "Enter URL" , mediaCredit : "Credit" , mediaCaption : "Caption" , hasMedia : false ,
					visible : true
					};
				}
			number++;
			}
		}
	}
	timexes = checkDuplicatesWithoutOrdering(timexes);
	//checkDuplicates(timexes);
	//$("#view_switch button").on("click" , function(){ $(".sidebar").toggleClass("activetab"); })
	return timexes;
  }

  this.recreateText = function(file,$sce,nrSents,nrIds){
  	var sents = SplitSents.splitthem(file)
  	
  	var txSents = [];

  	var thisNewSent = ""
  	var thisId = nrIds;
  	for(var s = 0; s<sents.length; s++){
		
		var thisS = sents[s];
		//thisS = thisS.replace(/\\n/g , " <br> ")
		// For first and last sent - remove [' or ']
		if(s==0){ thisS = thisS.split("['")[1] }
		if(s==(sents.length-1)){ thisS = thisS.split("']")[0] }
		var sentNr = s + nrSents;

		// If one ore more Timexes in Sentence
		if(thisS.indexOf("TIMEX2") >= 0){
			var nTimexes = thisS.split("</TIMEX2>");
			var txSent = ""
		  	for(var n = 0; n<nTimexes.length; n++){
		  		if(n!=(nTimexes.length-1)){
		  			var span = "<span id='tx_"+thisId+"' onclick='setSentTx("+thisId+")' class='tx txSent_"+sentNr+"'>"
		  			// Clicking on one ty-span triggers sentence click event as well - messes things up
		  			//var span = "<span id='tx_"+thisId+"' onclick='angular.element(this).scope().clickingCircle("+thisId+"); event.stopPropagation()' class='tx txSent_"+sentNr+"'>"
			            txSent += nTimexes[n].replace(/<TIMEX2([ ]*[^>]*)>/g , span)
			            txSent += "</span>"

			      	thisId++;
			      	}
		      	else{ txSent += nTimexes[n] }
			
		      }
			txSents[s] = { sent : $sce.trustAsHtml(txSent) , tx : "Tx" , sentNr : sentNr , id : thisId }
		}
		// No Timex in Sentence
		else{ txSents[s] = { sent : $sce.trustAsHtml(thisS), tx : "NoTx" , sentNr : sentNr } }
	}
	//console.log("Now we have "+sentNr+" sentences")
	return txSents;
  }
});

app.service('DateHandling', function(){
	

	this.checkSize = function(d){
		var dateL = d.length;
		var thisVal = d;
		var dateArray = []
		if(isNaN(d) && d!="????"){
			var startVal = d.split(" - ")[0]
			var endVal = d.split(" - ")[1]
			dateL = startVal.length;
			thisVal = startVal;
		}
		// Date
		if(dateL>=4){ dateArray[0] = thisVal.substr(0,4); }
  		else{ dateArray[0] = "xxxx"; }

  		if(dateL>=6){ dateArray[1] = thisVal.substr(4,2); }
  		else{ dateArray[1] = "xx"; }

		if(dateL>=8){ dateArray[2] = thisVal.substr(6,2); }
  		else{ dateArray[2] = "xx"; }

  		if(dateL>=12){ dateArray[3] = thisVal.substr(8,4); }
  		else{ dateArray[3] = "xxxx"; }
		
		// Add values for end date if Duration
		if(isNaN(d) && d!="????"){
			dateL = endVal.length;
			thisVal = endVal;
			if(dateL>=4){ dateArray[4] = thisVal.substr(0,4); }
	  		else{ dateArray[4] = "xxxx"; }

	  		if(dateL>=6){ dateArray[5] = thisVal.substr(4,2); }
	  		else{ dateArray[5] = "xx"; }

			if(dateL>=8){ dateArray[6] = thisVal.substr(6,2); }
	  		else{ dateArray[6] = "xx"; }

	  		if(dateL>=12){ dateArray[7] = thisVal.substr(8,4); }
	  		else{ dateArray[7] = "xxxx"; }
		}
		return dateArray;
	}

	this.countTxs = function(tx,docNr,date){
		var nr = 0;
		if(docNr=="total"){
			if(date == "event"){ tx.forEach( function(d){
				if(d.typ=="date" || d.typ=="duration") nr++
			})}
			else if(date == "vague"){ tx.forEach( function(d){
				if(d.typ=="neither") nr++
			})}
		}
		else{ tx.forEach( function(d){ if(d.docNr == docNr) nr++ }) }
		
		return nr
	}

	this.checkThisDate = function($scope){
		// Check if input correct
		var arr = $scope.dateInfo[0].dateArray;

		if( arr[0].length<4 || (arr[3].length<4 && arr[3].length!=0) ||
			(arr.length>4 &&
			(arr[4].length<4 || (arr[7].length<4 && arr[7].length!=0) ||
			arr[0] > arr[4]))){
			// Year has less than 4 digits
			if(arr[0].length<4){ alert("A Year has 4 digits please") }
			// Time is given in the wrong format
			if(arr[3].length<4 && arr[3].length!=0){
				alert("Please write the time in the format HHMM") }	
		
			if(arr.length>4){
				if(arr[4].length<4){ alert("A Year has 4 digits please") }
				if(arr[7].length<4 && arr[7].length!=0){
					alert("Please write the time in the format HHMM") }
				// Start year is bigger than end date
				if(arr[0] > arr[4]){ alert("Please enter the dates in a chronological order.") }	
			}
			return false;
		
		}

		else{
			// Improve Input if inexplicit
			if(arr[1].length==1){ arr[1] = "0" + arr[1] }
			if(arr[1]>12){ alert("We only have 12 month in a year."); arr[1] = "12" }
			if(arr[2].length==1){ arr[2] = "0" + arr[2] }
			if(arr[2]>31){ alert("Pretty sure a month can't have more than 31 days."); arr[2] = "01" }
			if(arr[3].substr(0,2)>23){ alert("Sorrey, but that is no valid time."); arr[3] = "23" + arr[3].substr(2,2) }
			if(arr[3].substr(2,2)>59){ alert("Can we please write existing times?"); arr[3] = arr[3].substr(0,2) + "59" }

			if(arr.length>4){
				if(arr[5].length==1){ arr[5] = "0" + arr[5] }
				if(arr[5]>12){ alert("We only have 12 month in a year."); arr[5] = "12" }
				if(arr[6].length==1){ arr[6] = "0" + arr[6] }
				if(arr[6]>31){ alert("Pretty sure a month can't have more than 31 days."); arr[6] = "01" }
				if(arr[7].substr(0,2)>23){ alert("Sorrey, but that is no valid time."); arr[7] = "23" + arr[7].substr(2,2) }
				if(arr[7].substr(2,2)>59){ alert("Can we please write existing times?"); arr[7] = arr[7].substr(0,2) + "59" }
			}
			// DATE
			var updatedDate = "";
			if(arr[0]!="xxxx") updatedDate += arr[0]
			if(arr[1]!="xx") updatedDate += arr[1]
			if(arr[2]!="xx") updatedDate += arr[2]
			if(arr[3]!="xxxx") updatedDate += arr[3]
			
			// DURATION
			if(arr.length>4){
				updatedDate += " - "
				if(arr[4]!="xxxx") updatedDate += arr[4]
				if(arr[5]!="xx") updatedDate += arr[5]
				if(arr[6]!="xx") updatedDate += arr[6]
				if(arr[7]!="xxxx") updatedDate += arr[7]
			}
			//return updatedDate;
		}

		if(updatedDate){

			$scope.editDate = false;
			var currIndex = $scope.currIndex;

			if($scope.timexes[currIndex].typ == "neither" && updatedDate!="????"){ var action = "vagueToDate" } 
			else var action = "move"

			if(updatedDate=="????"){
				$scope.timexes[currIndex].typ = "neither";
				var newTitle=updatedDate;
			}
			else if(updatedDate.indexOf(" - ")>0){
				var newTitle=prettifyDate(updatedDate.split(" - ")[0])+" - "+prettifyDate(updatedDate.split(" - ")[1]);
				$scope.timexes[currIndex].typ = "duration";
			}
			else{
				$scope.timexes[currIndex].typ = "date";
				var newTitle=prettifyDate(updatedDate)
			}

			if($scope.timexes[currIndex].val!=updatedDate) $scope.markAsTouched($scope.timexes,$scope.currIndex)
			$scope.timexes[currIndex].val = updatedDate;
			$scope.timexes[currIndex].title = newTitle;
			$scope.dateInfo[0].title = checkIfDate(updatedDate);
			var dateVals = dateConversion(updatedDate)
			$scope.timexes[currIndex].times[0].starting_time = dateVals.startVal;
			$scope.timexes[currIndex].times[0].ending_time = dateVals.endVal;
			$scope.updateD3Tl($scope.timexes, $scope.dcts, action)

			return updatedDate
		}
		else{ return false; }
	}

	this.addTime = function(el, dir){
			if(dir == "start"){
			el.dateArray[3]='0000'
			if(el.dateArray[2]=='xx' || el.dateArray[2]=='00'){
				el.dateArray[2]='01'
			}
			if(el.dateArray[1]=='xx' || el.dateArray[1]=='00'){
				el.dateArray[1]='01'
			}
		}
		else{
			el.dateArray[7]='0000'
			if(el.dateArray[6]=='xx' || el.dateArray[6]=='00'){
				el.dateArray[6]='01'
			}
			if(el.dateArray[5]=='xx' || el.dateArray[5]=='00'){
				el.dateArray[5]='01'
			}
		}
	}
	this.addDay = function(el, dir){
		if(dir == "start"){
			el.dateArray[2]='01'
			if(el.dateArray[1]=='xx' || el.dateArray[1]=='00'){
				el.dateArray[1]='01'
			}
		}
		else{
			el.dateArray[6]='01'
			if(el.dateArray[5]=='xx' || el.dateArray[5]=='00'){
				el.dateArray[5]='01'
			}
		}
	}
	this.addMonth = function(el, dir){
		if(dir == "start") el.dateArray[1]='01'
		else el.dateArray[5]='01'
	}

	this.enableEdit = function($scope, el){
		if(el=="t"){
			$scope.editDate = true;
			$scope.dateInfo[0].dateArray = this.checkSize($scope.timexes[$scope.currIndex].val)
			var thisid = "#dateEditMode input"
		}
		else if(el=="d"){ $scope.editSubtitle = true; var thisid = "#displaySubtitle input"}
		else if(el=="c"){ $scope.editContent = true; }
		else if(el=="ms"){ $scope.editMediaSource = true; var thisid = "#mediaSource input"  }
		else if(el=="mcr"){ $scope.editMediaCredit = true; var thisid = "#mediaCredit input"}
		else if(el=="mca"){ $scope.editMediaCaption = true; var thisid = "#mediaCaption input"}
		else{ var nr = el.split("_")[1]; $scope.editTrack[nr] = true;  var thisid = "#trackName_"+nr+" input" }
		
		if(el!="t"){ $scope.editDate = false; }
		if(thisid) setTimeout( function(){ $(thisid).select(); } , 50 )
	}

	this.disableEdit = function($scope, el){
		if(el=="d"){
			$scope.editSubtitle = false;
			if($scope.dateInfo.length>0){
				if($scope.dateInfo[0].subtitle.length>0){
					if($scope.timexes[$scope.currIndex].sub!=$scope.dateInfo[0].subtitle){
						$scope.markAsTouched($scope.timexes,$scope.currIndex);
						$scope.timexes[$scope.currIndex].sub = $scope.dateInfo[0].subtitle;
					}
				}	
				else{
					$scope.dateInfo[0].subtitle = " "
					$scope.timexes[$scope.currIndex].sub = " " }
			}
		}
		else if(el=="c"){
			$scope.editContent = false;
			if($scope.dateInfo.length>0){
				if($scope.timexes[$scope.currIndex].sent!=$scope.dateInfo[0].sent){
					$scope.markAsTouched($scope.timexes,$scope.currIndex);
					if($scope.dateInfo.length>0){
						$scope.timexes[$scope.currIndex].sent = $scope.dateInfo[0].sent;
					}
				}
			}
		}
		else if(el=="ms"){
			$scope.editMediaSource = false;
			if($scope.dateInfo.length>0){
				// If date has Media source --> Indicate that it has Media
				var newSource = $scope.dateInfo[0].medium["source"];
				if(newSource == ""){ newSource = "Enter URL"; $scope.dateInfo[0].medium["source"] = newSource }
				if (newSource != "Enter URL" && newSource != "x"){
					$scope.markAsTouched($scope.timexes,$scope.currIndex);
					$scope.timexes[$scope.currIndex].hasMedia = true;
					$('#mediaIndicator').addClass("hasMedia")
				}
				$scope.timexes[$scope.currIndex].mediaSource = newSource; }

		}
		else if(el=="mcr"){
			$scope.editMediaCredit = false;
			if($scope.dateInfo[0].medium["credit"].length > 0){ $scope.timexes[$scope.currIndex].mediaCredit = $scope.dateInfo[0].medium["credit"]; }
			else{ $scope.dateInfo[0].medium["credit"] = "Credit" }
		}
		else if(el=="mca"){
			$scope.editMediaCaption = false;
			if($scope.dateInfo[0].medium["caption"].length > 0){ $scope.timexes[$scope.currIndex].mediaCaption = $scope.dateInfo[0].medium["caption"]; }
			else{ $scope.dateInfo[0].medium["caption"] = "Caption" }
		}
		else{
			var nr = el.split("_")[1]
			$scope.editTrack[nr] = false;
			//$scope.trackNames[nr]
		}
		return $scope;
	}

	this.arrowKey = function($scope,dir){
		if($scope.dateSelected){
			
			var listLength = $('#listData tr').length
			var deleted = $('#listData .deleted').length

			// If timeline is all empty deselect everything
			if(listLength==deleted){ $scope.dateSelected = false; }
			else{
			
				var currListEl = parseInt($("#listEl_" + $scope.currIndex).index()) + 1
				if(dir=="next"){
					if(currListEl==listLength){ var newIndex = 1 }
					else{ var newIndex = parseInt(currListEl)+1 }
					var newListEl = $("#listData tr:nth-child("+ newIndex +")").attr("id").split("_")[1]
					
					// If not visible go one further
					while (!$scope.timexes[newListEl].visible) {
						if(newIndex==listLength){ newIndex = 1 }
						else{ newIndex++ }
						newListEl = $("#listData tr:nth-child("+ newIndex +")").attr("id").split("_")[1]
					}
				}
				else if(dir=="prev"){
					if(currListEl==1){ var newIndex = listLength }
					else{ var newIndex = parseInt(currListEl)-1 }
					var newListEl = $("#listData tr:nth-child("+ newIndex +")").attr("id").split("_")[1]
					// If not visible go one further
					while (!$scope.timexes[newListEl].visible) {
						if(newIndex==1){ newIndex = listLength }
						else{ newIndex-- }
						newListEl = $("#listData tr:nth-child("+ newIndex +")").attr("id").split("_")[1]
					}
				}
				$scope.makeSelection($scope.timexes[newListEl].sentNr, $scope.timexes[newListEl], "arrowKey")
			}
		}
	}

	this.makeSelection = function($scope, sentNr, d, origin){
		
		$scope.editDate = false;
		$scope.addMedia = false;
		$scope.changeTrackVis = false;
		$(".display .changeTrack").removeClass("chosen");
		if(sentNr===false){ sentNr = -1 }

		//console.log(d)

		// If coming from Sentence selection, take first timex from sentence as new index
		if(origin=="fromSent"){
			var numberNewElement = d.length
			$scope.currIndex = d[0].id;
			
			}
		else{
			var numberNewElement = 1
			$scope.currIndex = d.id;
		}

		// Should not be needed - but DOM not updating after Media Input change...
		if(!$scope.timexes[$scope.currIndex].hasMedia) $('#mediaIndicator').removeClass("hasMedia")

		for(var i=0; i<numberNewElement;i++){
			if(origin=="fromSent"){ var thisD = d[i]; }
			else{ var thisD = d; }
			
			var newDate = $scope.showDateInfo(thisD);
			
			if(shifted){
				var newId = newDate.currId;
				// Check if ID already in Array - if not add it
				var elExists = $.grep($scope.dateInfo, function(el){ return el.currId == newId; });

				if(elExists.length==0){ $scope.dateInfo.push(newDate); }
				else{
					var posInArray = $scope.dateInfo.indexOf(elExists[0])
					$scope.dateInfo.splice(posInArray, 1) }
	      		}
	      	else{
	      		if($scope.dateInfo[0] && $scope.dateInfo[0].currId == newDate.currId){ $scope.dateInfo = []; }
	      		else{
	      			if(i==0){ $scope.dateInfo = []; }
	      			$scope.dateInfo.push(newDate);
	      		}
	      		//console.log(newDate)
	      		//console.log($scope.dateInfo[0])
	      	}
      	}
      	if($scope.dateInfo.length>1){ $scope.severalSelected = true; }
      	else{ $scope.severalSelected = false; }

         // Highlighting Sentence (if path is connected to a sentence)
      	if(sentNr!=-1){
      		
			var thisDocNr = $scope.timexes[newDate.currId].docNr
			var activeDoc = $(".activetab").attr("id").split("_")[1]
			if(thisDocNr!=activeDoc){ $scope.switchView(thisDocNr); }
			var thisId = newDate.currId
			var view = "text"
      		
      		$scope.highlightSent($scope.dateInfo,thisDocNr);
      		$scope.scrollToSent(thisId,sentNr,thisDocNr)

      		//Highlight corresponding timex
      		$(".tx").removeClass("activeTx")
      		$("#tx_"+$scope.currIndex).addClass("activeTx")

      	}
      	// if manually added Date
      	else{
			$scope.scrollToSent(newDate.currId,false,-1)
      		if(!shifted) $(".timex").removeClass("highlighted");
      	}

         // Highlighting List
		$(".listEl").removeClass("highlighted")
		$scope.dateInfo.forEach( function(el){ $("#listEl_"+el.currId).addClass("highlighted") })

	   // Highlighting Circle
	   	d3.selectAll(".timelineItem").classed("selected", false).classed("selectedSec", false)
		$scope.dateInfo.forEach( function(el,i){
			// First Selection is primar selection
			if(i==0){ d3.select("#timelineItem_"+el.currId).classed("selected" , true) }
			else{ d3.select("#timelineItem_"+el.currId).classed("selectedSec" , true) }
		}) 
		if($scope.dateInfo.length!=0){ $scope.dateSelected = true }
		else{ $scope.dateSelected = false }
		
		if(origin=="fromCircle" || origin=="arrowKey") $scope.$apply( $scope.dateSelected ); // apply needed, because Click on Circle is no ng-click
      	
      	// ARROW KEYS
      	//if($scope.dateSelected){ $(document).on("keydown" , arrowKeys ) }
      	//else{ $(document).off("keydown" , arrowKeys ) }

      	return $scope;
	}

	this.clickingSent = function(s, $scope){
		if(sentTx===false){
      		if($("#timeSent_"+s).hasClass("highlighted")){ $scope.gohome() }
      		else{
      			var d = $.grep($scope.timexes, function(tx){ return tx.sentNr == s });
      			$scope.makeSelection(s,d,"fromSent")
      		}	
      	}
     		else{
     			var d = [];
     			d[0] = $scope.timexes[sentTx]
     			$scope.makeSelection(s,d,"fromSent")
     		}

      	sentTx = false
      	//return $scope
	}

	this.deleteDate = function($scope){

		$scope.dateInfo.forEach( function(el){
			var thisIndex = el.currId
			d3.select("#timelineItem_"+thisIndex).classed("selected",false).classed("selectedSec",false);
			d3.select("#timelineItem_"+thisIndex+1).classed("selected",true);
			$("#listEl_"+thisIndex).addClass("deleted")
			$scope.timexes[thisIndex].visible = false;
		})	
		
		$scope.updateD3Tl($scope.timexes, $scope.dcts, "delete");
		$scope.severalSelected = false;

		// Automatically select next date
	      $scope.arrowKey("next")
	      
		return $scope.timexes;
		
	}

	this.recoverDate = function($scope){
		d3.select("#timelineItem_"+$scope.dateInfo[0].currId).transition(1000).attr("r",(itemHeight/2));
		$scope.dateSelected = true;
		var thisIndex = $scope.currIndex;
		$scope.timexes[thisIndex].visible = true;
		$scope.updateD3Tl($scope.timexes, $scope.dcts, "recover");
		return $scope.timexes;
	}

	this.changeTrack = function(tx, index, nr){
		$(".changeTrack").removeClass("chosen")
		$("#changeTrack_"+nr).addClass("chosen")
		tx[index].trackNr = nr;
		var paths = d3.select("svg").selectAll(".timelineItem").data(tx);
		paths.attr("fill" , function(d){ return getColor(d) })
	}

	this.addDocument = function($scope,$sce,$http,val,source,CreateArray){
		$scope.docNr++
		docNr++
		//closeInput($scope.selectedFile)
		closeInput()
		function processInput(data){
        		//$scope.myfile = data;
			$scope.files.push(data);
			dct = getDCT(data);
			$scope.dcts.push(dct);
			
			var docTitle = data.match(/<TITLE>([^<]*)<\/TITLE>/)[1]
			docTitle = cleanSubtitle(docTitle)
			if($scope.trackNames[trackNr] == (parseInt(trackNr)+1).toString()) $scope.trackNames[trackNr] = docTitle;

			if($scope.tlDescr.length>0){
				if($scope.tlDescr[0] == "TimeLineCurator" && docNr==0){
					$scope.tlDescr[0] = docTitle
				}
				else if($scope.fileNames.length>=1 && $scope.tlDescr[0] == $scope.fileNames[0].title && docNr==1){
					$scope.tlDescr[0] = $scope.tlDescr[0] + " & " + docTitle
				}
				else if($scope.fileNames.length>=2 && $scope.tlDescr[0] == $scope.fileNames[0].title + " & " + $scope.fileNames[1].title ){
					$scope.tlDescr[0] = "Comparing Several Documents"
				}
			}

			$scope.fileNames[$scope.docNr] = { title : docTitle , trackNr : trackNr }
			
			var nrIds = $scope.timexes.length
			var nrSents = 0;
			if(docNr > 0){ $scope.singleSents.forEach( function(s){ nrSents = nrSents+s.length; }) }

			$scope.timexes = CreateArray.makeArray($scope.timexes,data,nrIds,nrSents)
			$scope.singleSents[$scope.docNr] = CreateArray.recreateText(data, $sce, nrSents,nrIds);
			$scope.updateD3Tl($scope.timexes,$scope.dcts,"newDoc",$scope.clickingCircle,"xx")

			// Adjust DOM
			$("#button_"+docNr).css("background-color", "rgb("+colorDate[trackNr]+")")
			$scope.switchView(docNr)

			// Increase TrackNr for next document
			if(trackNr<6) trackNr++
			
			if(source=="fromInput"){ $scope.$apply($scope) }
        	}

		// Handmade Input
		if(source=="fromInput"){ processInput(val) }
		// Document Uploaded
		else{
			$scope.uploadDoc=false;
			var indexOfFileInArray = $scope.tempFiles.indexOf(val);
			$scope.tempFiles.splice(indexOfFileInArray, 1);
			// UPLOAD FILE
			$http
			.get("static/data/" + val + ".txt")
			.success(function(data, status, headers, config) {
		          	if (data && status === 200) { processInput(data) }
		          	else{ console.log("Couldn't read data"); }
	        	});
		}
	}

	this.addDate = function($scope,CreateTimeline){
		var number = $scope.timexes.length;

		var currDoc = -1;
		var aT = $(".activetab").attr("id")
		if(aT){
			aT = aT.split("_")[1]
			if(aT!="list"){ currDoc = aT }
		}
		

		var newDate = {
			id : number , timex : "manually added" , docNr : -1, trackNr : trackNr, 
			sent : "manually added" , sub : "New Event", sentNr : -1 , typ : "neither",  touched : false ,
			val : "????" , title : "????", mod : "" , count : 1 , yIndex : 1 ,
			mediaSource : "Enter URL" , mediaCredit : "Credit" , mediaCaption : "Caption" , hasMedia : false ,
			times : [{ starting_time : "????" , ending_time : "????"}], visible : true
			}
		$scope.timexes.push(newDate);
		$scope.currIndex = number;
		
		d3.selectAll(".timelineItem").classed("selected", false).classed("selectedSec",false)
		$scope.updateD3Tl($scope.timexes, $scope.dcts, "add", $scope.clickingCircle);
		$scope.dateInfo = [];
		$scope.dateInfo.push({ currId : number });
		$scope.dateInfo[0] = $scope.showDateInfo($scope.timexes[number]);
			

		$scope.dateSelected = true;
		setTimeout( function(){
			d3.select("#timelineItem_"+$scope.dateInfo[0].currId).classed("selected",true)
		},300)

		return $scope;
	}

	this.mergeDates = function($scope){
		var number = $scope.timexes.length;
		var dateInfo = $scope.dateInfo
		
		// Make first element the new value
		var newId = dateInfo[0].currId
		var newSent = "";
		var newSentNr, newDocNr, newTrackNr;
		var newSubtitle = "";
		var newTyp = dateInfo[0].typ;
		if(newTyp=="neither"){ var newTitle = "????"; }
		else{ var newTitle = dateInfo[0].title; }

		dateInfo.forEach( function(el, index){
			var thisId = el.currId;
			if(index==0){
				newSubtitle = el.subtitle;
				newDocNr = $scope.timexes[thisId].docNr;
				newTrackNr = $scope.timexes[thisId].trackNr;
				newSentNr = $scope.timexes[thisId].sentNr;
			}
			newSent += el.sent + "\n\n";
			
			$scope.timexes[thisId].visible = false;
		})

		var d = dateConversion(newTitle)
		var newDate = {
			id : newId , docNr : newDocNr , trackNr : newTrackNr, timex : "merged Date" ,
			sent : newSent , sub : newSubtitle, sentNr : newSentNr , typ : newTyp, 
			val : newTitle , title : newTitle, mod : "" , count : 1 , yIndex : 1 ,
			times : [{ starting_time : d.startVal , ending_time : d.endVal}], visible : true
			}
			
		$scope.timexes[newId] = newDate;
		//console.log($scope.timexes)
		$scope.dateInfo = [];
		$scope.currIndex = newId;
		
		$scope.updateD3Tl($scope.timexes, $scope.dcts, "merge", $scope.clickingCircle, newId);
		$scope.dateSelected = true;

		$scope.makeSelection(newSentNr,$scope.timexes[newId],"fromMerging")
		$scope.severalSelected = false;

		return $scope;
	}

	this.changeUnit = function($scope,unit){
		if(unit=="toDate"){
			var newTyp = "date"
			$scope.dateInfo[0].dateArray.pop()
			$scope.dateInfo[0].dateArray.pop()
			$scope.dateInfo[0].dateArray.pop()
			$scope.dateInfo[0].dateArray.pop()
		}
		else{
			var newTyp = "duration"
			$scope.dateInfo[0].dateArray[4] = (parseInt($scope.dateInfo[0].dateArray[0]) + 1).toString();
			$scope.dateInfo[0].dateArray[5]='xx'
			$scope.dateInfo[0].dateArray[6]='xx'
			$scope.dateInfo[0].dateArray[7]='xxxx'
			
		}

		$scope.dateInfo[0].typ=newTyp
		var thisIndex = $scope.currIndex
		
		var updatedDate = this.checkThisDate($scope)
		
		if(updatedDate=="????"){
			$scope.timexes[thisIndex].typ = "neither"
			var updatedTitle = updatedDate
		} 
		else if(updatedDate.indexOf(" - ") > 0){
			$scope.timexes[thisIndex].typ = "duration"
			var updatedTitle = prettifyDate(updatedDate.split(" - ")[0])+" - "+prettifyDate(updatedDate.split(" - ")[1])
		} 
		else{
			$scope.timexes[thisIndex].typ = "date"
			var updatedTitle = prettifyDate(updatedDate)
		} 

		$scope.timexes[thisIndex].typ = newTyp
		$scope.timexes[thisIndex].val = updatedDate;
		$scope.timexes[thisIndex].title = updatedTitle;
		
		var newDate = dateConversion(updatedDate)
		$scope.timexes[thisIndex].times[0].starting_time = newDate.startVal;
		$scope.timexes[thisIndex].times[0].ending_time = newDate.endVal;

		$scope.updateD3Tl($scope.timexes,$scope.dcts, "unitChange")

		// TODO: Find other solution!!
		//setTimeout( function(){ $("#check").trigger('click') },200)
		return $scope;
	}

	this.switchView = function(v){

	if($("#button_"+v).hasClass("activeBtn")){
		if($("#docSwitcher").css("overflow") == "visible"){
			$("#docSwitcher").css("overflow" , "hidden" )
		}
		else{ $("#docSwitcher").css("overflow", "visible") }
	}
	else{
		$(".txtData").removeClass("activetab")
		$(".docBtn").removeClass("activeBtn")
		$("#button_"+v).addClass("activeBtn")
		$("#txtData_"+v).addClass("activetab")
		$("#docList").animate({ "top" : (v*27*(-1)) }, 200)
		$("#docSwitcher").css("overflow" , "hidden" )
	}
		
	}

	this.hideDoc = function(v,tx){

		// If document is already inactive - reactivate it
		if($("#button_"+v).hasClass("inactive")){
			$("#button_"+v).removeClass("inactive")
			tx.forEach( function(el){
				if(el.docNr == v){ el.visible = true; }
			})
		}
		// If document is active - deactivate it
		else{
			$("#button_"+v).addClass("inactive")
			tx.forEach( function(el){
				if(el.docNr == v){ el.visible = false; }
			})
		}
		
		return tx;
	}
});

app.filter('iif', function () {
   return function(input, trueValue, falseValue) {
        return input ? trueValue : falseValue;
   };
})

app.service('DateExporting', function(){

	/*this.downloadTimexes = function($scope){

		var txs = $scope.timexes;
		
		var exportTxs = [];
		txs.forEach( function(tx){
			if(tx.visible && tx.typ != "neither"){ exportTxs.push(tx) }
		})
		var trackNames = $scope.trackNames

		var exportStr = JSON.stringify(exportTxs)
		console.log(exportStr)
		download($scope.tlDescr[0]+".tl", exportTxs)
	}*/

	this.exportAsJson = function(txs,filenames,tlDescr,trackNames){
		var dateEls = []

		txs.forEach( function(el){
			// Include all elements that are visible and ON the timeline

			if(el.visible && el.val!="????"){
				//var sD = new Date(el.times[0].starting_time)
				var d = el.val
				var sD = d.split(" - ")[0]
				//console.log("start date split length: "+sD.length)
				if(sD.length==4){ var startDate = sD }
				else if(sD.length==6){ var startDate = sD.substr(0,4)+","+sD.substr(4,2) }
				else if(sD.length==8){ var startDate = sD.substr(0,4)+","+sD.substr(4,2)+","+sD.substr(6,2) }
				else if(sD.length>8){ var startDate = sD.substr(0,4)+","+sD.substr(4,2)+","+sD.substr(6,2)+","+sD.substr(8,2)+","+sD.substr(10) }

				// duration
				if(el.typ=="duration"){
					var eD = d.split(" - ")[1]
					if(eD.length==4){ var endDate = eD }
					else if(eD.length==6){ var endDate = eD.substr(0,4)+","+eD.substr(4,2) }
					else if(eD.length==8){ var endDate = eD.substr(0,4)+","+eD.substr(4,2)+","+eD.substr(6,2) }
					else if(eD.length>8){ var endDate = eD.substr(0,4)+","+eD.substr(4,2)+","+eD.substr(6,2)+","+eD.substr(8,2)+","+eD.substr(10) }
				}
				else{ endDate = "" }
				//console.log("Start: "+startDate+", End: "+endDate)
				

				// Media
				if(el.hasMedia){
					var mS = el.mediaSource
					if(el.mediaCredit!= "Credit"){ var mCr = el.mediaCredit }
					else{ var mCr = " " }

					if(el.mediaCaption!= "Caption"){ var mCa = el.mediaCaption }
					else{ var mCa = " " }

					var thisMedia = {
						"media": mS,
                    			"credit": mCr,
                    			"caption": mCa
                    		}
				}
				else{ var thisMedia = {} }

/* We need to know modality of the date - year / year,month / year,month,day etc.*/
				dateEls.push({
					"startDate" : startDate ,
					"endDate" : endDate ,
					"headline" : el.sub ,
					"text" : el.sent,
					"tag" : trackNames[el.trackNr],
					"asset" : thisMedia
					})
			}
			
		})
		//console.log(dateEls)
		var tlObject = {
			"timeline": {
				"headline" : tlDescr[0] ,
				"type" : "default" ,
				"text" : tlDescr[1] ,
				"asset" : { },
				"date" : dateEls
				}
			}
		// Write data to local storage
		//console.log(tlObject)
		localStorage.setItem('myTlData', JSON.stringify(tlObject));

		return tlObject;
	}

	this.saveState = function($scope, state){

		var txs = $scope.timexes;
		$scope.downloadData = false;

		if(txs.length!=0){
			var exportingTxs = [];

			if(state == "final"){
				txs.forEach( function(tx){
					if(tx.visible && tx.typ != "neither"){
						exportingTxs.push(tx)
					}
				})
			}
			else{
				exportingTxs = txs
				}
			var savedData = {
					tlDescr : $scope.tlDescr,
					timexes : exportingTxs,
					files : $scope.files,
					fileNames : $scope.fileNames,
					trackNames : $scope.trackNames
				}
			var saveData = JSON.stringify(savedData)
			
			if(state!="final"){
				
				
				localStorage.setItem('savedData', saveData);
				$("#saved").fadeIn(300 , function(){ setTimeout( function(){ $("#saved").fadeOut(300) },2000)})
				var filetitle = $scope.tlDescr[0].replace(/\s/g , "_");
				if(!state){ download(filetitle+".tl", saveData) }
			}
			
			
			
			else if(state=="final"){ this.saveToServer($scope.tlDescr[0], saveData, $scope.gohome) }
		}
		
	}

	this.saveToServer = function(title,data,gohome){
		
		var myTitle = title
				.replace(/\s/g,"")
				.replace(/[^a-zA-Z0-9]/g, "")

		if(myTitle.length<5){
			gohome()
			alert("Please give your timeline a title with at least 5 letters.");
		}
		else if(myTitle == "TimeLineCurator"){
			gohome()
			alert("Please give your timeline a title.");
		}
		else{	
			$(".loading").fadeIn(300)
			var send = { 'myData' : "callback(" + data.toString() + ")" , 'title' : myTitle + ".tl" }
			console.log("uploading...")
			$.ajax({
				type: "POST",
				data : JSON.stringify(send, null, '\t'),
				url: "/upload",
				contentType: 'application/json;charset=UTF-8',
				success: function(data){
					console.log("done.")
					console.log(data.result)
					// Wait a little ...
					setTimeout( function(){
						$(".loading").fadeOut(300)
						window.open("http://www.cs.ubc.ca/group/infovis/software/TimeLineCurator/tlcExport/?tl="+myTitle);
					},500)
				}
			})
		}	
	}


	this.triggerUploading = function(){ $("#uploadFile").click() }

	this.loadData = function(source,$scope,$sce,CreateArray,CreateTimeline){
		
		
		if($scope.timexes.length!=0){
			var okgo = confirm("Are you sure you want to continue? All dates will be overwritten.")
		} else { var okgo = true }
		var fromStorage;

		var translateData = function(){
			$scope.timexes = [];
			//$scope.updateD3Tl($scope.timexes,"empty")
			//console.log("empty: "+$scope.timexes)
			$scope.timexes = fromStorage.timexes
			$scope.files = fromStorage.files
			$scope.tlDescr = fromStorage.tlDescr
			if(fromStorage.trackNames){
				$scope.trackNames = fromStorage.trackNames
			}
			var nrSents = 0
			var nrIds = 0
			$scope.fileNames = fromStorage.fileNames
			var thisFiles = fromStorage.files

			thisFiles.forEach( function(file,i){
				$scope.singleSents[i] = CreateArray.recreateText(file, $sce, nrSents,nrIds)
				
				if(i!=thisFiles.length-1){
					nrSents += $scope.singleSents[i].length;
					nrIds = $.grep($scope.timexes, function(el){ return el.docNr == i; }).length;	
				}
			})
			
			$scope.updateD3Tl($scope.timexes,$scope.dcts, "loadData",$scope.clickingCircle)
			$scope.docNr = $scope.fileNames.length - 1
			docNr = $scope.fileNames.length - 1
			
			// Remove files that are already in
			$scope.fileNames.forEach( function(file){
				var indexOfFileInArray = $scope.tempFiles.indexOf(file);
				if(indexOfFileInArray>-1){
					$scope.tempFiles.splice(indexOfFileInArray, 1);
				}	
			})

			if(source != "localStorage"){
				$scope.$apply($scope.singleSents)
				$scope.$apply($scope.uploadData)
			}


			
		}

		if(okgo){
			if(source == "localStorage"){
				fromStorage = JSON.parse(localStorage.getItem('savedData'))
				translateData()
				}
			else{
				var f = source.files[0]
				var filename = f.name;
				// Check if File has correct ending (*.tl)
				if(filename.indexOf(".tl")==(filename.length-3)){
					var reader = new FileReader();
					reader.onload = function(f) {
						var text = f.target.result
						if(text.indexOf('{"tlDescr"') === 0){ fromStorage = JSON.parse(text); translateData() }
						else{ alert("This doesn't seem to be a file that was created with this Timeline Editor") }	
					};
					reader.onerror = function(f) { console.error("File could not be read! Code " + f.target.error.code); };

					reader.readAsText(f);
				}
				else{ alert("Please upload a file that was created with this Timeline-Generator."); }
				
			}	
		}
		$scope.uploadData=false;
		
		return $scope
	}
})


