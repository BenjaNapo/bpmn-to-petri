import * as BPMN from './bpmn.js';
import { PetriNet, Place, Transition, Arc, XORJoin, XORSplit, ANDJoin, ANDSplit } from './petrinet.js';
import Utils from './utils.js';
import Config from './config.js';

/**
 * This class is responsible for converting BPMN diagrams to Petri nets.
 * It receives a BPMN diagram and creates a Petri net based on it.
 *
 * @class Converter
 * @param {BPMN} bpmn - The BPMN diagram to be converted.
 * @property {BPMN} bpmn - The BPMN diagram to be converted.
 * @property {PetriNet} petrinet - The Petri net created from the BPMN diagram.
 * @property {Object} toRemove - The arcs and transitions to be removed from the Petri net after diving XOR.
 */
class Converter {
    toTransition = [
        BPMN.StartEvent,
        BPMN.EndEvent,
        BPMN.Activity,
        BPMN.UserTask,
        BPMN.BusinessRuleTask,
        BPMN.ServiceTask,
        BPMN.SendTask,
        BPMN.ReceiveTask,
        BPMN.ScriptTask,
        BPMN.ManualTask,
        BPMN.IntermediateThrowEvent,
        BPMN.IntermediateCatchEvent
    ];

    constructor(bpmn) {
        this.bpmn = bpmn;
        this.petrinet = new PetriNet();
        
        this.toRemove = {
            transitions: [],
            arcs: []
        };
    }

    /**
     * Converts the BPMN diagram to a Petri net.
     * 
     * @returns {PetriNet} The Petri net created from the BPMN diagram.
     */
    convert() {                    
        this.bpmn.processes.forEach(process => {
            process.nodes.forEach(node => {
                if (this.isTask(node))
                    this.convertTask(node, process, Config.timedTasks);
            });
            process.nodes.forEach(node => {
                if (node instanceof BPMN.Gateway)
                    this.convertGateway(node, process);
            });
            process.flows.forEach(flow => {
                if (flow instanceof BPMN.SequenceFlow)
                    try{
                        this.convertFlow(flow, process);
                    } catch (e) {
                        throw "Error converting flow arcs";
                    }
            });
        });

        let nXor = this.petrinet.transitions.size;
        for(let i = 0; i < nXor; i++) {
            let transitionId = Array.from(this.petrinet.transitions.keys())[i];
            let transition = this.petrinet.transitions.get(transitionId);
            if(transition instanceof XORSplit)
                this.divideXORSplit(transition);
            else if(transition instanceof XORJoin)
                this.divideXORJoin(transition);
        }

        for(let i = 0; i < this.toRemove.arcs.length; i++) {
            let arc = this.toRemove.arcs[i];
            this.petrinet.removeArc(arc);
        }
        for(let i = 0; i < this.toRemove.transitions.length; i++) {
            let transition = this.toRemove.transitions[i];
            this.petrinet.removeTransition(transition);
        }

        this.bpmn.messageFlows.forEach(messageFlow => {
            this.convertFlow(messageFlow);
        });

        this.addStartEnd();

        this.unifyStartEnd();

        this.addToken();

        return this.petrinet;
    }

    /**
     * Checks if a BPMN node is a task.
     * 
     * @param {BPMN.Node} node - The BPMN node to be checked.
     * @returns {Boolean} True if the node is a task, false otherwise.
     */
    isTask(node) {
        return this.toTransition.some(cls => node instanceof cls);
    }

    /**
     * Converts a BPMN task to a Petri net transition.
     * 
     * @param {BPMN.Node} task - The BPMN task to be converted.
     * @param {BPMN.Process} process - The BPMN process to which the task belongs.
     * @param {Boolean} timed - True if the task is timed, false otherwise.
     * @returns {Transition} The transition created from the BPMN task.
     */
    convertTask(task, process, timed = true) {
        let coords = Utils.getBPMNNodeCoordinates(task);
        let name = timed ? task.name + "_start" : task.name;
        let transition = new Transition(task.id, name, coords.x, coords.y, this.petrinet, process.id);
        if(timed && task instanceof BPMN.Task) {
            let arcToSwitch = this.findOutgoingSequenceFlow(task, process);
            if(arcToSwitch) {
                let layout = task.layout.get(task);
                let targetLayout = arcToSwitch.layout[1];
                targetLayout = {
                    x: targetLayout.x - layout.width / 2,
                    y: targetLayout.y - layout.height / 2
                };
                let coords2 = {x: (layout.x + targetLayout.x) / 2, y: (layout.y + targetLayout.y) / 2};
                let endTask = new BPMN.Activity(task.id + "_end", task.name + "_end", coords2.x, coords2.y, layout.width, layout.height);
                let layout2 = new BPMN.BPMNLayout();
                let link = new BPMN.SequenceFlow(task, endTask, task.id + "_link", task.name + "_link", layout2);
                arcToSwitch.source = endTask;

                let messageFlows = this.findOutgoingMessageFlows(task);
                messageFlows.forEach(flow => {
                    flow.source = endTask;
                });
                
                this.convertTask(endTask, process, false);
                this.convertFlow(link, process);
            }
        } else if(task instanceof BPMN.StartEvent)
            this.petrinet.addStartTransition(transition, process.id);
        else if(task instanceof BPMN.EndEvent)
            this.petrinet.addEndTransition(transition, process.id);
        return transition;
    }

    /**
     * Finds the outgoing sequence flow of a BPMN task.
     * 
     * @param {BPMN.Node} task - The BPMN task to find the outgoing sequence flow.
     * @param {BPMN.Process} process - The BPMN process to which the task belongs.
     * @returns {BPMN.SequenceFlow} The outgoing sequence flow of the task.
     * @returns {null} If the task has no outgoing sequence flow.
     */
    findOutgoingSequenceFlow(task, process) {
        let ret = null;
        process.flows.forEach(flow => {
            if (flow instanceof BPMN.SequenceFlow)
                if(flow.source.id === task.id)
                    ret = flow;
        });
        return ret;
    }

    /**
     * Finds the outgoing message flows of a BPMN task.
     * 
     * @param {BPMN.Node} task - The BPMN task to find the outgoing message flows.
     * @returns {Array} The outgoing message flows of the task.
     */
    findOutgoingMessageFlows(task) {
        let ret = [];
        this.bpmn.messageFlows.forEach(flow => {
            if(flow instanceof BPMN.MessageFlow)
                if(flow.source.id === task.id)
                    ret.push(flow);
        });
        return ret;
    }

    /**
     * Converts a BPMN gateway to a Petri net transition.
     * 
     * @param {BPMN.Gateway} gateway - The BPMN gateway to be converted.
     * @param {BPMN.Process} process - The BPMN process to which the gateway belongs.
     */
    convertGateway(gateway, process) {
        if(gateway instanceof BPMN.InclusiveGateway) // Since inclusive gateway is a subclass of exclusive gateway, it must be checked first
            this.convertInclusiveGateway(gateway, process);
        else if(gateway instanceof BPMN.ExclusiveGateway)
            this.convertExclusiveGateway(gateway, process);
        else if(gateway instanceof BPMN.ParallelGateway)
            this.convertParallelGateway(gateway, process);
        else if(gateway instanceof BPMN.EventBasedGateway)
            this.convertEventBasedGateway(gateway, process);
        else if(gateway instanceof BPMN.ComplexGateway)
            this.convertComplexGateway(gateway, process);
    }

    /**
     * Converts a BPMN exclusive gateway to a Petri net transition.
     * 
     * @param {BPMN.ExclusiveGateway} gateway - The BPMN exclusive gateway to be converted.
     * @param {BPMN.Process} process - The BPMN process to which the gateway belongs.
     */
    convertExclusiveGateway(gateway, process) {
        let coords = Utils.getBPMNNodeCoordinates(gateway);
        if(gateway.outArcs.length > 1 && gateway.inArcs.length > 1)
            throw "Exclusive Gateway with multiple incoming and outgoing flows";
        else if(gateway.outArcs.length > 1 && gateway.inArcs.length === 1) {
            let split = null;
            if(Config.withDecorators)
                split = new XORSplit(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id, "decorated");
            else
                split = new XORSplit(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id);
            if(!Config.withDecorators && !Config.withCollapsedXor) {
                let outArcs = gateway.outArcs;
                outArcs.forEach(arc => {
                    let tCoords = Utils.calculateHalfwayCoords(gateway, arc.target, 0.3);
                    let transition = new Transition(arc.target.id + "_middle_split", arc.target.name + " Choosing", tCoords.x, tCoords.y, this.petrinet, process.id);
                    let pCoords = Utils.calculateHalfwayCoords(gateway, arc.target, 0.6);
                    let place = new Place(arc.target.id + "_end_split", arc.target.name + " Chosen", pCoords.x, pCoords.y, this.petrinet, process.id);
                    let arc1 = new Arc(split.ref, transition, this.petrinet, process.id);
                    let arc2 = new Arc(transition, place, this.petrinet, process.id);
                    let arc3 = new Arc(place, this.petrinet.getNode(arc.target.id), this.petrinet, process.id);
                    process.flows = process.flows.filter(flow => flow.id !== arc.id);
                });
            }
        } else if(gateway.outArcs.length === 1 && gateway.inArcs.length > 1) {
            let join = null;
            if(Config.withDecorators)
                join = new XORJoin(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id, "decorated");
            else
                join = new XORJoin(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id);
            if(!Config.withDecorators && !Config.withCollapsedXor) {
                let inArcs = gateway.inArcs;
                inArcs.forEach(arc => {
                    if(!(arc.source instanceof BPMN.ExclusiveGateway && arc.source.outArcs.length === 1 && arc.source.inArcs.length > 1)) {
                        let pCoords = Utils.calculateHalfwayCoords(arc.source, gateway, 0.3);
                        let place = new Place(arc.source.id + "_middle_join", arc.source.name + " Choosing", pCoords.x, pCoords.y, this.petrinet, process.id);
                        let tCoords = Utils.calculateHalfwayCoords(arc.source, gateway, 0.6);
                        let transition = new Transition(arc.source.id + "_end_join", arc.source.name + " Chosen", tCoords.x, tCoords.y, this.petrinet, process.id);
                        let s = arc.source;
                        let sId = s.id;
                        if(s instanceof BPMN.ExclusiveGateway && s.outArcs.length === 1 && s.inArcs.length > 1)
                            sId +=  "_middle_join";
                        let arc1 = new Arc(this.petrinet.getNode(sId), place, this.petrinet, process.id);
                        let arc2 = new Arc(place, transition, this.petrinet, process.id);
                        let arc3 = new Arc(transition, join.ref, this.petrinet, process.id);
                        process.flows = process.flows.filter(flow => flow.id !== arc.id);
                    }
                });
            }
        }
    }

    /**
     * Divides a XOR split transition into multiple transitions.
     * 
     * @param {XORSplit} transition - The XOR split transition to be divided.
     */
    divideXORSplit(transition) {
        let inArc = transition.inArcs[0];
        let outArcs = transition.outArcs;
        if(outArcs.length > 1) {
            for(let i = 0; i < outArcs.length; i++) {
                let arc = outArcs[i];
                let newTransition = new XORSplit(transition.id + "_op_" + (i+1), transition.name, transition.getUnscaledX(), transition.getUnscaledY(), this.petrinet, transition.process, "decorated");
                let newInArc = new Arc(inArc.source, newTransition, this.petrinet, transition.process);
                let newOutArc = new Arc(newTransition, arc.target, this.petrinet, transition.process);
                this.toRemove.arcs.push(arc);
            }
            this.toRemove.transitions.push(transition);
            this.toRemove.arcs.push(inArc);
        }
    }

    /**
     * Divides a XOR join transition into multiple transitions.
     * 
     * @param {XORJoin} transition - The XOR join transition to be divided.
     */
    divideXORJoin(transition) {
        let outArc = transition.outArcs[0];
        let inArcs = transition.inArcs;
        if(inArcs.length > 1) {
            for(let i = 0; i < inArcs.length; i++) {
                let arc = inArcs[i];
                let newTransition = new XORJoin(transition.id + "_op_" + (i+1), transition.name, transition.getUnscaledX(), transition.getUnscaledY(), this.petrinet, transition.process, "decorated");
                let newOutArc = new Arc(newTransition, outArc.target, this.petrinet, transition.process);
                let newInArc = new Arc(arc.source, newTransition, this.petrinet, transition.process);
                this.toRemove.arcs.push(arc);
            }
            this.toRemove.transitions.push(transition);
            this.toRemove.arcs.push(outArc);
        }
    }

    /**
     * Converts a BPMN parallel gateway to a Petri net transition.
     * 
     * @param {BPMN.ParallelGateway} gateway - The BPMN parallel gateway to be converted.
     * @param {BPMN.Process} process - The BPMN process to which the gateway belongs.
     */
    convertParallelGateway(gateway, process) {
        let coords = Utils.getBPMNNodeCoordinates(gateway);
        if(gateway.outArcs.length > 1 && gateway.inArcs.length > 1) {
            console.log("Error: Parallel Gateway with multiple incoming and outgoing flows");
        } else if(gateway.outArcs.length > 1 && gateway.inArcs.length === 1) {
            let join = new ANDSplit(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id);
        } else if(gateway.outArcs.length === 1 && gateway.inArcs.length > 1) {
            let split = new ANDJoin(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id);
        }
    }

    /**
     * Converts a BPMN inclusive gateway to a Petri net transition.
     * 
     * @param {BPMN.InclusiveGateway} gateway - The BPMN inclusive gateway to be converted.
     * @param {BPMN.Process} process - The BPMN process to which the gateway belongs.
     */
    convertInclusiveGateway(gateway, process) {
        let coords = Utils.getBPMNNodeCoordinates(gateway);
        if(gateway.outArcs.length > 1 && gateway.inArcs.length > 1)
            console.log("Error: Exclusive Gateway with multiple incoming and outgoing flows");
        else if(gateway.outArcs.length > 1 && gateway.inArcs.length === 1) {
            let split = new Place(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id);
            let outArcs = gateway.outArcs;
            let places = [];
            outArcs.forEach(arc => {
                let tCoords = Utils.calculateHalfwayCoords(gateway, arc.target, 0.3);
                let transition = new Transition(arc.target.id + "_middle_split", "Choosing " + arc.target.name, tCoords.x, tCoords.y, this.petrinet, process.id);
                let pCoords = Utils.calculateHalfwayCoords(gateway, arc.target, 0.6);
                let place = new Place(arc.target.id + "_end_split", arc.target.name + " Chosen", pCoords.x, pCoords.y, this.petrinet, process.id);
                places.push(place);
                let arc1 = new Arc(split, transition, this.petrinet, process.id);
                let arc2 = new Arc(transition, place, this.petrinet, process.id);
                let arc3 = new Arc(place, this.petrinet.getNode(arc.target.id), this.petrinet, process.id);
                process.flows = process.flows.filter(flow => flow.id !== arc.id);
            });
            let powerSet = Utils.powerSet(places);
            let i = 1;
            powerSet.forEach(subset => {
                if(subset.length > 1) {
                    let startX = 0;
                    let startY = 0;
                    let startName = "Choosing ";
                    subset.forEach(place => {
                        startX += place.getX();
                        startY += place.getY();
                        startName += place.name.replaceAll("Chosen", "");
                    });
                    startX /= subset.length;
                    startY /= subset.length;
                    let andSplit = new Transition(gateway.id + "_s" + i, startName, 0, 0, this.petrinet, process.id);
                    andSplit.setUnscaledX(startX);
                    andSplit.setUnscaledY(startY);
                    let arc = new Arc(split, andSplit, this.petrinet, process.id);
                    subset.forEach(place => {
                        let newArc = new Arc(andSplit, place, this.petrinet, process.id);
                    });
                }
                i++;
            });
        } else if(gateway.outArcs.length === 1 && gateway.inArcs.length > 1) {
            let join = new Place(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id);
            let inArcs = gateway.inArcs;
            let places = [];
            inArcs.forEach(arc => {
                let pCoords = Utils.calculateHalfwayCoords(arc.source, gateway, 0.3);
                let place = new Place(arc.source.id + "_middle_join", arc.source.name + " Choosing", pCoords.x, pCoords.y, this.petrinet, process.id);
                let tCoords = Utils.calculateHalfwayCoords(arc.source, gateway, 0.6);
                let transition = new Transition(arc.source.id + "_end_join", arc.source.name + " Chosen", tCoords.x, tCoords.y, this.petrinet, process.id);
                places.push(place);
                let arc1 = new Arc(this.petrinet.getNode(arc.source.id), place, this.petrinet, process.id);
                let arc2 = new Arc(place, transition, this.petrinet, process.id);
                let arc3 = new Arc(transition, join, this.petrinet, process.id);
                process.flows = process.flows.filter(flow => flow.id !== arc.id);
            });
            let powerSet = Utils.powerSet(places);
            let i = 1;
            powerSet.forEach(subset => {
                if(subset.length > 1) {
                    let endX = 0;
                    let endY = 0;
                    let endName = "Choosing ";
                    subset.forEach(place => {
                        endX += place.getX();
                        endY += place.getY();
                        endName += place.name.replaceAll("Chosen", "");
                    });
                    endX /= subset.length;
                    endY /= subset.length;
                    let andJoin = new Transition(gateway.id + "_j" + i, endName, 0, 0, this.petrinet, process.id);
                    andJoin.setUnscaledX(endX);
                    andJoin.setUnscaledY(endY);
                    let arc = new Arc(andJoin, join, this.petrinet, process.id);
                    subset.forEach(place => {
                        let newArc = new Arc(place, andJoin, this.petrinet, process.id);
                    });
                }
                i++;
            });
        }
    }

    /**
     * Converts a BPMN event based gateway to a Petri net transition.
     * 
     * @param {BPMN.EventBasedGateway} gateway - The BPMN event based gateway to be converted.
     * @param {BPMN.Process} process - The BPMN process to which the gateway belongs.
     */
    convertEventBasedGateway(gateway, process) {
        let coords = Utils.getBPMNNodeCoordinates(gateway);
        if(gateway.inArcs.length > 1)
            console.log("Error: Event Based Gateway with multiple incoming flows");
        else if(gateway.outArcs.length > 1 && gateway.inArcs.length === 1) {
            let place = new Place(gateway.id, gateway.name, coords.x, coords.y, this.petrinet, process.id);
        }
    }

    convertComplexGateway(gateway, process) {
        throw new Error("Error: Complex Gateway is not managed.");
    }

    /**
     * Converts a BPMN flow to a Petri net arc.
     * 
     * @param {BPMN.Flow} flow - The BPMN flow to be converted.
     * @param {BPMN.Process} process - The BPMN process to which the flow belongs.
     */
    convertFlow(flow, process) {
        let source = this.petrinet.getNode(flow.source.id);
        let target = this.petrinet.getNode(flow.target.id);
        if(process == null)
            process = {id: null}; 

        if(source instanceof Transition && target instanceof Transition) {
            let halfCoords = Utils.calculateHalfwayCoords(flow.source, flow.target);
            if(flow.layout.length > 2)
                halfCoords = flow.layout[1];
            let place = new Place(flow.id, flow.name, halfCoords.x, halfCoords.y, this.petrinet, process.id);
            let arc = new Arc(source, place, this.petrinet, process.id);
            let endArc = new Arc(place, target, this.petrinet, process.id);
            if(flow.layout.length > 2)
                flow.layout.forEach((waypoint, index) => {
                    if (index >= 2 && index !== flow.layout.length - 1)
                        endArc.addWaypoint(waypoint.x, waypoint.y);
                }); 
        } else if(source instanceof Place && target instanceof Place) {
            let halfCoords = Utils.calculateHalfwayCoords(flow.source, flow.target);
            if(flow.layout.length > 2)
                halfCoords = flow.layout[1];
            let transition = new Transition(flow.id, flow.name, halfCoords.x, halfCoords.y, this.petrinet, process.id);
            let arc = new Arc(source, transition, this.petrinet, process.id);
            let endArc = new Arc(transition, target, this.petrinet, process.id);
            if(flow.layout.length > 2)
                flow.layout.forEach((waypoint, index) => {
                    if (index >= 2 && index !== flow.layout.length - 1)
                        endArc.addWaypoint(waypoint.x, waypoint.y);
                });
        } else {
            let arc = new Arc(source, target, this.petrinet, process.id);
            if(flow.layout.length > 2)
                flow.layout.forEach((waypoint, index) => {
                    if (index !== 0 && index !== flow.layout.length - 1)
                        arc.addWaypoint(waypoint.x, waypoint.y);
                });
        }
    }

    /**
     * Adds start and end places to each process of the Petri net.
     */
    addStartEnd() {
        for(let process in this.petrinet.startTransitions) {
            let transitions = this.petrinet.startTransitions[process];
            if(transitions.length >= 1) {
                let start = new Place("start_p_" + process, "Start", 0, 0, this.petrinet, process.id);
                let startX = Number.MAX_SAFE_INTEGER;
                let startY = 0;
                transitions.forEach(transition => {
                    startX = Math.min(startX, transition.getX());
                    startY += transition.getY();
                });
                startY /= transitions.length;
                start.setUnscaledX(startX - 100);
                start.setUnscaledY(startY);
                transitions.forEach(transition => {
                    let arc = new Arc(start, transition, this.petrinet, process.id);
                });
                this.petrinet.addStartPlace(start);
            }
        }
        for(let process in this.petrinet.endTransitions) {
            let transitions = this.petrinet.endTransitions[process];
            if(transitions.length >= 1) {
                let end = new Place("end_p_" + process, "End", 0, 0, this.petrinet, process.id);
                let endX = Number.MIN_SAFE_INTEGER;
                let endY = 0;
                transitions.forEach(transition => {
                    endX = Math.max(endX, transition.getX());
                    endY += transition.getY();
                });
                endY /= transitions.length;
                end.setUnscaledX(endX + 100);
                end.setUnscaledY(endY);
                transitions.forEach(transition => {
                    let arc = new Arc(transition, end, this.petrinet, process.id);
                });
                this.petrinet.addEndPlace(end);
            }
        }
    }

    /**
     * Unifies the start and end places of all processes by one single place.
     * If there are multiple start or end places, they are unified into one.
     * The unified start place is connected to all start transitions.
     * The unified end place is connected to all end transitions.
     */
    unifyStartEnd() {
        let places = this.petrinet.startPlaces;
        if(places.length > 1) {
            let start = new Transition("start_t", "Start", 0, 0, this.petrinet);
            let startX = Number.MAX_SAFE_INTEGER;
            this.petrinet.places.forEach(place => {
                startX = Math.min(startX, place.getX());
            });
            let startY = 0;
            places.forEach(place => {
                startY += place.getY();
            });
            startY /= places.length;
            start.setUnscaledX(startX - 100);
            start.setUnscaledY(startY);
            places.forEach(place => {
                let arc = new Arc(start, place, this.petrinet);
            });
            let startPlace = new Place("start_p", "Start", 0, 0, this.petrinet);
            startPlace.setUnscaledX(Math.max(0, startX - 200));
            startPlace.setUnscaledY(startY);
            let arc = new Arc(startPlace, start, this.petrinet);
        }

        places = this.petrinet.endPlaces;
        if(places.length > 1) {
            let end = new Transition("end_t", "End", 0, 0, this.petrinet);
            let endX = Number.MIN_SAFE_INTEGER;
            this.petrinet.places.forEach(place => {
                endX = Math.max(endX, place.getX());
            });
            let endY = 0;
            places.forEach(place => {
                endY += place.getY();
            });
            endY /= places.length;
            end.setUnscaledX(endX + 100);
            end.setUnscaledY(endY);
            places.forEach(place => {
                let arc = new Arc(place, end, this.petrinet);
            });
            let endPlace = new Place("end_p", "End", 0, 0, this.petrinet);
            endPlace.setUnscaledX(endX + 200);
            endPlace.setUnscaledY(endY);
            let arc = new Arc(end, endPlace, this.petrinet);
        }
    }

    /**
     * Adds a token to the start places of the Petri net.
     */
    addToken() {
        let places = this.petrinet.places;
        places.forEach(place => {
            if(place.inArcs.length === 0)
                place.addTokens(1);
        });
    }
}

export default Converter;