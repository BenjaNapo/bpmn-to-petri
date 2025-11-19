# BPMN to Petri Net Converter 🌐➡️📊

A lightweight, web-based framework for automatically translating **BPMN diagrams** into **Petri Nets**. This tool bridges the gap between intuitive process modeling and formal verification, enabling business analysts and researchers to validate workflows through an accessible and extensible platform.

## 🔍 Features

-   ✅ **Automated translation** from BPMN to Petri Nets
-   🎯 **Preserves semantic fidelity** and structural correctness
-   🔄 **Interactive interface** for visualization and export
-   🔧 **Advanced support** for:
    -   Inclusive (OR) gateways
    -   Timed tasks
    -   Transitions decorators
-   📤 Export to **PNML** and **DOT** formats
-   📦 Batch processing mode
-   📊 Multiple Petri net display layouts

## 🚀 Getting Started

1. Clone the repository:
    ```bash
    git clone https://github.com/BenjaNapo/bpmn-to-petri.git
    cd bpmn-to-petri
    ```
2. Open index.html in your browser to start using the application.

ℹ️ No server or installation required — the entire tool runs locally in your browser.

## 🛠️ Semantic Analysis

To perform a complete semantical analysis, you need to export the generated Petri Net: after the conversion, export the model as **.pnml** and open it in **WoPeD**. From there, use the _Export As_ option and select the **.tpn** format. Then open **Woflan**, load the exported .tpn file, and start the analysis. This workflow is recommended because WoPeD may freeze on large nets, while Woflan can reliably handle bigger models.

## 📄 License

This project is released under the MIT License.
