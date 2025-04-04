/**
 * Utility functions for BPMN to Petri net conversion.
 */
class Utils {
    static getBPMNNodeCoordinates(node) {
        return {x: node.getX() + node.getWidth() / 2, y: node.getY() + node.getHeight() / 2};
    }

    static calculateHalfwayCoords(node1, node2, ratio = 0.5) {
        let coords1 = this.getBPMNNodeCoordinates(node1);
        let coords2 = this.getBPMNNodeCoordinates(node2);
        return {
            x: coords1.x + (coords2.x - coords1.x) * ratio,
            y: coords1.y + (coords2.y - coords1.y) * ratio
        };
    }

    static powerSet(arr) {
        const result = [];
        const n = arr.length;
        for (let i = 0; i < (1 << n); i++) {
            let subset = [];
            for (let j = 0; j < n; j++) {
                if (i & (1 << j)) subset.push(arr[j]);
            }
            result.push(subset);
        }
        return result;
    }
}

export default Utils;