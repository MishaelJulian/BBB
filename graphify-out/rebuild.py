"""Rebuild BBB graph from cache + AST, with fan-out import edges collapsed.

ponytail: post-process instead of patching site-packages graphify (survives upgrades).
Usage: python graphify-out/rebuild.py [labels.json]
labels.json = {"<anchor node label>": "<community name>"}; keyed by node, not community id (ids shift on recluster).
"""
import json, os, sys
from collections import Counter
from pathlib import Path
from graphify.detect import detect, save_manifest
from graphify.extract import collect_files, extract
from graphify.cache import check_semantic_cache
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html


def collapse_import_fanout(ex):
    """graphify adds `uses` INFERRED from EVERY node in an importing file to each imported name.
    Replace with one `imports` EXTRACTED edge: file node -> imported entity."""
    file_node = {n["source_file"]: n["id"] for n in ex["nodes"]
                 if n.get("source_file") and n.get("label") == os.path.basename(n["source_file"])}
    kept, seen = [], set()
    for e in ex["edges"]:
        if e.get("relation") == "uses" and e.get("confidence") == "INFERRED" and e.get("source_file") in file_node:
            key = (file_node[e["source_file"]], e["target"])
            if key in seen or key[0] == key[1]:
                continue
            seen.add(key)
            e = {**e, "source": key[0], "relation": "imports", "confidence": "EXTRACTED", "confidence_score": 1.0, "weight": 1.0}
        kept.append(e)
    return {**ex, "edges": kept}


def main():
    out = Path("graphify-out")
    de = detect(Path("."))
    for k in ("paper", "image", "video"):  # .graphifyignore covers most; belt and braces
        de["files"][k] = []
    code = [p for f in de["files"]["code"] for p in (collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])]
    ast = extract(code)
    cn, ce, ch, uncached = check_semantic_cache([f for fs in de["files"].values() for f in fs])
    if [u for u in uncached if u in de["files"]["document"]]:
        print("WARN uncached docs (run full /graphify for these):", [u for u in uncached if u in de["files"]["document"]])
    ids = {n["id"] for n in ast["nodes"]}
    nodes = ast["nodes"] + [n for n in cn if n["id"] not in ids and not ids.add(n["id"])]
    ex = collapse_import_fanout({"nodes": nodes, "edges": ast["edges"] + ce, "hyperedges": ch})

    G = build_from_json(ex)
    C = cluster(G)
    co = score_all(G, C)
    gods, sur = god_nodes(G), surprising_connections(G, C)
    manual = json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else {}
    labels = {}
    for c, ns in C.items():
        srcs = Counter(G.nodes[n].get("source_file") or "" for n in ns).most_common(1)
        auto = os.path.splitext(os.path.basename(srcs[0][0]))[0].replace("_", " ") if srcs and srcs[0][0] else f"Community {c}"
        names = {G.nodes[n].get("label") for n in ns}
        labels[c] = next((v for k, v in manual.items() if k in names), auto)
    q = suggest_questions(G, C, labels)
    (out / "GRAPH_REPORT.md").write_text(generate(G, C, co, labels, gods, sur, de, {"input": 0, "output": 0}, ".", suggested_questions=q))
    to_json(G, C, str(out / "graph.json"))
    to_html(G, C, str(out / "graph.html"), community_labels=labels)
    save_manifest(de["files"])
    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(C)} communities")
    for c, ns in sorted(C.items(), key=lambda x: -len(x[1]))[:25]:
        print(c, len(ns), round(co[c], 2), labels[c], "|", ", ".join(G.nodes[n].get("label", n) for n in ns[:6]))


if __name__ == "__main__":
    main()
