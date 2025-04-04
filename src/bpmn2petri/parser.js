import * as BPMN from './bpmn.js';

/**
 * Parser class to parse a BPMN diagram to a BPMN object
 * 
 * @class Parser
 * @property {Document} xml - The XML document to parse
 * @property {BPMN} BPMN - The BPMN object to store the parsed BPMN diagram
 * @property {Object} layouts - The layouts of the shapes and edges in the BPMN diagram
 * @property {Object} nodeTypeMap - The mapping of the BPMN node types to the BPMN classes
 */
class Parser {
    xml = null;
    BPMN = new BPMN.BPMN();
    layouts = {};
    nodeTypeMap = {
        startEvent: BPMN.StartEvent,
        endEvent: BPMN.EndEvent,
        task: BPMN.Activity,
        lane: BPMN.Participant,
        exclusiveGateway: BPMN.ExclusiveGateway,
        parallelGateway: BPMN.ParallelGateway,
        inclusiveGateway: BPMN.InclusiveGateway,
        complexGateway: BPMN.ComplexGateway,
        eventBasedGateway: BPMN.EventBasedGateway,
        userTask: BPMN.UserTask,
        businessRuleTask: BPMN.BusinessRuleTask,
        serviceTask: BPMN.ServiceTask,
        sendTask: BPMN.SendTask,
        receiveTask: BPMN.ReceiveTask,
        scriptTask: BPMN.ScriptTask,
        manualTask: BPMN.ManualTask,
        intermediateThrowEvent: BPMN.IntermediateThrowEvent,
        intermediateCatchEvent: BPMN.IntermediateCatchEvent,
    };

    constructor(xml) {
        this.xml = xml;
        this.shapesLayouts = this.parseShapesLayouts();
        this.edgesLayouts = this.parseEdgesLayouts();
        this.parseProcesses();
        this.parseMessageFlows();
    }

    /**
     * Parse the shapes layouts from the XML
     * 
     * @returns {Object} The layouts of the shapes
     */
    parseShapesLayouts() {
        const layouts = {};
        const nodes = this.xml.getElementsByTagName('BPMNShape');
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const id = node.getAttribute('bpmnElement');
            const bounds = node.getElementsByTagName('Bounds')[0];
            const x = parseInt(bounds.getAttribute('x'));
            const y = parseInt(bounds.getAttribute('y'));
            const width = parseInt(bounds.getAttribute('width'));
            const height = parseInt(bounds.getAttribute('height'));
            layouts[id] = { x, y, width, height };
        }
        return layouts;
    }

    /**
     * Parse the edges layouts from the XML
     * 
     * @returns {Object} The layouts of the edges
     */
    parseEdgesLayouts() {
        const layouts = {};
        const edges = this.xml.getElementsByTagName('BPMNEdge');
        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];
            const id = edge.getAttribute('bpmnElement');
            const waypoints = edge.getElementsByTagName('waypoint');
            const points = [];
            for (let j = 0; j < waypoints.length; j++) {
                const waypoint = waypoints[j];
                const x = parseInt(waypoint.getAttribute('x'));
                const y = parseInt(waypoint.getAttribute('y'));
                points.push({ x, y });
            }
            layouts[id] = points;
        }
        return layouts;
    }

    /**
     * Find the layout of a shape or edge by its ID
     * 
     * @param {string} id - The ID of the shape or edge
     * @returns {Object} The layout of the shape or edge
     * @returns {null} If the layout is not found
     */
    findLayout(id) {
        return this.shapesLayouts[id] || this.edgesLayouts[id];
    }

    /**
     * Parse the processes from the XML
     */
    parseProcesses() {
        const processes = this.xml.getElementsByTagName('process');
        for (let i = 0; i < processes.length; i++) {
            const process = processes[i];
            const id = process.getAttribute('id');
            const name = process.getAttribute('name');
            const processObj = new BPMN.Process(id, name);

            for (const tag in this.nodeTypeMap) {
                this.parseNodes(process, processObj, tag);
            }

            this.parseFlows(process, processObj);
            this.setNodeArcs(processObj);
            this.BPMN.addProcess(processObj);
        }
    }

    /**
     * Parse the nodes from the XML
     * 
     * @param {Element} process - The process element to parse the nodes from
     * @param {Process} processObj - The process object to add the nodes to
     * @param {string} tagName - The tag name of the nodes to parse
     */
    parseNodes(process, processObj, tagName) {
        const elements = process.getElementsByTagName(tagName);
        const NodeClass = this.nodeTypeMap[tagName];
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const id = element.getAttribute('id');
            const name = element.getAttribute('name');
            const layout = this.findLayout(id);
            const nodeObj = new NodeClass(id, name, layout.x, layout.y, layout.width, layout.height, processObj);
            processObj.addNode(nodeObj);
        }
    }

    /**
     * Parse the flows from the XML
     * 
     * @param {Element} process - The process element to parse the flows from
     * @param {Process} processObj - The process object to add the flows to
     */
    parseFlows(process, processObj) {
        const flows = process.getElementsByTagName('sequenceFlow');
        for (let i = 0; i < flows.length; i++) {
            const flow = flows[i];
            const id = flow.getAttribute('id');
            const name = flow.getAttribute('name');
            const sourceRef = new BPMN.BPMNNode(flow.getAttribute('sourceRef'));
            const targetRef = new BPMN.BPMNNode(flow.getAttribute('targetRef'));
            const layout = this.findLayout(id);
            const flowObj = new BPMN.SequenceFlow(sourceRef, targetRef, id, name, layout, processObj);
            processObj.addFlow(flowObj);
        }
    }

    /**
     * Set the arcs of the nodes in the process
     * 
     * @param {Process} process - The process object to set the arcs for
     */
    setNodeArcs(process) {
        const flows = process.flows;
        for (let i = 0; i < flows.length; i++) {
            let flow = flows[i];
            const sourceRef = flow.source;
            const targetRef = flow.target;
            
            const sourceNode = process.getNodeById(sourceRef.id);
            const targetNode = process.getNodeById(targetRef.id);

            flow.source = sourceNode;
            flow.target = targetNode;

            if (sourceNode != null && targetNode != null) {
                sourceNode.addOutArc(flow);
                targetNode.addInArc(flow);
            }
        }
    }

    /**
     * Parse the message flows from the XML
     */
    parseMessageFlows() {
        const messageFlows = this.xml.getElementsByTagName('messageFlow');
        for (let i = 0; i < messageFlows.length; i++) {
            const messageFlow = messageFlows[i];
            const id = messageFlow.getAttribute('id');
            const name = messageFlow.getAttribute('name');
            const sourceRef = messageFlow.getAttribute('sourceRef');
            const targetRef = messageFlow.getAttribute('targetRef');
            const source = this.BPMN.getNodeById(sourceRef);
            const target = this.BPMN.getNodeById(targetRef);
            const layout = this.findLayout(id);
            const messageFlowObj = new BPMN.MessageFlow(source, target, id, name, layout);
            this.BPMN.addMessageFlow(messageFlowObj);
        }
    }
}

export default Parser;