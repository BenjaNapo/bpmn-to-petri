/**
 * Represents a Business Process Model and Notation (BPMN) diagram.
 * Manages processes and message flows within the BPMN diagram.
 * 
 * @class BPMN
 * @property {Array<Process>} processes - The processes within the BPMN diagram.
 * @property {Array<Flow>} messageFlows - The message flows within the BPMN diagram.
 */
export class BPMN {
    constructor() {
        this.processes = [];
        this.messageFlows = [];
    }

    /**
     * Adds a process to the BPMN instance.
     * 
     * @param {Object} process - The process object to add to the BPMN diagram.
     */
    addProcess(process) {
        this.processes.push(process);
    }

    /**
     * Adds a message flow to the BPMN instance.
     * 
     * @param {Object} flow - The message flow object to add to the BPMN diagram.
     */
    addMessageFlow(flow) {
        this.messageFlows.push(flow);
    }

    /**
     * Searches for a node by its ID across all processes.
     * 
     * @param {string} id - The ID of the node to search for.
     * @returns {Object|null} - The node object if found, otherwise null.
     */
    getNodeById(id) {
        for (let i = 0; i < this.processes.length; i++) {
            const process = this.processes[i];
            const node = process.getNodeById(id);
            if (node) {
                return node;
            }
        }
        return null;
    }

    /**
     * Returns a string representation of the BPMN diagram.
     * 
     * @returns {string} - The string representation of the BPMN diagram.
     */
    toString() {
        let ret = "";
        for (let i = 0; i < this.processes.length; i++) {
            ret += this.processes[i].toString() + "\n";
        }
        return ret;
    }
}

/**
 * Represents a BPMN process.
 * 
 * @class Process
 * @param {string} id - The ID of the process.
 * @param {string} name - The name of the process.
 * @property {string} id - The ID of the process.
 * @property {string} name - The name of the process.
 * @property {Array<Node>} nodes - The nodes within the process.
 * @property {Array<Flow>} flows - The flows within the process.
 */
export class Process {
    constructor(id = "", name = "") {
        this.id = id || `id${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.nodes = [];
        this.flows = [];
    }

    /**
     * Adds a node to the process.
     * 
     * @param {Object} node - The node object to add to the process.
     */
    addNode(node) {
        if (!this.nodes.includes(node)) {
            this.nodes.push(node);
            node.process = this;
        }
    }

    /**
     * Adds a flow to the process.
     * 
     * @param {Object} flow - The flow object to add to the process.
     */
    addFlow(flow) {
        if (!this.flows.includes(flow)) {
            this.flows.push(flow);
            flow.process = this;
        }
    }

    /**
     * Searches for a node by its ID within the process.
     * 
     * @param {string} id - The ID of the node to search for.
     * @returns {Object|null} - The node object if found, otherwise null.
     */
    getNodeById(id) {
        return this.nodes.find(node => node.id === id);
    }

    /**
     * Returns a string representation of the process.
     * 
     * @returns {string} - The string representation of the process.
     */
    toString() {
        let ret = `Process(${this.id}@${this.name})\n`;
        for (let i = 0; i < this.nodes.length; i++) {
            ret += `  ${this.nodes[i].toString()}\n`;
        }
        for (let i = 0; i < this.flows.length; i++) {
            ret += `  ${this.flows[i].toString()}\n`;
        }
        return ret;
    }
}

/**
 * Represents a BPMN diagram.
 * 
 * @class BPMNDiagram
 * @param {Object} process - The process of the BPMN diagram.
 * @property {Object} process - The process of the BPMN diagram.
 * @property {Object} layout - The layout of the BPMN diagram.
 */
export class BPMNDiagram {
    constructor(process) {
        this.process = process;
        this.layout = new BPMNLayout();
    }

    getLayout(nodeOrFlow) {
        return this.layout.get(nodeOrFlow);
    }

    toString() {
        return `BPMNDiagram(${this.process.toString()})`;
    }
}

/**
 * Represents a BPMN collaboration.
 * 
 * @class Collaboration
 * @param {Array<Participant>} participants - The participants of the collaboration.
 * @property {Array<Participant>} participants - The participants of the collaboration.
 */
export class Collaboration {
    constructor(participants = []) {
        this.participants = participants;
    }
}

/**
 * Represents a BPMN participant.
 * 
 * @class Participant
 * @param {string} id - The ID of the participant.
 * @param {string} name - The name of the participant.
 * @property {string} id - The ID of the participant.
 * @property {string} name - The name of the participant.
 */
export class Participant {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}

/**
 * Represents a BPMN Marking.
 * 
 * @class Marking
 * @extends Map
 */
export class Marking extends Map {}

/**
 * Represents the layout of a BPMN node.
 * 
 * @class BPMNNodeLayout
 * @param {number} x - The x-coordinate of the node.
 * @param {number} y - The y-coordinate of the node.
 * @param {number} width - The width of the node.
 * @param {number} height - The height of the node.
 * @property {number} x - The x-coordinate of the node.
 * @property {number} y - The y-coordinate of the node.
 * @property {number} width - The width of the node.
 * @property {number} height - The height of the node.
 */
export class BPMNNodeLayout {
    constructor(x = 0, y = 0, width = 100, height = 100) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * Sets the x-coordinate of the node.
     * 
     * @param {number} x - The x-coordinate of the node.
     */
    setX(x) {
        this.x = x;
    }

    /**
     * Sets the y-coordinate of the node.
     * 
     * @param {number} y - The y-coordinate of the node.
     */
    setY(y) {
        this.y = y;
    }

    /**
     * Returns the x-coordinate of the node.
     * 
     * @returns {number} - The x-coordinate of the node.
     */
    getX() {
        return this.x;
    }

    /**
     * Returns the y-coordinate of the node.
     * 
     * @returns {number} - The y-coordinate of the node.
     */
    getY() {
        return this.y;
    }

    /**
     * Returns the width of the node.
     * 
     * @returns {number} - The width of the node.
     */
    getWidth() {
        return this.width;
    }

    /**
     * Sets the width of the node.
     * 
     * @param {number} width - The width of the node.
     */
    setWidth(width) {
        this.width = width;
    }

    /**
     * Returns the height of the node.
     * 
     * @returns {number} - The height of the node.
     */
    getHeight() {
        return this.height;
    }

    /**
     * Sets the height of the node.
     * 
     * @param {number} height - The height of the node.
     */
    setHeight(height) {
        this.height = height;
    }
}

/**
 * Represents the layout of a BPMN edge.
 * 
 * @class BPMNEdgeLayout
 * @property {Array<Object>} waypoints - The waypoints of the edge.
 */
export class BPMNEdgeLayout {
    constructor() {
        this.waypoints = [];
    }

    /**
     * Adds a waypoint
     * 
     * @param {Object} waypoint - The waypoint to add.
     */
    addWaypoint(waypoint) {
        this.waypoints.push(waypoint);
    }

    /**
     * Clears all waypoints.
     */
    clearWaypoints() {
        this.waypoints = [];
    }

    /**
     * Returns the waypoints of the edge.
     * 
     * @returns {Array<Object>} - The waypoints of the edge.
     */
    getWaypoints() {
        return this.waypoints;
    }
}

/**
 * Represents the layout of a BPMN diagram.
 * 
 * @class BPMNLayout
 * @property {Map<Object, Object>} layoutMap - The layout map of the BPMN diagram.
 */
export class BPMNLayout {
    constructor() {
        this.layoutMap = new Map();
    }

    /**
     * Returns the layout of a node or edge.
     * 
     * @param {Object} node - The node or edge to get the layout of.
     * @returns {Object} - The layout of the node or edge.
     */
    get(node) {
        if (!this.layoutMap.has(node)) {
            if (node instanceof BPMNNode) {
                this.layoutMap.set(node, new BPMNNodeLayout());
            } else if (node instanceof Flow) {
                this.layoutMap.set(node, new BPMNEdgeLayout());
            }
        }
        return this.layoutMap.get(node);
    }
}

/**
 * Represents a BPMN node.
 * 
 * @class BPMNNode
 * @param {string} id - The ID of the node.
 * @param {string} name - The name of the node.
 * @param {number} x - The x-coordinate of the node.
 * @param {number} y - The y-coordinate of the node.
 * @param {number} width - The width of the node.
 * @param {number} height - The height of the node.
 * @param {Object} process - The process the node belongs to.
 * @property {string} id - The ID of the node.
 * @property {string} name - The name of the node.
 * @property {Array<Flow>} inArcs - The incoming arcs of the node.
 * @property {Array<Flow>} outArcs - The outgoing arcs of the node.
 * @property {Object} process - The process the node belongs to.
 * @property {Object} layout - The layout of the node.
 */
export class BPMNNode {
    constructor(id = "", name = "", x = 0, y = 0, width = 100, height = 100, process = null) {
        this.id = id || `id${Math.random().toString(36).substr(2, 9)}`;
        this.name = name || "";
        this.inArcs = [];
        this.outArcs = [];
        this.process = process || null;
        this.layout = new BPMNLayout();
        this.setX(x);
        this.setY(y);
        this.setWidth(width);
        this.setHeight(height);
    }

    /**
     * Adds an incoming arc to the node.
     * 
     * @param {Object} arc - The incoming arc to add to the node.
     */
    addInArc(arc) {
        if (!this.inArcs.includes(arc))
            this.inArcs.push(arc);
    }

    /**
     * Adds an outgoing arc to the node.
     * 
     * @param {Object} arc - The outgoing arc to add to the node.
     */
    addOutArc(arc) {
        if (!this.outArcs.includes(arc))
            this.outArcs.push(arc);
    }

    /**
     * Removes an incoming arc from the node.
     * 
     * @param {Object} arc - The incoming arc to remove from the node.
     */
    removeInArc(arc) {
        this.inArcs = this.inArcs.filter(a => a !== arc);
    }

    /**
     * Removes an outgoing arc from the node.
     * 
     * @param {Object} arc - The outgoing arc to remove from the node.
     */
    removeOutArc(arc) {
        this.outArcs = this.outArcs.filter(a => a !== arc);
    }

    /**
     * Sets the x-coordinate of the node.
     * 
     * @param {number} x - The x-coordinate of the node.
     */
    setX(x) {
        this.layout.get(this).setX(x);
    }

    /**
     * Sets the y-coordinate of the node.
     * 
     * @param {number} y - The y-coordinate of the node.
     */
    setY(y) {
        this.layout.get(this).setY(y);
    }

    /**
     * Returns the x-coordinate of the node.
     * 
     * @returns {number} - The x-coordinate of the node.
     */
    getX() {
        return this.layout.get(this).getX();
    }

    /**
     * Returns the y-coordinate of the node.
     * 
     * @returns {number} - The y-coordinate of the node.
     */
    getY() {
        return this.layout.get(this).getY();
    }

    /**
     * Sets the width of the node.
     * 
     * @param {number} width - The width of the node.
     */
    setWidth(width) {
        this.layout.get(this).setWidth(width);
    }

    /**
     * Sets the height of the node.
     * 
     * @param {number} height - The height of the node.
     */
    setHeight(height) {
        this.layout.get(this).setHeight(height);
    }

    /**
     * Returns the width of the node.
     * 
     * @returns {number} - The width of the node.
     */
    getWidth() {
        return this.layout.get(this).getWidth();
    }

    /**
     * Returns the height of the node.
     * 
     * @returns {number} - The height of the node.
     */
    getHeight() {
        return this.layout.get(this).getHeight();
    }

    /**
     * Returns a string representation of the node.
     * 
     * @returns {string} - The string representation of the node.
     */
    toString() {
        return `${this.id}@${this.name}`;
    }
}

/**
 * Represents a BPMN flow.
 * 
 * @class Flow
 * @param {Object} source - The source node of the flow.
 * @param {Object} target - The target node of the flow.
 * @param {string} id - The ID of the flow.
 * @param {string} name - The name of the flow.
 * @param {Object} layout - The layout of the flow.
 * @param {Object} process - The process the flow belongs to.
 * @property {string} name - The name of the flow.
 * @property {Object} source - The source node of the flow.
 * @property {Object} target - The target node of the flow.
 * @property {Object} layout - The layout of the flow.
 * @property {Object} process - The process the flow belongs to.
 * @property {string} id - The ID of the flow.
 */
export class Flow {
    constructor(source, target, id = "", name = "", layout = null, process = null) {
        this.name = name || "";
        this.source = source;
        this.target = target;
        this.layout = layout;
        this.process = process || null;
        this.id = id || this.computeId(source, target);

        this.source.addOutArc(this);
        this.target.addInArc(this);
    }

    /**
     * Sets the source node of the flow.
     * 
     * @param {Object} source - The source node of the flow.
     */
    setEdgeLayout(layout) {
        this.layout = layout;
    }

    /**
     * Computes the ID of the flow.
     * 
     * @param {Object} source - The source node of the flow.
     * @param {Object} target - The target node of the flow.
     * @returns {string} - The ID of the flow.
     */
    computeId(source, target) {
        return this.source.id + this.target.id;
    }

    /**
     * Returns a string representation of the flow.
     */
    toString() {
        return `${this.source.toString()} -> ${this.target.toString()}`;
    }
}

/**
 * Represents a BPMN gateway.
 * 
 * @class Gateway
 * @extends BPMNNode
 */
export class Gateway extends BPMNNode {}

/**
 * Represents a BPMN sequence flow.
 * 
 * @class SequenceFlow
 * @extends Flow
 */
export class SequenceFlow extends Flow {}

/**
 * Represents a BPMN message flow.
 * 
 * @class MessageFlow
 * @extends Flow
 */
export class MessageFlow extends Flow {}

/**
 * Represents a BPMN association.
 * 
 * @class Association
 * @extends Flow
 */
export class Association extends Flow {}

/**
 * Represents a BPMN data object.
 * 
 * @class DataObject
 * @extends BPMNNode
 */
export class ParallelGateway extends Gateway {
    toString() {
        return `ParallelGateway(${this.id}@${this.name})`;
    }
}

/**
 * Represents a BPMN exclusive gateway.
 * 
 * @class ExclusiveGateway
 * @extends Gateway
 */
export class ExclusiveGateway extends Gateway {
    toString() {
        return `ExclusiveGateway(${this.id}@${this.name})`;
    }
}

/**
 * Represents a BPMN inclusive gateway.
 * 
 * @class InclusiveGateway
 * @extends ExclusiveGateway
 */
export class InclusiveGateway extends ExclusiveGateway {
    toString() {
        return `InclusiveGateway(${this.id}@${this.name})`;
    }
}

/**
 * Represents a BPMN event-based gateway.
 * 
 * @class EventBasedGateway
 * @extends Gateway
 */
export class EventBasedGateway extends Gateway {
    toString() {
        return `EventBasedGateway(${this.id}@${this.name})`;
    }
}

/**
 * Represents a BPMN complex gateway.
 * 
 * @class ComplexGateway
 * @extends Gateway
 */
export class ComplexGateway extends Gateway {
    toString() {
        return `ComplexGateway(${this.id}@${this.name})`;
    }
} 

/**
 * Represents a BPMN task.
 * 
 * @class Task
 * @extends BPMNNode
 */
export class Task extends BPMNNode {
    toString() {
        return `Task(${this.id}@${this.name})`;
    }
}

/**
 * Represents a BPMN event.
 * 
 * @class Event
 * @extends BPMNNode
 */
export class Event extends BPMNNode {
    toString() {
        return `Event(${this.id}@${this.name})`;
    }
}

/**
 * Represents a BPMN start event.
 * 
 * @class StartEvent
 * @extends Event
 */
export class StartEvent extends Event {
    toString() {
        return `StartEvent(${this.id}@${this.name})`;
    }
}

/**
 * Represents a BPMN end event.
 * 
 * @class EndEvent
 * @extends Event
 */
export class EndEvent extends Event {
    toString() {
        return `EndEvent(${this.id}@${this.name})`;
    }
}

/**
 * Represents a BPMN Normal Start Event.
 * 
 * @class NormalStartEvent
 * @extends StartEvent
 */
export class NormalStartEvent extends StartEvent {}

/**
 * Represents a BPMN Message Start Event.
 * 
 * @class MessageStartEvent
 * @extends StartEvent
 */
export class MessageStartEvent extends StartEvent {}

/**
 * Represents a BPMN Intermediate Catch Event.
 * 
 * @class IntermediateCatchEvent
 * @extends BPMNNode
 */
export class IntermediateCatchEvent extends BPMNNode {}

/**
 * Represents a BPMN Message Intermediate Catch Event.
 * 
 * @class MessageIntermediateCatchEvent
 * @extends IntermediateCatchEvent
 */
export class MessageIntermediateCatchEvent extends IntermediateCatchEvent {}

/**
 * Represents a BPMN Error Intermediate Catch Event.
 * 
 * @class ErrorIntermediateCatchEvent
 * @extends IntermediateCatchEvent
 */
export class ErrorIntermediateCatchEvent extends IntermediateCatchEvent {}

/**
 * Represents a BPMN Cancel Intermediate Catch Event.
 * 
 * @class CancelIntermediateCatchEvent
 * @extends IntermediateCatchEvent
 */
export class CancelIntermediateCatchEvent extends IntermediateCatchEvent {}

/**
 * Represents a BPMN Boundary Event.
 * 
 * @class BoundaryEvent
 * @extends BPMNNode
 */
export class BoundaryEvent extends BPMNNode {}

/**
 * Represents a BPMN Message Boundary Event.
 * 
 * @class MessageBoundaryEvent
 * @extends BoundaryEvent
 */
export class MessageBoundaryEvent extends BoundaryEvent {}

/**
 * Represents a BPMN Error Boundary Event.
 * 
 * @class ErrorBoundaryEvent
 * @extends BoundaryEvent
 */
export class ErrorBoundaryEvent extends BoundaryEvent {}

/**
 * Represents a BPMN Cancel Boundary Event.
 * 
 * @class CancelBoundaryEvent
 * @extends BoundaryEvent
 */
export class CancelBoundaryEvent extends BoundaryEvent {}

/**
 * Represents a BPMN Intermediate Throw Event.
 * 
 * @class IntermediateThrowEvent
 * @extends BPMNNode
 */
export class IntermediateThrowEvent extends BPMNNode {}

/**
 * Represents a BPMN Message Intermediate Throw Event.
 * 
 * @class MessageIntermediateThrowEvent
 * @extends IntermediateThrowEvent
 */
export class MessageIntermediateThrowEvent extends IntermediateThrowEvent {}

/**
 * Represents a BPMN Error Intermediate Throw Event.
 * 
 * @class ErrorIntermediateThrowEvent
 * @extends IntermediateThrowEvent
 */
export class NormalIntermediateThrowEvent extends IntermediateThrowEvent {}

/**
 * Represents a BPMN Normal Intermediate Throw Event.
 * 
 * @class NormalIntermediateThrowEvent
 * @extends IntermediateThrowEvent
 */
export class NormalEndEvent extends EndEvent {}

/**
 * Represents a BPMN Message End Event.
 * 
 * @class MessageEndEvent
 * @extends EndEvent
 */
export class MessageEndEvent extends EndEvent {}

/**
 * Represents a BPMN Terminate End Event.
 * 
 * @class TerminateEndEvent
 * @extends EndEvent
 */
export class TerminateEndEvent extends EndEvent {}

/**
 * Represents a BPMN Error End Event.
 * 
 * @class ErrorEndEvent
 * @extends EndEvent
 */
export class ErrorEndEvent extends EndEvent {}

/**
 * Represents a BPMN Cancel End Event.
 * 
 * @class CancelEndEvent
 * @extends EndEvent
 */
export class CancelEndEvent extends EndEvent {}

/**
 * Represents a BPMN User Task.
 * 
 * @class UserTask
 * @extends Task
 * @param {string} assignee - The assignee of the task.
 * @property {string} assignee - The assignee of the task.
 */
export class UserTask extends Task {
    constructor(id, name, x, y, process, assignee) {
        super(id, name, x, y, process);
        this.assignee = assignee;
    }
}

/**
 * Represents a BPMN Business Rule Task.
 * 
 * @class BusinessRuleTask
 * @extends Task
 */
export class BusinessRuleTask extends Task {}

/**
 * Represents a BPMN Service Task.
 * 
 * @class ServiceTask
 * @extends Task
 */
export class ServiceTask extends Task {}

/**
 * Represents a BPMN Send Task.
 * 
 * @class SendTask
 * @extends Task
 */
export class SendTask extends Task {}

/**
 * Represents a BPMN Receive Task.
 * 
 * @class ReceiveTask
 * @extends Task
 */
export class ReceiveTask extends Task {}

/**
 * Represents a BPMN Script Task.
 * 
 * @class ScriptTask
 * @extends Task
 */
export class ScriptTask extends Task {}

/**
 * Represents a BPMN Manual Task.
 * 
 * @class ManualTask
 * @extends Task
 */
export class ManualTask extends Task {}

/**
 * Represents a BPMN SubProcess.
 * 
 * @class SubProcess
 * @extends Task
 */
export class SubProcess extends Task {}

/**
 * Represents a BPMN Activity.
 * 
 * @class Activity
 * @extends Task
 */
export class Activity extends Task {}