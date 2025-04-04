/**
 * Configuration class for the BPMN to Petri net conversion.
 * 
 * This class contains the configuration for the conversion of a BPMN diagram to a Petri net.
 * The configuration can be changed to change the output of the conversion.
 * 
 * The configuration options are:
 * - displayScale: The scale of the displayed Petri net.
 * - nodeSize: The size of the nodes in the Petri net.
 * - withDecorators: Whether or not to include decorators in the Petri net.
 * - withCollapsedXor: Whether or not to collapse XOR gateways in the Petri net.
 * - scale: The scale of the Petri net.
 * - timedTasks: Whether or not to make tasks in the Petri net timed.
 * - graphvizTextOutside: Whether or not to place the text of the nodes outside of the node.
 * 
 * @class Config
 */
class Config {
    static displayScale = 1.3;
    static nodeSize = 40;
    static withDecorators = false;
    static withCollapsedXor = false;
    static scale = 1.5;
    static timedTasks = false;
    static graphvizTextOutside = true;
}

export default Config;