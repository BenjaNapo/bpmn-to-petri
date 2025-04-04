import Utils from "./utils.js";
import Config from "./config.js";

export class PetriNet {
  constructor() {
    this.places = new Map();
    this.transitions = new Map();
    this.arcs = new Map();
    this.displayScale = Config.displayScale;
	this.withDecorators = Config.withDecorators;
    
    this.startTransitions = {};
    this.endTransitions = {};

    this.startPlaces = [];
    this.endPlaces = [];

    this.processes = {};
  }

	/**
	 * Adds a place to the Petri net if it does not already exist.
	 * 
	 * @param {Place} place - The place to be added.
	 */
	addPlace(place) {
		if(!this.places.has(place.id))
			this.places.set(place.id, place);
	}

	/**
	 * Creates and adds a new place to the Petri net.
	 * 
	 * @param {string} id - The unique identifier of the place.
	 * @param {string} name - The name of the place.
	 * @param {number} x - The x-coordinate of the place.
	 * @param {number} y - The y-coordinate of the place.
	 * @param {PetriNet} petri - The Petri net instance.
	 * @param {number} [tokens=0] - The number of tokens in the place.
	 * @returns {Place} - The newly created or existing place.
	 */
	addNewPlace(id, name, x, y, petri, tokens = 0) {
		if(this.places.has(id))
			return this.places.get(id);
		let place = new Place(id, name, x, y, petri, tokens);
		this.addPlace(place);
		return place;
	}

	/**
	 * Adds a transition to the Petri net if it does not already exist.
	 * 
	 * @param {Transition} transition - The transition to be added.
	 */
	addTransition(transition) {
		if(!this.transitions.has(transition.id))
			this.transitions.set(transition.id, transition);
	}

	/**
	 * Creates and adds a new transition to the Petri net.
	 * 
	 * @param {string} id - The unique identifier of the transition.
	 * @param {string} name - The name of the transition.
	 * @param {number} x - The x-coordinate of the transition.
	 * @param {number} y - The y-coordinate of the transition.
	 * @param {PetriNet} petri - The Petri net instance.
	 * @returns {Transition} - The newly created or existing transition.
	 */
	addNewTransition(id, name, x, y, petri) {
		if(this.transitions.has(id))
			return this.transitions.get(id);
		let transition = new Transition(id, name, x, y, petri);
		this.addTransition(transition);
		return transition;
	}

	/**
	 * Adds an arc to the Petri net if it does not already exist, 
	 * and updates the source and target nodes.
	 * 
	 * @param {Arc} arc - The arc to be added.
	 */
	addArc(arc) {
		if(!this.arcs.has(arc.id)) {
			this.arcs.set(arc.id, arc);
			arc.source.addOutArc(arc);
			arc.target.addInArc(arc);
		}
	}
	
	/**
	 * Creates and adds a new arc to the Petri net.
	 * 
	 * @param {Node} source - The source node of the arc.
	 * @param {Node} target - The target node of the arc.
	 * @returns {Arc} - The newly created or existing arc.
	 */
	addNewArc(source, target) {
		let arc = new Arc(source, target);
		if(this.arcs.has(arc.id))
			return this.arcs.get(arc.id);
		return this.addArc(arc);
	}

	/**
	 * Retrieves a place by its ID.
	 * 
	 * @param {string} id - The unique identifier of the place.
	 * @param {string} [prefix=""] - An optional prefix for the ID.
	 * @returns {Place|undefined} - The place if found, otherwise undefined.
	 */
	getPlace(id, prefix = "") {
		return this.places.get(prefix + id);
	}

	/**
	 * Retrieves a transition by its ID.
	 * 
	 * @param {string} id - The unique identifier of the transition.
	 * @param {string} [prefix=""] - An optional prefix for the ID.
	 * @returns {Transition|undefined} - The transition if found, otherwise undefined.
	 */
	getTransition(id, prefix = "") {
		return this.transitions.get(prefix + id);
	}

	/**
	 * Retrieves a node (place or transition) by its ID.
	 * 
	 * @param {string} id - The unique identifier of the node.
	 * @param {string} [prefix=""] - An optional prefix for the ID.
	 * @returns {Node|undefined} - The node if found, otherwise undefined.
 	*/
	getNode(id, prefix = "") {
		return this.getPlace(id, prefix) || this.getTransition(id, prefix);
	}

	/**
	 * Adds a transition to the list of start transitions for a given process.
	 * 
	 * @param {Transition} transition - The transition to be added.
	 * @param {string} process - The process identifier.
	 */
	addStartTransition(transition, process) {
		if(!this.startTransitions[process])
			this.startTransitions[process] = [];
		this.startTransitions[process].push(transition);
	}

	/**
	 * Adds a transition to the list of end transitions for a given process.
	 * 
	 * @param {Transition} transition - The transition to be added.
	 * @param {string} process - The process identifier.
	 */
	addEndTransition(transition, process) {
		if(!this.endTransitions[process])
			this.endTransitions[process] = [];
		this.endTransitions[process].push(transition);
	}

	/**
	 * Adds a place to the list of start places.
	 * 
	 * @param {Place} place - The place to be added.
	 */
	addStartPlace(place) {
    	this.startPlaces.push(place);
	}

	/**
	 * Adds a place to the list of end places.
	 * 
	 * @param {Place} place - The place to be added.
	 */
	addEndPlace(place) {
    	this.endPlaces.push(place);
	}

	/**
	 * Associates an element with a specific process.
	 * 
	 * @param {Node} element - The element (place or transition) to be added.
	 * @param {string} process - The process identifier.
 	*/
	addToProcess(element, process) {
		if(!this.processes[process])
			this.processes[process] = [];
		this.processes[process].push(element);
	}

	/**
	 * Removes a transition from the Petri net.
	 * 
	 * @param {Transition} transition - The transition to be removed.
	 */
	removeTransition(transition) {
		this.transitions.delete(transition.id);
	}

	/**
	 * Removes an arc from the Petri net.
	 * 
	 * @param {Arc} arc - The arc to be removed.
	 */
	removeArc(arc) {
		this.arcs.delete(arc.id);
	}

	/**
	 * Finds and returns an arc by its ID.
	 * 
	 * @param {string} id - The unique identifier of the arc.
	 * @returns {Arc|undefined} - The arc if found, otherwise undefined.
	 */
	findArc(id) {
		return this.arcs.get(id);
	}

	/**
	 * Fires a transition if it is enabled.
	 * 
	 * @param {Transition} transition - The transition to be fired.
	 */
	fire(transition) {
		if (transition.canFire())
			transition.fire();
	}

	/**
	 * Retrieves the display scale of the Petri net.
	 * 
	 * @returns {number} - The current display scale.
	 */
	getDisplayScale() {
		return this.displayScale;
	}

	/**
	 * Scales a given value based on the display scale.
	 * 
	 * @param {number} x - The value to be scaled.
	 * @returns {number} - The scaled value.
	 */
	scale(x) {
		return x * this.displayScale;
	}

	/**
	 * Returns a string representation of the Petri net, listing all places, transitions, and arcs.
	 * 
	 * @returns {string} - The string representation of the Petri net.
	 */
	toString() {
		let str = "Places:\n";
		this.places.forEach(place => {
			str += place.toString() + "\n";
		});

		str += "\nTransitions:\n";
		this.transitions.forEach(transition => {
			str += transition.toString() + "\n";
		});

		str += "\nArcs:\n";
		this.arcs.forEach(arc => {
			str += arc.toString() + "\n";
		});

		return str;
	}

	/**
	 * Draws the Petri net on a given container at a specified scale.
	 * 
	 * @param {HTMLElement} container - The container where the Petri net should be drawn.
	 * @param {number} [scale=1] - The scale factor for drawing.
	 */
	draw(container, scale = 1, nodeSize = 50) {
		this.places.forEach(place => {
			place.draw(container, scale, nodeSize);
		});
		this.transitions.forEach(transition => {
			transition.draw(container, scale, nodeSize);
		});
		this.arcs.forEach(arc => {
			arc.draw(container, scale, nodeSize);
		});
	}
}

/**
 * Represents a node in the Petri net, which can be a place or a transition.
 * 
 * @class Node
 * @param {string} id - The unique identifier of the node.
 * @param {string} name - The name of the node.
 * @param {number} x - The x-coordinate of the node.
 * @param {number} y - The y-coordinate of the node.
 * @param {PetriNet} petri - The Petri net instance.
 * @param {string} [process=null] - The process identifier.
 * @property {string} id - The unique identifier of the node.
 * @property {string} name - The name of the node.
 * @property {Array<Arc>} inArcs - The incoming arcs of the node.
 * @property {Array<Arc>} outArcs - The outgoing arcs of the node.
 * @property {PetriNet} petri - The Petri net instance.
 * @property {number} x - The scaled x-coordinate of the node.
 * @property {number} y - The scaled y-coordinate of the node.
 * @property {number} unscaledX - The unscaled x-coordinate of the node.
 * @property {number} unscaledY - The unscaled y-coordinate of the node.
 * @property {string} process - The process identifier.
 */
export class Node {
    constructor(id, name, x = 0, y = 0, petri = null, process = null) {
		this.id = id;
		this.name = name;
		this.inArcs = [];
		this.outArcs = [];
		this.petri = petri;
		this.unscaledX = x;
		this.unscaledY = y;
		this.x = this.petri ? x * this.petri.getDisplayScale() : x;
		this.y = this.petri ? y * this.petri.getDisplayScale() : y;
		this.process = process;
		if(this.process)
			this.petri.addToProcess(this, this.process);
    }

	/**
	 * Adds an incoming arc to the node.
	 * 
	 * @param {Arc} arc - The incoming arc to be added.
	 */
    addInArc(arc) {
        this.inArcs.push(arc);
    }

	/**
	 * Adds an outgoing arc to the node.
	 * 
	 * @param {Arc} arc - The outgoing arc to be added.
	 */
    addOutArc(arc) {
        this.outArcs.push(arc);
    }

	/**
	 * Gets the scaled x-coordinate of the node.
	 * 
	 * @returns {number} - The x-coordinate of the node.
	 */
    getX() {
        return this.x;
    }

	/**
	 * Gets the scaled y-coordinate of the node.
	 * 
	 * @returns {number} - The y-coordinate of the node.
	 */
	getY() {
		return this.y;
	}

	/**
	 * Gets the unscaled x-coordinate of the node.
	 * 
	 * @returns {number} - The unscaled x-coordinate.
	 */
	getUnscaledX() {
		return this.unscaledX;
	}

	/**
	 * Gets the unscaled y-coordinate of the node.
	 * 
	 * @returns {number} - The unscaled y-coordinate.
	 */
	getUnscaledY() {
		return this.unscaledY;
	}

  	/**
	 * Sets the scaled x-coordinate of the node.
	 * 
	 * @param {number} x - The new x-coordinate.
	 */
	setX(x) {
		this.x = this.petri ? x * this.petri.getDisplayScale() : x;
	}

	/**
	 * Sets the scaled y-coordinate of the node.
	 * 
	 * @param {number} y - The new y-coordinate.
	 */
	setY(y) {
		this.y = this.petri ? y * this.petri.getDisplayScale() : y;
	}

	/**
	 * Sets the unscaled x-coordinate of the node.
	 * 
	 * @param {number} x - The new unscaled x-coordinate.
	 */
	setUnscaledX(x) {
		this.x = x;
	}

	/**
	 * Sets the unscaled y-coordinate of the node.
	 * 
	 * @param {number} y - The new unscaled y-coordinate.
	 */
	setUnscaledY(y) {
		this.y = y;
	}

	/**
	 * Draws the node in the given container.
	 * 
	 * @param {HTMLElement} container - The container where the node should be drawn.
	 * @param {string} type - The type of node (e.g., place or transition).
	 * @param {number} scale - The scaling factor for positioning.
	 * @param {number} [size=50] - The size of the node.
	 * @returns {HTMLElement} - The created node element.
	 */
	draw(container, type, scale, size = 50) {
		let div = document.createElement("div");
		div.className = "node " + type;
		div.style.left = this.getX() * scale + "px";
		div.style.top = this.getY() * scale + "px";
		div.style.width = size + "px";
		div.style.height = size + "px";
		this.drawName(div);
		container.appendChild(div);
    	return div;
	}

	/**
	 * Draws the name of the node inside the given container.
	 * 
	 * @param {HTMLElement} container - The container where the name should be drawn.
	 */
	drawName(container) {
		let div = document.createElement("div");
		div.className = "name";
		div.innerHTML = this.name;
		container.appendChild(div);
	}
}

/**
 * Represents a place in the Petri net.
 * 
 * @class Place
 * @extends Node
 * @param {string} id - The unique identifier of the place.
 * @param {string} name - The name of the place.
 * @param {number} [x=0] - The x-coordinate of the place.
 * @param {number} [y=0] - The y-coordinate of the place.
 * @param {PetriNet} petri - The Petri net instance.
 * @param {string} [process=null] - The process identifier.
 * @property {number} tokens - The number of tokens in the place.
 */
export class Place extends Node {
    constructor(id, name, x = 0, y = 0, petri = null, process = null) {
        super(id, name, x, y, petri, process);
        this.tokens = 0;

		if(petri)
			petri.addPlace(this);
    }
    
	/**
	 * Adds a specified number of tokens to the place.
	 * 
	 * @param {number} tokens - The number of tokens to add.
	 */
    addTokens(tokens) {
        this.tokens += tokens;
    }
    
	/**
	 * Removes a specified number of tokens from the place.
	 * 
	 * @param {number} tokens - The number of tokens to remove.
	 */
    removeTokens(tokens) {
        this.tokens -= tokens;
    }

	/**
	 * Draws the place in the given container.
	 * 
	 * @param {HTMLElement} container - The container where the place should be drawn.
	 * @param {number} scale - The scaling factor for positioning.
	 * @param {number} [size=50] - The size of the place.
	 */
	draw(container, scale, size = 50) {
		let newEl = super.draw(container, "place", scale, size);
    	this.drawTokens(newEl, scale, size);
	}
  
	/**
	 * Draws the tokens inside the place.
	 * 
	 * @param {HTMLElement} container - The container where the tokens should be drawn.
	 * @param {number} scale - The scaling factor for positioning.
	 * @param {number} size - The size of the place.
	 */
	drawTokens(container, scale, size) {
		if(this.tokens > 1) {
			let div = document.createElement("div");
			div.className = "tokens";
			div.innerHTML = this.tokens;
			container.appendChild(div);
		} else if(this.tokens === 1) {
			let div = document.createElement("div");
			div.className = "token";
			container.appendChild(div);
		}
	}
	
	/**
	 * Returns a string representation of the place.
	 * 
	 * @returns {string} - The string representation in the format "name@id (tokens)".
	 */
    toString() {
        return `${this.name}@${this.id} (${this.tokens})`;
    }
}

/**
 * Represents a transition in the Petri net.
 * 
 * @class Transition
 * @extends Node
 */
export class Transition extends Node {
    constructor(id, name, x = 0, y = 0, petri = null, process = null) {
        super(id, name, x, y, petri, process);

		if(petri)
			petri.addTransition(this);
    }
    
	/**
	 * Checks if the transition can fire.
	 * 
	 * @returns {boolean} - Returns true if the transition can fire, false otherwise.
	 */
    canFire() {
        for (let i = 0; i < this.inArcs.length; i++) {
            if (this.inArcs[i].source.tokens == 0) {
                return false;
            }
        }
        return true;
    }
    
	/**
	 * Fires the transition, consuming tokens from input places and producing tokens in output places.
	 */
    fire() {
        for (let i = 0; i < this.inArcs.length; i++)
            this.inArcs[i].source.removeTokens(1);
        for (let i = 0; i < this.outArcs.length; i++)
            this.outArcs[i].target.addTokens(1);
    }

	/**
	 * Returns a string representation of the transition.
	 * 
	 * @returns {string} - The string representation in the format "name@id".
	 */
    toString() {
        return `${this.name}@${this.id}`;
    }

	/**
	 * Draws the transition in the given container.
	 * 
	 * @param {HTMLElement} container - The container where the transition should be drawn.
	 * @param {number} scale - The scaling factor for positioning.
	 * @param {number} [size=50] - The size of the transition.
	 * @returns {HTMLElement} - The created transition element.
	 */
	draw(container, scale, size = 50) {
		return super.draw(container, "transition", scale, size);
	}
  
	/**
	 * Draws a decoration (arrow) for the transition.
	 * 
	 * @param {HTMLElement} container - The container where the decoration should be drawn.
	 * @param {string} arrowPosition - The position of the arrow ("left" or "right").
	 * @param {string} arrowDirection - The direction of the arrow ("left" or "right").
	 */
	drawDecoration(container, arrowPosition, arrowDirection, size = 50) {
		let div = document.createElement("div");
		div.className = `decoration position-${arrowPosition} direction-${arrowDirection}`;
		div.style.setProperty("--node-size", size + "px");
		container.appendChild(div);
	}
}

/**
 * Represents an AND-split transition in the Petri net.
 * 
 * @class ANDSplit
 * @extends Transition
 */
export class ANDSplit extends Transition {
  draw(container, scale, size = 50) {
    let div = super.draw(container, scale, size);
	if(this.petri.withDecorators)
    	super.drawDecoration(div, "right", "left", size);
  }
}

/**
 * Represents an AND-join transition in the Petri net.
 * 
 * @class ANDJoin
 * @extends Transition
 */
export class ANDJoin extends Transition {
  draw(container, scale, size = 50) {
    let div = super.draw(container, scale, size);
	if(this.petri.withDecorators)
    	super.drawDecoration(div, "left", "right", size);
  }
}

/**
 * Represents an XOR-split transition in the Petri net.
 * 
 * @class XORSplit
 * @extends Transition
 * @param {string} type - The type of XOR-split transition (collapsed, expanded, or decorated).
 * @property {string} type - The type of XOR-split transition.
 * @property {Place|Transition} ref - The reference to the place or to itself.
 */
export class XORSplit extends Node {
    constructor(id, name, x = 0, y = 0, petri = null, process = null, type = "collapsed") {
        super(id, name, x, y, petri, process);
        this.type = type;
        if(this.type === "decorated")
			this.ref = new Transition(id, name, x, y, petri, process);
        else
          	this.ref = new Place(id, name, x, y, petri, process);
    }

    draw(container, scale, size = 50) {
		if(this.type === "decorated" && this.petri.withDecorators) {
			let div = super.draw(container, scale, size);
			super.drawDecoration(div, "right", "right", size);
		} else
			this.ref.draw(container, scale, size);
    }
}
/**
 * Represents an XOR-join transition in the Petri net.
 * 
 * @class XORJoin
 * @extends Transition
 * @param {string} type - The type of XOR-join transition (collapsed, expanded, or decorated).
 * @property {string} type - The type of XOR-join transition.
 * @property {Place|Transition} ref - The reference to the place or to itself.
 */
export class XORJoin extends Node {
    constructor(id, name, x = 0, y = 0, petri = null, process = null, type = "collapsed") {
		super(id, name, x, y, petri, process);
		this.type = type;
		if(this.type === "decorated")
			this.ref = new Transition(id, name, x, y, petri, process);
		else
			this.ref = new Place(id, name, x, y, petri, process);
    }

    draw(container, scale, size = 50) {
		if(this.type === "decorated") {
			let div = super.draw(container, scale, size);
			super.drawDecoration(div, "left", "left", size);
		} else
			this.ref.draw(container, scale, size);
    }
}

/**
 * Represents an Arc in the Petri net.
 * 
 * @class Arc
 * @param {Node} source - The source node of the arc.
 * @param {Node} target - The target node of the arc.
 * @param {PetriNet} petri - The Petri net instance.
 * @param {string} process - The process identifier.
 * @property {Node} source - The source node of the arc.
 * @property {Node} target - The target node of the arc.
 * @property {PetriNet} petri - The Petri net instance.
 * @property {string} id - The unique identifier of the arc.
 * @property {Array<Object>} waypoints - The waypoints of the arc.
 * @property {string} process - The process identifier.
 */
export class Arc {
    constructor(source, target, petri = null, process = null) {
        this.source = source;
        this.target = target;
        this.petri = petri;
        this.id = this.computeId(source, target);
        this.waypoints = [];
		if(petri)
			petri.addArc(this);
		this.process = process;
		if(this.process)
			this.petri.addToProcess(this, this.process);
    }

	/**
	 * Computes the unique identifier of the arc based on the source and target nodes.
	 * 
	 * @param {Node} source - The source node of the arc.
	 * @param {Node} target - The target node of the arc.
	 * @returns {string} - The unique identifier of the arc.
	 */
    computeId(source, target) {
        return source.id + target.id;
    }

	/**
	 * Adds a waypoint to the arc.
	 * 
	 * @param {number} x - The x-coordinate of the waypoint.
	 * @param {number} y - The y-coordinate of the waypoint.
	 */
	addWaypoint(x, y) {
        x = this.petri ? x * this.petri.getDisplayScale() : x;
		y = this.petri ? y * this.petri.getDisplayScale() : y;
		this.waypoints.push({x: x, y: y});
	}

	/**
	 * Draws the arc in the given container.
	 * 
	 * @param {HTMLElement} container - The container where the arc should be drawn.
	 * @param {number} scale - The scaling factor for positioning.
	 * @param {number} [size=50] - The size of the arc.
	 */
	draw(container, scale, size = 50) {
		let s = {x: this.source.getX(), y: this.source.getY()};
		this.waypoints.forEach(waypoint => {
			let t = waypoint;
			this.drawArc(s, t, container, scale, size);
			s = t;
		});
		this.drawArc(s, {x: this.target.getX(), y: this.target.getY()}, container, scale, size, true);
	}

	/**
	 * Draws an arc between two points in the given container.
	 * 
	 * @param {Object} source - The source point of the arc.
	 * @param {Object} target - The target point of the arc.
	 * @param {HTMLElement} container - The container where the arc should be drawn.
	 * @param {number} scale - The scaling factor for positioning.
	 * @param {number} [size=50] - The size of the arc.
	 * @param {boolean} [arrow=false] - Indicates whether an arrow should be drawn.
	 */
	drawArc(source, target, container, scale, size = 50, arrow = false) {
		let div = document.createElement("div");
		div.className = "arc";
		let width = Math.sqrt(Math.pow(target.y * scale - source.y * scale, 2) + Math.pow(target.x * scale - source.x  * scale, 2));
		div.style.width = width + "px";
		div.style.left = (source.x * scale + size/2) + "px";
		div.style.top = (source.y * scale + size/2) + "px";
		div.style.transformOrigin = "0 50%";
		div.style.transform = "rotate(" + Math.atan2(target.y - source.y, target.x - source.x) + "rad)";

		if(arrow) {
			let triangle = document.createElement("div");
			triangle.className = "triangle";
			triangle.style.left = (width - size/2 - 10) + "px";
			triangle.style.top = "-4px";
			div.appendChild(triangle);
		}
		container.appendChild(div);
	}
	
	/**
	 * Returns a string representation of the arc.
	 * 
	 * @returns {string} - The string representation in the format "source -> target".
	 */
    toString() {
        return this.source.toString() + " -> " + this.target.toString();
    }
}