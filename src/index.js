import { Importer, Parser, Converter, Exporter, Config } from "./bpmn2petri/index.js";
import * as X from '../node_modules/bpmn-js/dist/bpmn-navigated-viewer.development.js';

var fileName = "";
var petrinet = null;
var viewer = null;
var actualXML = null;

var batch = [];

$(function() {
	viewer = new BpmnJS({
		container: '.bpmn-container'
	});
	setupFileDragAndDrop();
	$('#bpmn-file-input').on("change", onBPMNFileInputChange);
	$('.export').on("click", exportPNML);
	$(".petri-container").on("mousedown", function(event) {
		$(this).find(".petrinet").data("x", event.clientX);
		$(this).find(".petrinet").data("y", event.clientY);
		$(this).on("mousemove", onPetriDrag);
	});
	$(".petri-container").on("mouseup", function() {
		$(this).off("mousemove", onPetriDrag);
	});
	$(".petri-container").on("wheel mousewheel", onMouseWheel);
	$(".display-modes .mode").on("click", onDisplayModeClick);
	$(".download-all").on("click", onDownloadAllClick);
	$(".pools").on("click", downloadPools);
	$(".graphviz").on("click", downloadGraphviz);

	$("#open-configs").on("click", ()=>$(".configs-wrapper").toggleClass("show"));
	$("#apply-configs").on("click", function() {
		manageXML(actualXML);
	});

	$("#apply-decorators").on("change", function() {
		Config.withDecorators = $(this).val() == "yes";
	});
	$("#apply-timed-tasks").on("change", function() {
		Config.timedTasks = $(this).val() == "yes";
	});
	$("#apply-collapse").on("change", function() {
		Config.withCollapsedXor = $(this).val() == "yes";
	});
	$("#graphviz-text").on("change", function() {
		Config.graphvizTextOutside = $(this).val() == "outside";
	});
	$("#node-size").on("change", function() {
		Config.nodeSize = parseInt($(this).val());
	});
	$("#flow-scaling").on("change", function() {
		Config.scale = parseFloat($(this).val());
	});

	// Load the BPMN diagram opened in a new tab from the batch selection
	let bpmnData = localStorage.getItem("bpmn");
	let tmpName = localStorage.getItem("filename");
	if (bpmnData) {
		fileName = tmpName;
		manageString(bpmnData);
		localStorage.removeItem("bpmn");
		localStorage.removeItem("filename");
	}
});

/**
 * Setup the drag and drop event listeners for the file loader.
 * When a file is dropped, it is loaded and displayed.
 */
function setupFileDragAndDrop() {
  const loaderContainer = $('.loader-container');

  loaderContainer.on('dragover', function (event) {
    event.preventDefault();
    $(this).addClass('dragover');
  });

  loaderContainer.on('dragleave', function () {
    $(this).removeClass('dragover');
  });

  loaderContainer.on('drop', function (event) {
    event.preventDefault();
    $(this).removeClass('dragover');

    const files = event.originalEvent.dataTransfer.files;
	if(files.length == 1 && batch.length == 0)
		manageFile(files[0]);
	else
		manageBatch(files);
  });
}

/**
 * Load the files in the batch.
 * 
 * @param {FileList} files The files to load.
 */
function manageBatch(files) {
	let oneLoaded = false;
	for(let i = 0; i < files.length; i++) {
		let file = files[i];
		if(file.name.split('.').pop() == "bpmn"){
			loadFile(file);
			batch.push(file);
			oneLoaded = true;
		}
	}
	if(!oneLoaded)
		alert("No BPMN files found in the batch.");
	else
		$(".batch-container").show();
}

/**
 * Load a file and create a batch item.
 * 
 * @param {File} file The file to load.
 */
async function loadFile(file) {
	let name = file.name.split('.').slice(0, -1).join('.');
	const fileExtension = file.name.split('.').pop();
	if(fileExtension != "bpmn") {
		alert("Invalid file format. Please upload a BPMN file.");
		return;
	}
	let reader = new FileReader();
	reader.onload = function(e) {
		createBatchItem(name, e.target.result);
	}
	reader.readAsText(file);
}

/**
 * Handle the input change event for the file input.
 * 
 * @param {Event} event The event that triggered the function.
 */
function onBPMNFileInputChange() {
    let props = $(this).prop('files');
	if(props.length == 1 && batch.length == 0)
		manageFile(props[0]);
	else
		manageBatch(props);
}

/**
 * Manage the file.
 * 
 * @param {File} file The file to manage.
 */
async function manageFile(file) {
	fileName = file.name.split('.').slice(0, -1).join('.');
	const fileExtension = file.name.split('.').pop();
	if(fileExtension != "bpmn") {
		alert("Invalid file format. Please upload a BPMN file.");
		return;
	}
	let importer = new Importer();

	await importer.import(file);
	showBPMN(importer.bpmnOGContent);
	manageXML(importer.XML);
}

/**
 * Manage the string.
 * 
 * @param {String} content The content to manage.
 */
async function manageString(content) {
	let importer = new Importer();
	await importer.importString(content);
	showBPMN(importer.bpmnOGContent);
	manageXML(importer.XML);
}

/**
 * Manage the XML.
 * 
 * @param {XML} xml The XML to manage.
 */
function manageXML(xml) {
	let parser = new Parser(xml);
	actualXML = xml;

	let converter = new Converter(parser.BPMN);
	// try {
		petrinet = converter.convert();
	// } catch (e) {
	// 	showErrorToast(e);
	// 	return;
	// }

	showPetriNet(petrinet);

	$(".container").removeClass("show")
	$(".converter-container").addClass("show");
}

/**
 * Show the BPMN diagram.
 * 
 * @param {String} xml The XML to show.
 */
async function showBPMN(xml) {
	try {
		const { warnings } = await viewer.importXML(xml);
	} catch (err) {
		console.log('error rendering', err);
	}
}

/**
 * Show the Petri net.
 * 
 * @param {PetriNet} petrinet The Petri net to show.
 */
async function showPetriNet(petrinet) {
	let petriEl = $(".petrinet")[0];
	$(petriEl).empty();
	petrinet.draw(petriEl, Config.scale, Config.nodeSize+10);
	fixToTopLeft(petriEl, petrinet, Config.scale);
	await new Promise(r => setTimeout(r, 100));
	fixZoom(petriEl);
}

/**
 * Fix the position of the Petri net to the top left.
 * 
 * @param {Element} container The container of the Petri net.
 * @param {PetriNet} petrinet The Petri net.
 * @param {Number} scale The scale of the Petri net.
 */
function fixToTopLeft(container, petrinet, scale) {
    let minX = Number.MAX_SAFE_INTEGER;
    let minY = Number.MAX_SAFE_INTEGER;

    // Trova le coordinate minime tra posti e transizioni
    [...petrinet.places.values(), ...petrinet.transitions.values()].forEach(node => {
        minX = Math.min(minX, node.getX());
        minY = Math.min(minY, node.getY());
    });

    // Applica la trasformazione per posizionare il grafo in alto a sinistra
    $(container).css({
        "transform": `translate(${-minX * scale + 50}px, ${-minY * scale + 50}px)`,
        "transform-origin": "top left"
    });
}


/**
 * Fix the zoom of the Petri net.
 * 
 * @param {Element} container The container of the Petri net.
 */
function fixZoom(container) {
    let minX = Number.MAX_SAFE_INTEGER;
    let maxX = Number.MIN_SAFE_INTEGER;
    let minY = Number.MAX_SAFE_INTEGER;
    let maxY = Number.MIN_SAFE_INTEGER;

    let nodes = $(container).find(".node");

    nodes.each(function () {
        let node = $(this);
        let x = node.position().left;
        let y = node.position().top;
        let xRight = x + node.outerWidth();
        let yBottom = y + node.outerHeight();

        if (x < minX) minX = x;
        if (xRight > maxX) maxX = xRight;
        if (y < minY) minY = y;
        if (yBottom > maxY) maxY = yBottom;
    });

    let containerWidth = $(container).width();
    let containerHeight = $(container).height();
    
    let scaleX = containerWidth / (maxX - minX);
    let scaleY = containerHeight / (maxY - minY);
    let scale = Math.min(scaleX, scaleY); // Usa il valore più piccolo per evitare distorsioni

    // Imposta il punto di origine al centro per una migliore visualizzazione
    $(container).css({
        "transform": `scale(${scale})`,
        "transform-origin": "top left"
    });

    $(container).data("scale", scale);
}


/**
 * Drag the Petri net.
 * 
 * @param {Event} event The event that triggered the function.
 */
function onPetriDrag(event) {
	let container = $(".petrinet")[0];
	let x = event.clientX;
	let y = event.clientY;
	let left = parseInt($(container).css("left"));
	let top = parseInt($(container).css("top"));
	$(container).css("left", (left + x - $(container).data("x")) + "px");
	$(container).css("top", (top + y - $(container).data("y")) + "px");
	$(container).data("x", x);
	$(container).data("y", y);
}

/**
 * Zoom the Petri net.
 * 
 * @param {Event} event The event that triggered the function.
 */
function onMouseWheel(event) {
	if(event.ctrlKey) {
		event.preventDefault(); // Impedisce lo zoom predefinito del browser
		event = event.originalEvent || event; // Per jQuery o compatibilità con eventi vecchi
		let deltaY = event.deltaY || -event.wheelDelta || 0; // deltaY per "wheel", wheelDelta per "mousewheel"
		
		let container = $(".petrinet")[0];
		let scaleTmp = $(container).data("scale") || 1;
		let newScale = scaleTmp - deltaY / 1000;
		$(container).css("transform", "scale(" + newScale + ")");
		$(container).data("scale", newScale);
	} else {
		let container = $(".petrinet")[0];
		let y = event.originalEvent.deltaY * 0.5;
		let top = parseInt($(container).css("top"));
		$(container).css("top", (top - y) + "px");
	}
}

/**
 * Export the Petri net to PNML.
 */
function exportPNML() {
    let exporter = new Exporter(petrinet);
    exporter.export();
    let result = exporter.getResult();
    download(fileName + ".pnml", result);
}

/**
 * Download a file.
 * 
 * @param {String} filename The name of the file.
 * @param {String} text The text to download.
 */
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

/**
 * Handle the click event on the display mode.
 */
function onDisplayModeClick() {
	$(".display-modes .mode").removeClass("active");
	$(this).addClass("active");
	let mode = $(this).data("mode");
	$(".converter-container").removeClass("horizontal vertical bpmn petri");
	$(".converter-container").addClass(mode);
}

/**
 * Create a batch item.
 * 
 * @param {String} filename The name of the file.
 * @param {String} fileImport The content of the file.
 */
function createBatchItem(filename, fileImport) {
	let item = $(`<div class='batch-item'>
		<span>${filename}.bpmn</span>
		<div class='batch-item-buttons'>
			<button class='enter'><img src="./assets/icons/enter-white.png"></button>
			<button class='download'><img src="./assets/icons/downloads-white.png"></button>
		</div>
	</div>`);
	item.data("import", fileImport);
	item.data("filename", filename);
	item.find(".enter").on("click", onEnterClick);
	item.find(".download").on("click", onDownloadClick);
	$(".batch-files").append(item);
}

/**
 * Handle the click event on the enter button.
 */
function onEnterClick() {
    let fileImport = $(this).closest('.batch-item').data("import");	
	saveAndOpen(fileImport);
}

/**
 * Save and open the file.
 * 
 * @param {String} bpmnData The content of the file.
 */
function saveAndOpen(bpmnData) {
    localStorage.setItem("bpmn", bpmnData);
	localStorage.setItem("filename", fileName);
    window.open("/index.html", "_blank");
}

/**
 * Handle the click event on the download button.
 */
async function onDownloadClick() {
	let fileImport = $(this).closest('.batch-item').data("import");
	let name = $(this).closest('.batch-item').data("filename");

	let importer = new Importer();
	await importer.importString(fileImport);
	let parser = new Parser(importer.XML);

	let converter = new Converter(parser.BPMN);
	try {
		petrinet = converter.convert();
	} catch (e) {
		showErrorToast(e);
		return;
	}
    let exporter = new Exporter(petrinet);

    exporter.export();
    let result = exporter.getResult();
    download(name + ".pnml", result);
}

/**
 * Handle the click event on the download all button.
 */
function onDownloadAllClick() {
	$(".batch-item .download").trigger("click");
}

/**
 * Download the pools.
 */
function downloadPools() {
	let exporter = new Exporter(petrinet);
	exporter.exportAll();
	console.log(exporter);
	let pools = exporter.getPools();
	for(let process in pools)
		download(process + ".pnml", pools[process]);
}

/**
 * Download the Graphviz.
 */
function downloadGraphviz() {
	let exporter = new Exporter(petrinet);
	exporter.exportGraphviz(Config.graphvizTextOutside);
	let result = exporter.getGraphviz();
	download(fileName + ".dot", result);
}

/**
 * Show an error toast.
 * @param {String} message The message to show.
 * @param {Number} duration The duration of the toast.
 */
function showErrorToast(message = "Si è verificato un errore.", duration = 3000) {
	const toast = document.getElementById("toast");
	toast.innerHTML = "<b>Error: </b>" + message;
	toast.classList.add("show");

	setTimeout(() => {
		toast.classList.remove("show");
	}, duration);
}