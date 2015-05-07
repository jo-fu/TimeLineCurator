
function download(filename, text) {
    var link = document.createElement('a');
    var textFileAsBlob = new Blob([text], {type:'text/plain'});

    link.download = filename;
    link.innerHTML = "Download File";
 
    link.href = window.URL.createObjectURL(textFileAsBlob);
    link.onclick = destroyClickedElement;
    link.style.display = "none";
    document.body.appendChild(link);
    
    link.click();
  }
function destroyClickedElement(event) { document.body.removeChild(event.target); }
function triggerUpload(){ $('#uploadFile').click() }


function downloadJson(data) {
  var filename = data.timeline.headline.replace(/ /g, "_") + ".json"
  
  var thisdata = createJsonFormat(data)

    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(thisdata));
    pom.setAttribute('download', filename);
    pom.click();
  }


function createJsonFormat(data){
  var d = JSON.stringify(data)
      d = d
            .replace(/\",\"/g, "\",\n\"")
            .replace(/\":{\"/g, "\":\n{\n\"")
            .replace(/\},\"/g, "},\n\"")
            .replace(/\},\{"/g, "},\n\n{\"")
            .replace(/\":\[/g, "\":\n[\n")
            .replace(/\{\}\}\]\}\}/g, "{}}\n]\n}\n}")
    return d
}

function downloadZip(data) {
  var fileContent = createJsonFormat(data)
  var indexHtml = "static/timelineJS/index.html"
  var request = $.ajax({
    url: indexHtml,
    type: "GET",
    contentType: "application/html",
    mimeType:'text/plain; charset=x-user-defined'
  });     

  request.done(function( data ) {
    var zip = new JSZip();
    zip.file("index.html", data, { binary: true });
    zip.file("data.json",fileContent);
    content = zip.generate();
    location.href = "data:application/zip;base64," + content;
  });       
  }