/**
 * This class is responsible for importing a BPMN file and converting it to a XML object.
 * 
 * @class Importer
 * @param {boolean} removePrefix - If true, removes the prefix from the XML tags.
 * @property {DOMParser} parser - DOMParser object.
 * @property {FileReader} reader - FileReader object.
 * @property {XMLDocument} XML - XML object.
 * @property {string} bpmnContent - BPMN content.
 * @property {string} bpmnOGContent - Original BPMN content.
 * @property {boolean} removePrefix - If true, removes the prefix from the XML tags.
 */
class Importer {
    parser = null;
    reader = null;
    XML = null;
    bpmnContent = "";
    bpmnOGContent = "";
    removePrefix = true;

    constructor(removePrefix = true) {
        this.parser = new DOMParser();
        this.reader = new FileReader();
        this.removePrefix = removePrefix;
    }

    /**
     * Import a BPMN file and convert it to a XML object.
     * 
     * @param {File} file - The BPMN file to import.
     * @returns {Promise} A promise that resolves with the XML object.
     */
    async import(file) {
        return new Promise((resolve, reject) => {
            let supportedTypes = /\.(txt|bpmn|xml)$/i; 
            if (file.name.match(supportedTypes)) {  
                const t = this;          
                this.reader.onload = function(e) {
                    t.bpmnContent = t.reader.result;
                    t.bpmnOGContent = t.bpmnContent;
                    if(t.removePrefix)
                        t.bpmnContent = t.bpmnContent.replace(/(<\/?)[^:\s]+:/g, '$1');
                    t.XML = t.parser.parseFromString(t.bpmnContent, "text/xml");
                    resolve(t.XML);
                }
                
                this.reader.readAsText(file);	
            } else
                reject(new Error('File not supported!'));
        });
    }

    /**
     * Import a BPMN string and convert it to a XML object.
     * 
     * @param {string} content - The BPMN string to import.
     * @returns {Promise} A promise that resolves with the XML object.
     */
    async importString(content) {
        return new Promise((resolve, reject) => {
            this.bpmnContent = content;
            this.bpmnOGContent = this.bpmnContent;
            if(this.removePrefix)
                this.bpmnContent = this.bpmnContent.replace(/(<\/?)[^:\s]+:/g, '$1');
            this.XML = this.parser.parseFromString(this.bpmnContent, "text/xml");
            resolve(this.XML);
        });
    }
}

export default Importer;