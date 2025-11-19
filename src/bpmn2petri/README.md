# bpmn2petri

A lightweight, zero-dependency JavaScript library for converting **BPMN diagrams** into **Petri Nets**.  
This package provides a structured pipeline composed of:

-   **Importer** → loads BPMN files or XML strings
-   **Parser** → parses BPMN XML into an internal representation
-   **Converter** → converts BPMN model into a Petri Net
-   **Exporter** → exports Petri Nets to PNML, DOT/Graphviz or per-pool files
-   **Config** → optional configuration flags

Perfect for both browser and Node.js usage.

---

## 📦 Installation

```bash
npm install bpmn2petri
```

---

## 🚀 Quick Start

```js
import { Importer, Parser, Converter, Exporter, Config } from "bpmn2petri";
```

---

# 🔁 BPMN → Petri Net conversion pipeline

## 1️⃣ Import BPMN (file or string)

### Load a `.bpmn` file

```js
const importer = new Importer();
await importer.import(file);
const xml = importer.XML;
const original = importer.bpmnOGContent;
```

### Import from a string

```js
const importer = new Importer();
await importer.importString(bpmnXmlString);
```

---

## 2️⃣ Parse BPMN XML

```js
const parser = new Parser(importer.XML);
const bpmnModel = parser.BPMN;
```

---

## 3️⃣ Convert to Petri Net

```js
const converter = new Converter(bpmnModel);
const petrinet = converter.convert();
```

The returned Petri Net object includes:

-   `places`
-   `transitions`
-   `flows`
-   `.draw(domElement, scale, nodeSize)` for browser rendering

---

## 4️⃣ Export results

### 🔹 Export as PNML

```js
const exporter = new Exporter(petrinet);

exporter.export();
const pnml = exporter.getResult();
```

### 🔹 Export Graphviz (DOT)

```js
exporter.exportGraphviz(Config.graphvizTextOutside);
const dot = exporter.getGraphviz();
```

### 🔹 Export per-pool PNML files

```js
exporter.exportAll();
const pools = exporter.getPools();
```

---

# 🛠 Configuration

```js
Config.withDecorators = true;
Config.timedTasks = false;
Config.withCollapsedXor = true;
Config.graphvizTextOutside = false;
Config.nodeSize = 40;
Config.scale = 1.0;
```

These affect:

-   rendering
-   decorators / timed tasks
-   node size
-   scaling
-   Graphviz text positioning

---

# 🖼 Rendering the Petri Net (browser)

```js
petrinet.draw(domElement, Config.scale, Config.nodeSize + 10);
```

---

# 📚 Full Example

```js
import { Importer, Parser, Converter, Exporter, Config } from "bpmn2petri";

async function convertBPMNFile(file) {
    const importer = new Importer();
    await importer.import(file);

    const parser = new Parser(importer.XML);
    const converter = new Converter(parser.BPMN);

    const petrinet = converter.convert();

    const exporter = new Exporter(petrinet);
    exporter.export();

    return exporter.getResult();
}
```

---

# 🧩 Notes

-   Zero dependencies
-   Works in browser and Node.js
-   Supports PNML export, Graphviz export, pools export

---

# 📄 License

MIT
