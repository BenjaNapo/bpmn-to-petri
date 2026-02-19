/**
 * BPMN → Petri Net Converter — Edge-Case Test Suite
 *
 * Loads each BPMN test file, converts it with the converter,
 * and runs structural assertions on the resulting Petri net.
 *
 * NOTE: PetriNet stores places, transitions, arcs as Map objects.
 *       Use .size instead of .length, and [...map.values()] to iterate.
 */

import Parser from "../src/bpmn2petri/parser.js";
import Converter from "../src/bpmn2petri/converter.js";
import { Place, Transition } from "../src/bpmn2petri/petrinet.js";

// ────────────────────────────────────────────────────
// Helpers to iterate Map-based PetriNet collections
// ────────────────────────────────────────────────────

function getPlaces(petri) {
    return [...petri.places.values()];
}

function getTransitions(petri) {
    return [...petri.transitions.values()];
}

function getArcs(petri) {
    return [...petri.arcs.values()];
}

function getAllNodes(petri) {
    return [...getPlaces(petri), ...getTransitions(petri)];
}

// ────────────────────────────────────────────────────
// Assertion helpers
// ────────────────────────────────────────────────────

function checkNoPlaceToPlaceArcs(petri) {
    const errors = [];
    getArcs(petri).forEach((arc) => {
        if (arc.source instanceof Place && arc.target instanceof Place)
            errors.push(
                `Place→Place arc: ${arc.source.id} → ${arc.target.id}`
            );
    });
    return errors;
}

function checkNoTransitionToTransitionArcs(petri) {
    const errors = [];
    getArcs(petri).forEach((arc) => {
        if (arc.source instanceof Transition && arc.target instanceof Transition)
            errors.push(
                `Transition→Transition arc: ${arc.source.id} → ${arc.target.id}`
            );
    });
    return errors;
}

function checkEveryTransitionHasInput(petri) {
    const errors = [];
    getTransitions(petri).forEach((t) => {
        if (t.inArcs.length === 0)
            errors.push(`Orphan transition (no inputs): ${t.id}`);
    });
    return errors;
}

function checkNodeDoesNotExist(petri, pattern, label) {
    const errors = [];
    getAllNodes(petri).forEach((n) => {
        if (n.id && n.id.match(pattern))
            errors.push(`${label}: unwanted node found: ${n.id}`);
    });
    return errors;
}

function checkNodeExists(petri, id) {
    const node = petri.getNode(id);
    return node ? [] : [`Expected node not found: ${id}`];
}

function checkConversionDoesNotThrow(xml) {
    try {
        const parser = new Parser(xml);
        const bpmn = parser.BPMN;
        const converter = new Converter(bpmn);
        converter.convert();
        return { petri: converter.petrinet, errors: [] };
    } catch (e) {
        return { petri: null, errors: [`Conversion threw: ${e.message}`] };
    }
}

function countPlaces(petri) {
    return petri.places.size;
}

function countTransitions(petri) {
    return petri.transitions.size;
}

function countArcs(petri) {
    return petri.arcs.size;
}

// ────────────────────────────────────────────────────
// Standard assertion bundle
// ────────────────────────────────────────────────────

function standardStructuralChecks(petri) {
    return [
        ...checkNoPlaceToPlaceArcs(petri),
        ...checkNoTransitionToTransitionArcs(petri),
    ];
}

// ────────────────────────────────────────────────────
// Test definitions
// ────────────────────────────────────────────────────

const tests = [
    // ── XOR ──
    {
        name: "1. XOR Split → Join (direct)",
        file: "xor/split_to_join_direct.bpmn",
        category: "XOR Gateways",
        description: "No duplicate intermediary nodes. No Place→Place arcs.",
        assertions(petri) {
            return [...standardStructuralChecks(petri)];
        },
    },
    {
        name: "2. XOR Mixed Gateway (2in, 2out)",
        file: "xor/xor_mixed.bpmn",
        category: "XOR Gateways",
        description:
            "Mixed gateway decomposes into join + mid-transition + split. No Place→Place.",
        assertions(petri) {
            return [
                ...standardStructuralChecks(petri),
                // XOR mixed creates nodes with suffixes: _j (join Place), _s (split Place), _mid (Transition)
                ...checkNodeExists(petri, "XOR_Mixed_j"),
                ...checkNodeExists(petri, "XOR_Mixed_s"),
                ...checkNodeExists(petri, "XOR_Mixed_mid"),
            ];
        },
    },
    {
        name: "3. Chained XOR Splits+Joins",
        file: "xor/chained_joins.bpmn",
        category: "XOR Gateways",
        description:
            "XOR-split₁ → join₁ → split₂ → join₂. All structurally valid.",
        assertions(petri) {
            return [...standardStructuralChecks(petri)];
        },
    },
    {
        name: "4. Event-Based Gateway + Messages",
        file: "xor/event_gw_messages.bpmn",
        category: "XOR Gateways",
        description:
            "Event-based gateway creates a Place; catch events race for the token.",
        assertions(petri) {
            const errors = [...standardStructuralChecks(petri)];
            // Event-based gateway creates a Place with its BPMN id
            const ebgNode = petri.getNode("EBG");
            if (!ebgNode)
                errors.push("Event-based gateway node (EBG) not found in Petri net");
            return errors;
        },
    },
    {
        name: "5. Deferred Join (reversed XML order)",
        file: "xor/deferred_join_place.bpmn",
        category: "XOR Gateways",
        description:
            "Join appears before split in XML. Tests deferred link resolution.",
        assertions(petri) {
            return [...standardStructuralChecks(petri)];
        },
    },

    // ── AND ──
    {
        name: "6. AND Split → Join",
        file: "and/and_split_join.bpmn",
        category: "AND Gateways",
        description:
            "AND-split produces tokens for both branches; AND-join synchronizes them.",
        assertions(petri) {
            const errors = [...standardStructuralChecks(petri)];
            // AND gateways use the BPMN id directly as their Petri net node id
            const splitNode = petri.getNode("AND_Split");
            const joinNode = petri.getNode("AND_Join");
            if (!splitNode) errors.push("AND_Split transition not found");
            if (!joinNode) errors.push("AND_Join transition not found");
            return errors;
        },
    },
    {
        name: "7. AND Mixed Gateway (2in, 2out)",
        file: "and/and_mixed.bpmn",
        category: "AND Gateways",
        description:
            "Mixed AND decomposes into join + mid-place + split. No Place→Place.",
        assertions(petri) {
            return [
                ...standardStructuralChecks(petri),
                // AND mixed creates nodes: _j (ANDJoin), _s (ANDSplit), _mid (Place)
                ...checkNodeExists(petri, "AND_Mixed_j"),
                ...checkNodeExists(petri, "AND_Mixed_s"),
                ...checkNodeExists(petri, "AND_Mixed_mid"),
            ];
        },
    },

    // ── OR ──
    {
        name: "8. OR Split → Join",
        file: "or/or_split_join.bpmn",
        category: "OR Gateways",
        description:
            "Inclusive gateway split + join with power set. No Place→Place arcs.",
        assertions(petri) {
            return [...standardStructuralChecks(petri)];
        },
    },

    // ── Messages ──
    {
        name: "9. Message Start Event",
        file: "messages/msg_start_event.bpmn",
        category: "Message Flows",
        description:
            "Message start event must NOT be wired to global start place.",
        assertions(petri) {
            const errors = [...standardStructuralChecks(petri)];
            // Find the MsgStart transition
            const msgStartNode = petri.getNode("MsgStart");
            if (msgStartNode) {
                msgStartNode.inArcs.forEach((arc) => {
                    const source = arc.source;
                    if (
                        source instanceof Place &&
                        source.id.startsWith("start_p_") &&
                        source.tokens > 0
                    ) {
                        errors.push(
                            `MsgStart is connected to start place ${source.id} with ${source.tokens} token(s) — message start should be independent`
                        );
                    }
                });
            }
            return errors;
        },
    },
    {
        name: "10. Message End Event",
        file: "messages/msg_end_event.bpmn",
        category: "Message Flows",
        description:
            "Message end event must NOT be wired to global end place.",
        assertions(petri) {
            const errors = [...standardStructuralChecks(petri)];
            // MsgEnd transition should not have an arc to end_p_*
            const msgEndNode = petri.getNode("MsgEnd");
            if (msgEndNode) {
                msgEndNode.outArcs.forEach((arc) => {
                    const target = arc.target;
                    if (
                        target instanceof Place &&
                        target.id.startsWith("end_p_")
                    ) {
                        errors.push(
                            `MsgEnd is connected to end place ${target.id} — message end should not couple termination with message production`
                        );
                    }
                });
            }
            return errors;
        },
    },
    {
        name: "11. Message in Loop",
        file: "messages/msg_loop.bpmn",
        category: "Message Flows",
        description:
            "Send task in a loop. Structural validity must hold, no Place→Place.",
        assertions(petri) {
            return [...standardStructuralChecks(petri)];
        },
    },

    // ── Start/End ──
    {
        name: "12. Multi-Pool (global start unification)",
        file: "start_end_cicle/repeat_multi_pool.bpmn",
        category: "Start/End Handling",
        description:
            "Two pools → unifyStartEnd creates global start/end transitions. Structural validity.",
        assertions(petri) {
            return [...standardStructuralChecks(petri)];
        },
    },

    // ── Interrupt ──
    {
        name: "13. Boundary Event in Loop",
        file: "interrupt/boundary_loop.bpmn",
        category: "Boundary Events",
        description:
            "Boundary event on task inside XOR loop. Structural validity; interrupt transition exists.",
        assertions(petri) {
            const errors = [...standardStructuralChecks(petri)];
            // Look for the boundary interrupt transition
            const intNode = petri.getNode("BndEvt_int");
            if (!intNode) {
                errors.push(
                    "Boundary interrupt transition (BndEvt_int) not found"
                );
            }
            return errors;
        },
    },

    // ── Limit cases ──
    {
        name: "14. No Start Event",
        file: "limit-cases/no_start_event.bpmn",
        category: "Limit Cases",
        description:
            "Process with only tasks (no start/end event). Must not crash, structural validity.",
        assertions(petri) {
            return [...standardStructuralChecks(petri)];
        },
    },
    {
        name: "15. Multiple Start Events",
        file: "limit-cases/multi_start.bpmn",
        category: "Limit Cases",
        description:
            "Two start events merging at XOR-join. Start place connects to both start transitions.",
        assertions(petri) {
            return [...standardStructuralChecks(petri)];
        },
    },
];

// ────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────

async function loadBPMN(file) {
    const response = await fetch(file);
    if (!response.ok)
        throw new Error(`Failed to load ${file}: ${response.status}`);
    const text = await response.text();
    const dp = new DOMParser();
    return dp.parseFromString(text, "text/xml");
}

async function runAllTests(onProgress) {
    const results = [];

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const result = {
            name: test.name,
            file: test.file,
            category: test.category,
            description: test.description,
            passed: false,
            errors: [],
            nodeCount: { places: 0, transitions: 0, arcs: 0 },
        };

        try {
            const xml = await loadBPMN(test.file);
            const { petri, errors } = checkConversionDoesNotThrow(xml);

            if (errors.length > 0) {
                result.errors = errors;
            } else {
                result.nodeCount = {
                    places: countPlaces(petri),
                    transitions: countTransitions(petri),
                    arcs: countArcs(petri),
                };
                result.errors = test.assertions(petri);
            }
        } catch (e) {
            result.errors = [`Exception: ${e.message}`];
        }

        result.passed = result.errors.length === 0;
        results.push(result);

        if (onProgress) onProgress(i + 1, tests.length, result);
    }

    return results;
}

export { runAllTests, tests };
