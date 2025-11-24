import * as BPMN from "./bpmn.js";
import {
    PetriNet,
    Place,
    Transition,
    Arc,
    XORJoin,
    XORSplit,
    ANDJoin,
    ANDSplit,
} from "./petrinet.js";
import Utils from "./utils.js";
import Config from "./config.js";

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
        BPMN.IntermediateCatchEvent,
    ];

    constructor(bpmn) {
        this.bpmn = bpmn;
        this.petrinet = new PetriNet();

        this.toRemove = {
            transitions: [],
            arcs: [],
        };

        this.deferredGatewayLinks = [];
    }

    /**
     * Converts the BPMN diagram to a Petri net.
     *
     * @returns {PetriNet} The Petri net created from the BPMN diagram.
     */
    convert() {
        this.bpmn.processes.forEach((process) => {
            process.nodes.forEach((node) => {
                if (this.isTask(node))
                    this.convertTask(node, process, Config.timedTasks);
            });
            process.nodes.forEach((node) => {
                if (node instanceof BPMN.Gateway)
                    this.convertGateway(node, process);
            });
            process.flows.forEach((flow) => {
                if (flow instanceof BPMN.SequenceFlow)
                    try {
                        this.convertFlow(flow, process);
                    } catch (e) {
                        console.error(e);
                        throw "Error converting flow arcs: " + e.message;
                    }
            });
        });

        let nXor = this.petrinet.transitions.size;
        for (let i = 0; i < nXor; i++) {
            let transitionId = Array.from(this.petrinet.transitions.keys())[i];
            let transition = this.petrinet.transitions.get(transitionId);
            if (transition instanceof XORSplit) this.divideXORSplit(transition);
            else if (transition instanceof XORJoin)
                this.divideXORJoin(transition);
        }

        for (let i = 0; i < this.toRemove.arcs.length; i++) {
            let arc = this.toRemove.arcs[i];
            this.petrinet.removeArc(arc);
        }
        for (let i = 0; i < this.toRemove.transitions.length; i++) {
            let transition = this.toRemove.transitions[i];
            this.petrinet.removeTransition(transition);
        }

        this.bpmn.messageFlows.forEach((messageFlow) => {
            this.convertFlow(messageFlow);
        });

        this.deferredGatewayLinks.forEach((link) => {
            // 1) split-out: place → target
            if (link.type === "split-out") {
                const target = this.petrinet.getNode(link.targetId);
                if (!target) {
                    console.error(
                        "Deferred split-out: target Petri node not found for",
                        link.targetId
                    );
                    return;
                }
                new Arc(link.from, target, this.petrinet, link.processId);
            }

            // 2) join-in: source → place
            else if (link.type === "join-in") {
                const source = this.petrinet.getNode(link.sourceId);
                if (!source) {
                    console.error(
                        "Deferred join-in: source Petri node not found for",
                        link.sourceId
                    );
                    return;
                }
                new Arc(source, link.place, this.petrinet, link.processId);
            }

            // 3) mixed-join-in: source → join.ref
            else if (link.type === "mixed-join-in") {
                const source = this.petrinet.getNode(link.sourceId);
                if (!source) {
                    console.error(
                        "Deferred mixed-join-in: source Petri node not found for",
                        link.sourceId
                    );
                    return;
                }

                if (source instanceof Transition) {
                    new Arc(source, link.target, this.petrinet, link.processId);
                } else {
                    const tX = (source.getX() + link.target.getX()) / 2;
                    const tY = (source.getY() + link.target.getY()) / 2;

                    const t = new Transition(
                        link.sourceId + "_to_mixed_" + link.target.id,
                        "",
                        tX,
                        tY,
                        this.petrinet,
                        link.processId
                    );

                    new Arc(source, t, this.petrinet, link.processId);
                    new Arc(t, link.target, this.petrinet, link.processId);
                }
            }

            // 4) mixed-split-out: split.ref → target (non usato nel tuo esempio ma utile in generale)
            else if (link.type === "mixed-split-out") {
                const target = this.petrinet.getNode(link.targetId);
                if (!target) {
                    console.error(
                        "Deferred mixed-split-out: target Petri node not found for",
                        link.targetId
                    );
                    return;
                }

                if (target instanceof Transition) {
                    new Arc(link.from, target, this.petrinet, link.processId);
                } else {
                    const tX = (link.from.getX() + target.getX()) / 2;
                    const tY = (link.from.getY() + target.getY()) / 2;

                    const t = new Transition(
                        link.from.id + "_to_mixed_" + link.targetId,
                        "",
                        tX,
                        tY,
                        this.petrinet,
                        link.processId
                    );

                    new Arc(link.from, t, this.petrinet, link.processId);
                    new Arc(t, target, this.petrinet, link.processId);
                }
            }
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
        return this.toTransition.some((cls) => node instanceof cls);
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
        let transition = new Transition(
            task.id,
            name,
            coords.x,
            coords.y,
            this.petrinet,
            process.id
        );
        if (timed && task instanceof BPMN.Task) {
            let arcToSwitch = this.findOutgoingSequenceFlow(task, process);
            if (arcToSwitch) {
                let layout = task.layout.get(task);
                let targetLayout = arcToSwitch.layout[1];
                targetLayout = {
                    x: targetLayout.x - layout.width / 2,
                    y: targetLayout.y - layout.height / 2,
                };
                let coords2 = {
                    x: (layout.x + targetLayout.x) / 2,
                    y: (layout.y + targetLayout.y) / 2,
                };
                let endTask = new BPMN.Activity(
                    task.id + "_end",
                    task.name + "_end",
                    coords2.x,
                    coords2.y,
                    layout.width,
                    layout.height
                );
                let layout2 = new BPMN.BPMNLayout();
                let link = new BPMN.SequenceFlow(
                    task,
                    endTask,
                    task.id + "_link",
                    task.name + "_link",
                    layout2
                );
                arcToSwitch.source = endTask;

                let messageFlows = this.findOutgoingMessageFlows(task);
                messageFlows.forEach((flow) => {
                    flow.source = endTask;
                });

                this.convertTask(endTask, process, false);
                this.convertFlow(link, process);
            }
        } else if (task instanceof BPMN.StartEvent)
            this.petrinet.addStartTransition(transition, process.id);
        else if (task instanceof BPMN.EndEvent)
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
        process.flows.forEach((flow) => {
            if (flow instanceof BPMN.SequenceFlow)
                if (flow.source.id === task.id) ret = flow;
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
        this.bpmn.messageFlows.forEach((flow) => {
            if (flow instanceof BPMN.MessageFlow)
                if (flow.source.id === task.id) ret.push(flow);
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
        if (gateway instanceof BPMN.InclusiveGateway)
            // Since inclusive gateway is a subclass of exclusive gateway, it must be checked first
            this.convertInclusiveGateway(gateway, process);
        else if (gateway instanceof BPMN.ExclusiveGateway)
            this.convertExclusiveGateway(gateway, process);
        else if (gateway instanceof BPMN.ParallelGateway)
            this.convertParallelGateway(gateway, process);
        else if (gateway instanceof BPMN.EventBasedGateway)
            this.convertEventBasedGateway(gateway, process);
        else if (gateway instanceof BPMN.ComplexGateway)
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

        if (gateway.outArcs.length > 1 && gateway.inArcs.length > 1) {
            this.convertMixedExclusiveGateway(gateway, process, coords);
        }

        // XOR split (1 in, >1 out)
        else if (gateway.outArcs.length > 1 && gateway.inArcs.length === 1) {
            let split = null;
            if (Config.withDecorators)
                split = new XORSplit(
                    gateway.id,
                    gateway.name,
                    coords.x,
                    coords.y,
                    this.petrinet,
                    process.id,
                    "decorated"
                );
            else
                split = new XORSplit(
                    gateway.id,
                    gateway.name,
                    coords.x,
                    coords.y,
                    this.petrinet,
                    process.id
                );

            if (!Config.withDecorators && !Config.withCollapsedXor) {
                let outArcs = gateway.outArcs;
                outArcs.forEach((arc) => {
                    let tCoords = Utils.calculateHalfwayCoords(
                        gateway,
                        arc.target,
                        0.3
                    );
                    let transition = new Transition(
                        arc.target.id + "_middle_split",
                        arc.target.name + " Choosing",
                        tCoords.x,
                        tCoords.y,
                        this.petrinet,
                        process.id
                    );
                    let pCoords = Utils.calculateHalfwayCoords(
                        gateway,
                        arc.target,
                        0.6
                    );
                    let place = new Place(
                        arc.target.id + "_end_split",
                        arc.target.name + " Chosen",
                        pCoords.x,
                        pCoords.y,
                        this.petrinet,
                        process.id
                    );

                    let arc1 = new Arc(
                        split.ref,
                        transition,
                        this.petrinet,
                        process.id
                    );
                    let arc2 = new Arc(
                        transition,
                        place,
                        this.petrinet,
                        process.id
                    );

                    const targetNode = this.petrinet.getNode(arc.target.id);
                    if (targetNode) {
                        let arc3 = new Arc(
                            place,
                            targetNode,
                            this.petrinet,
                            process.id
                        );
                    } else {
                        this.deferredGatewayLinks.push({
                            type: "split-out",
                            from: place,
                            targetId: arc.target.id,
                            processId: process.id,
                        });
                    }

                    process.flows = process.flows.filter(
                        (flow) => flow.id !== arc.id
                    );
                });
            }
        }

        // XOR join (>1 in, 1 out)
        else if (gateway.outArcs.length === 1 && gateway.inArcs.length > 1) {
            let join = null;
            if (Config.withDecorators)
                join = new XORJoin(
                    gateway.id,
                    gateway.name,
                    coords.x,
                    coords.y,
                    this.petrinet,
                    process.id,
                    "decorated"
                );
            else
                join = new XORJoin(
                    gateway.id,
                    gateway.name,
                    coords.x,
                    coords.y,
                    this.petrinet,
                    process.id
                );

            if (!Config.withDecorators && !Config.withCollapsedXor) {
                let inArcs = gateway.inArcs;
                inArcs.forEach((arc) => {
                    if (
                        !(
                            arc.source instanceof BPMN.ExclusiveGateway &&
                            arc.source.outArcs.length === 1 &&
                            arc.source.inArcs.length > 1
                        )
                    ) {
                        let pCoords = Utils.calculateHalfwayCoords(
                            arc.source,
                            gateway,
                            0.3
                        );
                        let place = new Place(
                            arc.source.id + "_middle_join",
                            arc.source.name + " Choosing",
                            pCoords.x,
                            pCoords.y,
                            this.petrinet,
                            process.id
                        );
                        let tCoords = Utils.calculateHalfwayCoords(
                            arc.source,
                            gateway,
                            0.6
                        );
                        let transition = new Transition(
                            arc.source.id + "_end_join",
                            arc.source.name + " Chosen",
                            tCoords.x,
                            tCoords.y,
                            this.petrinet,
                            process.id
                        );

                        let s = arc.source;
                        let sId = s.id;
                        if (
                            s instanceof BPMN.ExclusiveGateway &&
                            s.outArcs.length === 1 &&
                            s.inArcs.length > 1
                        )
                            sId += "_middle_join";

                        const srcNode = this.petrinet.getNode(sId);
                        if (srcNode) {
                            let arc1 = new Arc(
                                srcNode,
                                place,
                                this.petrinet,
                                process.id
                            );
                        } else {
                            this.deferredGatewayLinks.push({
                                type: "join-in",
                                sourceId: sId,
                                place: place,
                                processId: process.id,
                            });
                        }

                        let arc2 = new Arc(
                            place,
                            transition,
                            this.petrinet,
                            process.id
                        );
                        let arc3 = new Arc(
                            transition,
                            join.ref,
                            this.petrinet,
                            process.id
                        );

                        process.flows = process.flows.filter(
                            (flow) => flow.id !== arc.id
                        );
                    }
                });
            }
        }
    }

    /**
     * Converts a BPMN exclusive gateway that has multiple incoming
     * and multiple outgoing sequence flows.
     *
     * @private
     * @param {BPMN.ExclusiveGateway} gateway -
     *        The exclusive gateway with multiple incoming and multiple outgoing flows.
     *
     * @param {BPMN.Process} process -
     *        The BPMN process to which the gateway belongs.
     *
     * @param {Object} coords -
     *        The graphical coordinates of the original BPMN gateway,
     *        used to place the corresponding Petri net nodes.
     *
     * @returns {void}
     */
    convertMixedExclusiveGateway(gateway, process, coords) {
        const x = coords.x;
        const y = coords.y;

        // 1) Crea XOR join + XOR split
        let join, split;
        if (Config.withDecorators) {
            join = new XORJoin(
                gateway.id + "_j",
                gateway.name,
                x - 15,
                y,
                this.petrinet,
                process.id,
                "decorated"
            );
            split = new XORSplit(
                gateway.id + "_s",
                gateway.name,
                x + 15,
                y,
                this.petrinet,
                process.id,
                "decorated"
            );
        } else {
            join = new XORJoin(
                gateway.id + "_j",
                gateway.name,
                x - 15,
                y,
                this.petrinet,
                process.id
            );
            split = new XORSplit(
                gateway.id + "_s",
                gateway.name,
                x + 15,
                y,
                this.petrinet,
                process.id
            );
        }

        const inArcs = gateway.inArcs || [];
        const outArcs = gateway.outArcs || [];

        // 2) Incoming: sorgente → join (con eventuale transizione intermedia)
        inArcs.forEach((arc) => {
            const srcId = arc.source.id;
            const srcNode = this.petrinet.getNode(srcId);

            if (srcNode) {
                if (srcNode instanceof Transition) {
                    // caso normale: sorgente è una transizione (es. task)
                    new Arc(srcNode, join.ref, this.petrinet, process.id);
                } else {
                    // sorgente è un place (es. altro gateway) → place → transition → place
                    const tX = (srcNode.getX() + (x - 15)) / 2;
                    const tY = (srcNode.getY() + y) / 2;
                    const t = new Transition(
                        srcId + "_to_" + gateway.id,
                        "",
                        tX,
                        tY,
                        this.petrinet,
                        process.id
                    );
                    new Arc(srcNode, t, this.petrinet, process.id);
                    new Arc(t, join.ref, this.petrinet, process.id);
                }
            } else {
                // nodo non ancora creato → rimando
                this.deferredGatewayLinks.push({
                    type: "mixed-join-in",
                    sourceId: srcId,
                    target: join.ref,
                    processId: process.id,
                });
            }

            // questo flow non va più gestito in convertFlow
            process.flows = process.flows.filter((f) => f.id !== arc.id);
        });

        // 3) collegamento interno join → split tramite TRANSITION
        const midTransition = new Transition(
            gateway.id + "_mid",
            gateway.name + " mid",
            x,
            y,
            this.petrinet,
            process.id
        );
        new Arc(join.ref, midTransition, this.petrinet, process.id);
        new Arc(midTransition, split.ref, this.petrinet, process.id);

        // 4) Outgoing: split → target (con eventuale transizione intermedia)
        outArcs.forEach((arc) => {
            const tgtId = arc.target.id;
            const tgtNode = this.petrinet.getNode(tgtId);

            if (tgtNode) {
                if (tgtNode instanceof Transition) {
                    // caso normale: target è una transizione (es. task)
                    new Arc(split.ref, tgtNode, this.petrinet, process.id);
                } else {
                    // target è un place (es. altro gateway / end place) → place → transition → place
                    const tX = (x + 15 + tgtNode.getX()) / 2;
                    const tY = (y + tgtNode.getY()) / 2;
                    const t = new Transition(
                        gateway.id + "_to_" + tgtId,
                        "",
                        tX,
                        tY,
                        this.petrinet,
                        process.id
                    );
                    new Arc(split.ref, t, this.petrinet, process.id);
                    new Arc(t, tgtNode, this.petrinet, process.id);
                }
            } else {
                this.deferredGatewayLinks.push({
                    type: "mixed-split-out",
                    from: split.ref,
                    targetId: tgtId,
                    processId: process.id,
                });
            }

            process.flows = process.flows.filter((f) => f.id !== arc.id);
        });
    }

    /**
     * Divides a XOR split transition into multiple transitions.
     *
     * @param {XORSplit} transition - The XOR split transition to be divided.
     */
    divideXORSplit(transition) {
        let inArc = transition.inArcs[0];
        let outArcs = transition.outArcs;
        if (outArcs.length > 1) {
            for (let i = 0; i < outArcs.length; i++) {
                let arc = outArcs[i];
                let newTransition = new XORSplit(
                    transition.id + "_op_" + (i + 1),
                    transition.name,
                    transition.getUnscaledX(),
                    transition.getUnscaledY(),
                    this.petrinet,
                    transition.process,
                    "decorated"
                );
                let newInArc = new Arc(
                    inArc.source,
                    newTransition,
                    this.petrinet,
                    transition.process
                );
                let newOutArc = new Arc(
                    newTransition,
                    arc.target,
                    this.petrinet,
                    transition.process
                );
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
        if (inArcs.length > 1) {
            for (let i = 0; i < inArcs.length; i++) {
                let arc = inArcs[i];
                let newTransition = new XORJoin(
                    transition.id + "_op_" + (i + 1),
                    transition.name,
                    transition.getUnscaledX(),
                    transition.getUnscaledY(),
                    this.petrinet,
                    transition.process,
                    "decorated"
                );
                let newOutArc = new Arc(
                    newTransition,
                    outArc.target,
                    this.petrinet,
                    transition.process
                );
                let newInArc = new Arc(
                    arc.source,
                    newTransition,
                    this.petrinet,
                    transition.process
                );
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
        if (gateway.outArcs.length > 1 && gateway.inArcs.length > 1) {
            console.log(
                "Error: Parallel Gateway with multiple incoming and outgoing flows"
            );
        } else if (gateway.outArcs.length > 1 && gateway.inArcs.length === 1) {
            let join = new ANDSplit(
                gateway.id,
                gateway.name,
                coords.x,
                coords.y,
                this.petrinet,
                process.id
            );
        } else if (gateway.outArcs.length === 1 && gateway.inArcs.length > 1) {
            let split = new ANDJoin(
                gateway.id,
                gateway.name,
                coords.x,
                coords.y,
                this.petrinet,
                process.id
            );
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
        if (gateway.outArcs.length > 1 && gateway.inArcs.length > 1)
            console.log(
                "Error: Exclusive Gateway with multiple incoming and outgoing flows"
            );
        else if (gateway.outArcs.length > 1 && gateway.inArcs.length === 1) {
            let split = new Place(
                gateway.id,
                gateway.name,
                coords.x,
                coords.y,
                this.petrinet,
                process.id
            );
            let outArcs = gateway.outArcs;
            let places = [];
            outArcs.forEach((arc) => {
                let tCoords = Utils.calculateHalfwayCoords(
                    gateway,
                    arc.target,
                    0.3
                );
                let transition = new Transition(
                    arc.target.id + "_middle_split",
                    "Choosing " + arc.target.name,
                    tCoords.x,
                    tCoords.y,
                    this.petrinet,
                    process.id
                );
                let pCoords = Utils.calculateHalfwayCoords(
                    gateway,
                    arc.target,
                    0.6
                );
                let place = new Place(
                    arc.target.id + "_end_split",
                    arc.target.name + " Chosen",
                    pCoords.x,
                    pCoords.y,
                    this.petrinet,
                    process.id
                );
                places.push(place);
                let arc1 = new Arc(
                    split,
                    transition,
                    this.petrinet,
                    process.id
                );
                let arc2 = new Arc(
                    transition,
                    place,
                    this.petrinet,
                    process.id
                );
                let arc3 = new Arc(
                    place,
                    this.petrinet.getNode(arc.target.id),
                    this.petrinet,
                    process.id
                );
                process.flows = process.flows.filter(
                    (flow) => flow.id !== arc.id
                );
            });
            let powerSet = Utils.powerSet(places);
            let i = 1;
            powerSet.forEach((subset) => {
                if (subset.length > 1) {
                    let startX = 0;
                    let startY = 0;
                    let startName = "Choosing ";
                    subset.forEach((place) => {
                        startX += place.getX();
                        startY += place.getY();
                        startName += place.name.replaceAll("Chosen", "");
                    });
                    startX /= subset.length;
                    startY /= subset.length;
                    let andSplit = new Transition(
                        gateway.id + "_s" + i,
                        startName,
                        0,
                        0,
                        this.petrinet,
                        process.id
                    );
                    andSplit.setUnscaledX(startX);
                    andSplit.setUnscaledY(startY);
                    let arc = new Arc(
                        split,
                        andSplit,
                        this.petrinet,
                        process.id
                    );
                    subset.forEach((place) => {
                        let newArc = new Arc(
                            andSplit,
                            place,
                            this.petrinet,
                            process.id
                        );
                    });
                }
                i++;
            });
        } else if (gateway.outArcs.length === 1 && gateway.inArcs.length > 1) {
            let join = new Place(
                gateway.id,
                gateway.name,
                coords.x,
                coords.y,
                this.petrinet,
                process.id
            );
            let inArcs = gateway.inArcs;
            let places = [];
            inArcs.forEach((arc) => {
                let pCoords = Utils.calculateHalfwayCoords(
                    arc.source,
                    gateway,
                    0.3
                );
                let place = new Place(
                    arc.source.id + "_middle_join",
                    arc.source.name + " Choosing",
                    pCoords.x,
                    pCoords.y,
                    this.petrinet,
                    process.id
                );
                let tCoords = Utils.calculateHalfwayCoords(
                    arc.source,
                    gateway,
                    0.6
                );
                let transition = new Transition(
                    arc.source.id + "_end_join",
                    arc.source.name + " Chosen",
                    tCoords.x,
                    tCoords.y,
                    this.petrinet,
                    process.id
                );
                places.push(place);
                let arc1 = new Arc(
                    this.petrinet.getNode(arc.source.id),
                    place,
                    this.petrinet,
                    process.id
                );
                let arc2 = new Arc(
                    place,
                    transition,
                    this.petrinet,
                    process.id
                );
                let arc3 = new Arc(transition, join, this.petrinet, process.id);
                process.flows = process.flows.filter(
                    (flow) => flow.id !== arc.id
                );
            });
            let powerSet = Utils.powerSet(places);
            let i = 1;
            powerSet.forEach((subset) => {
                if (subset.length > 1) {
                    let endX = 0;
                    let endY = 0;
                    let endName = "Choosing ";
                    subset.forEach((place) => {
                        endX += place.getX();
                        endY += place.getY();
                        endName += place.name.replaceAll("Chosen", "");
                    });
                    endX /= subset.length;
                    endY /= subset.length;
                    let andJoin = new Transition(
                        gateway.id + "_j" + i,
                        endName,
                        0,
                        0,
                        this.petrinet,
                        process.id
                    );
                    andJoin.setUnscaledX(endX);
                    andJoin.setUnscaledY(endY);
                    let arc = new Arc(andJoin, join, this.petrinet, process.id);
                    subset.forEach((place) => {
                        let newArc = new Arc(
                            place,
                            andJoin,
                            this.petrinet,
                            process.id
                        );
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
        if (gateway.inArcs.length > 1)
            console.log(
                "Error: Event Based Gateway with multiple incoming flows"
            );
        else if (gateway.outArcs.length > 1 && gateway.inArcs.length === 1) {
            let place = new Place(
                gateway.id,
                gateway.name,
                coords.x,
                coords.y,
                this.petrinet,
                process.id
            );
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
        if (process == null) process = { id: null };

        if (source instanceof Transition && target instanceof Transition) {
            let halfCoords = Utils.calculateHalfwayCoords(
                flow.source,
                flow.target
            );
            if (flow.layout.length > 2) halfCoords = flow.layout[1];
            let place = new Place(
                flow.id,
                flow.name,
                halfCoords.x,
                halfCoords.y,
                this.petrinet,
                process.id
            );
            let arc = new Arc(source, place, this.petrinet, process.id);
            let endArc = new Arc(place, target, this.petrinet, process.id);
            if (flow.layout.length > 2)
                flow.layout.forEach((waypoint, index) => {
                    if (index >= 2 && index !== flow.layout.length - 1)
                        endArc.addWaypoint(waypoint.x, waypoint.y);
                });
        } else if (source instanceof Place && target instanceof Place) {
            let halfCoords = Utils.calculateHalfwayCoords(
                flow.source,
                flow.target
            );
            if (flow.layout.length > 2) halfCoords = flow.layout[1];
            let transition = new Transition(
                flow.id,
                flow.name,
                halfCoords.x,
                halfCoords.y,
                this.petrinet,
                process.id
            );
            let arc = new Arc(source, transition, this.petrinet, process.id);
            let endArc = new Arc(transition, target, this.petrinet, process.id);
            if (flow.layout.length > 2)
                flow.layout.forEach((waypoint, index) => {
                    if (index >= 2 && index !== flow.layout.length - 1)
                        endArc.addWaypoint(waypoint.x, waypoint.y);
                });
        } else {
            let arc = new Arc(source, target, this.petrinet, process.id);
            if (flow.layout.length > 2)
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
        for (let process in this.petrinet.startTransitions) {
            const processId = process;
            let transitions = this.petrinet.startTransitions[processId];
            if (transitions.length >= 1) {
                let start = new Place(
                    "start_p_" + processId,
                    "Start",
                    0,
                    0,
                    this.petrinet,
                    processId
                );
                let startX = Number.MAX_SAFE_INTEGER;
                let startY = 0;
                transitions.forEach((transition) => {
                    startX = Math.min(startX, transition.getX());
                    startY += transition.getY();
                });
                startY /= transitions.length;
                start.setUnscaledX(startX - 100);
                start.setUnscaledY(startY);
                transitions.forEach((transition) => {
                    let arc = new Arc(
                        start,
                        transition,
                        this.petrinet,
                        processId
                    );
                });
                this.petrinet.addStartPlace(start);
            }
        }
        for (let process in this.petrinet.endTransitions) {
            const processId = process;
            let transitions = this.petrinet.endTransitions[processId];
            if (transitions.length >= 1) {
                let end = new Place(
                    "end_p_" + processId,
                    "End",
                    0,
                    0,
                    this.petrinet,
                    processId
                );
                let endX = Number.MIN_SAFE_INTEGER;
                let endY = 0;
                transitions.forEach((transition) => {
                    endX = Math.max(endX, transition.getX());
                    endY += transition.getY();
                });
                endY /= transitions.length;
                end.setUnscaledX(endX + 100);
                end.setUnscaledY(endY);
                transitions.forEach((transition) => {
                    let arc = new Arc(
                        transition,
                        end,
                        this.petrinet,
                        processId
                    );
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
        if (places.length > 1) {
            let start = new Transition("start_t", "Start", 0, 0, this.petrinet);
            let startX = Number.MAX_SAFE_INTEGER;
            this.petrinet.places.forEach((place) => {
                startX = Math.min(startX, place.getX());
            });
            let startY = 0;
            places.forEach((place) => {
                startY += place.getY();
            });
            startY /= places.length;
            start.setUnscaledX(startX - 100);
            start.setUnscaledY(startY);
            places.forEach((place) => {
                let arc = new Arc(start, place, this.petrinet);
            });
            let startPlace = new Place("start_p", "Start", 0, 0, this.petrinet);
            startPlace.setUnscaledX(Math.max(0, startX - 200));
            startPlace.setUnscaledY(startY);
            let arc = new Arc(startPlace, start, this.petrinet);
        }

        places = this.petrinet.endPlaces;
        if (places.length > 1) {
            let end = new Transition("end_t", "End", 0, 0, this.petrinet);
            let endX = Number.MIN_SAFE_INTEGER;
            this.petrinet.places.forEach((place) => {
                endX = Math.max(endX, place.getX());
            });
            let endY = 0;
            places.forEach((place) => {
                endY += place.getY();
            });
            endY /= places.length;
            end.setUnscaledX(endX + 100);
            end.setUnscaledY(endY);
            places.forEach((place) => {
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
        places.forEach((place) => {
            if (place.inArcs.length === 0) place.addTokens(1);
        });
    }
}

export default Converter;
